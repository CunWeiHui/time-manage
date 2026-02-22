const cloud = require('wx-server-sdk')
const axios = require('axios')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

// BiteFu API 配置
const BITEFU_API = 'https://tool.bitefu.net/jiari/'

/**
 * 计算需要同步的月份
 * 每次同步本月和另外一个月（由当前日期%12计算）
 */
function getMonthsToSync() {
  const today = new Date()
  const currentMonth = today.getMonth() + 1
  const currentDate = today.getDate()
  const otherMonth = (currentDate % 12) || 12

  // 使用 Set 去重
  return [...new Set([currentMonth, otherMonth])]
}

/**
 * 调用 BiteFu API 获取节假日数据
 * 返回格式示例:
 * {
 *   "2026-01-01": {
 *     "date": "2026-01-01",
 *     "info": "元旦",
 *     "isHoliday": true,
 *     "status": 2
 *   },
 *   ...
 * }
 */
async function fetchHolidaysFromAPI() {
  try {
    const year = new Date().getFullYear()
    const monthsToSync = getMonthsToSync()
    const allHolidays = []

    console.log(`本次同步月份: ${monthsToSync.join(', ')}`)

    for (const month of monthsToSync) {
      const monthStr = String(month).padStart(2, '0')
      const response = await axios.get(BITEFU_API, {
        params: {
          d: `${year}${monthStr}`,
          back: 'json',
          info: 1
        },
        timeout: 10000
      })

      console.log(`${year}年${month}月 API 响应:`, JSON.stringify(response.data))

      if (response.data) {
        // API 返回格式: {"202612": {"1201": {...}, "1202": {...}, ...}}
        // 需要提取嵌套的日期数据
        const monthKey = `${year}${monthStr}`
        const monthData = response.data[monthKey]

        if (monthData && typeof monthData === 'object') {
          const monthHolidays = Object.values(monthData).map(item => {
            // item.day 格式: "20261201"，需要转换为 "2026-12-01"
            const dayStr = item.day
            const formattedDate = `${dayStr.substring(0, 4)}-${dayStr.substring(4, 6)}-${dayStr.substring(6, 8)}`

            return {
              date: formattedDate,
              name: '', // BiteFu API 的节假日信息在其他字段，需要进一步处理
              status: item.status || 0, // 0: 工作日, 1: 假日
              isHoliday: item.type === 1 // type: 0=工作日, 1=假日
            }
          })
          allHolidays.push(...monthHolidays)
        }
      }
    }

    return allHolidays
  } catch (error) {
    console.error('调用 BiteFu API 失败:', error)
    throw error
  }
}

/**
 * 将 API 数据转换为数据库格式
 */
function transformHolidayData(apiData) {
  return apiData.map(item => ({
    date: item.date,
    year: parseInt(item.date.substring(0, 4)),
    month: parseInt(item.date.substring(5, 7)),
    name: item.name || '',
    status: item.status || 0, // 0: 工作日, 1: 休息日, 2: 法定假日
    type: item.status === 2 ? 'legal' : (item.status === 1 ? 'rest' : 'work'),
    isHoliday: item.isHoliday || false,
    updatedAt: new Date().getTime()
  }))
}

/**
 * 批量更新节假日数据
 */
async function syncHolidaysToDB(holidays) {
  const batchSize = 100
  const errors = []

  for (let i = 0; i < holidays.length; i += batchSize) {
    const batch = holidays.slice(i, i + batchSize)

    for (const holiday of batch) {
      try {
        // 先查询该日期是否已存在
        const { data } = await db.collection('holidays').where({
          date: holiday.date
        }).get()

        if (data.length > 0) {
          // 更新现有记录
          await db.collection('holidays').doc(data[0]._id).update({
            data: {
              name: holiday.name,
              status: holiday.status,
              type: holiday.type,
              updatedAt: holiday.updatedAt
            }
          })
        } else {
          // 插入新记录
          await db.collection('holidays').add({
            data: holiday
          })
        }
      } catch (error) {
        console.error(`同步日期 ${holiday.date} 失败:`, error)
        errors.push({ date: holiday.date, error: error.message })
      }
    }
  }

  return errors
}

exports.main = async (event, context) => {
  console.log('开始同步节假日数据...')

  try {
    // 1. 从 API 获取数据
    const apiData = await fetchHolidaysFromAPI()
    console.log(`从 API 获取到 ${apiData.length} 条节假日数据`)

    if (apiData.length === 0) {
      return {
        success: false,
        message: '未获取到节假日数据'
      }
    }

    // 2. 转换数据格式
    const holidays = transformHolidayData(apiData)

    // 3. 同步到数据库
    const errors = await syncHolidaysToDB(holidays)

    // 4. 返回结果
    return {
      success: true,
      message: `同步完成，共处理 ${holidays.length} 条数据，失败 ${errors.length} 条`,
      data: {
        total: holidays.length,
        success: holidays.length - errors.length,
        errors: errors.length
      }
    }
  } catch (error) {
    console.error('同步节假日数据失败:', error)
    return {
      success: false,
      message: error.message || '同步失败'
    }
  }
}
