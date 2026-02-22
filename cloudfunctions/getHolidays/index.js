const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const { year, month } = event

  if (!year || !month) {
    return {
      success: false,
      message: '参数不完整，需要 year 和 month'
    }
  }

  try {
    // 查询指定年月的节假日数据
    const { data } = await db.collection('holidays').where({
      year: year,
      month: month
    }).orderBy('date', 'asc').get()

    // 转换为日期键值对格式，方便前端使用
    const holidaysMap = {}
    data.forEach(item => {
      holidaysMap[item.date] = {
        name: item.name,
        status: item.status,
        type: item.type
      }
    })

    return {
      success: true,
      data: {
        list: data,
        map: holidaysMap
      }
    }
  } catch (error) {
    console.error('查询节假日数据失败:', error)
    return {
      success: false,
      message: error.message || '查询失败'
    }
  }
}
