// 云函数入口文件
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

/**
 * 初始化数据库集合
 * 创建：students、bookings、messages 三个集合
 */
exports.main = async (event, context) => {
  const { action } = event;

  try {
    switch (action) {
      case 'initCollections':
        return await initCollections();
      case 'initData':
        return await initData();
      case 'reset':
        return await resetDatabase();
      default:
        return {
          success: false,
          message: '未知的操作类型'
        };
    }
  } catch (error) {
    console.error('云函数执行错误:', error);
    return {
      success: false,
      message: error.message,
      error
    };
  }
};

/**
 * 初始化集合结构（创建索引）
 */
async function initCollections() {
  try {
    // students 集合索引
    await db.collection('students').add({
      data: {
        _temp: true
      }
    }).then(() => {
      return db.collection('students').doc().remove();
    }).catch(() => {});

    // bookings 集合索引
    await db.collection('bookings').add({
      data: {
        _temp: true
      }
    }).then(() => {
      return db.collection('bookings').doc().remove();
    }).catch(() => {});

    // messages 集合索引
    await db.collection('messages').add({
      data: {
        _temp: true
      }
    }).then(() => {
      return db.collection('messages').doc().remove();
    }).catch(() => {});

    return {
      success: true,
      message: '数据库集合初始化完成'
    };
  } catch (error) {
    return {
      success: false,
      message: '数据库集合初始化失败',
      error
    };
  }
}

/**
 * 初始化示例数据
 */
async function initData() {
  try {
    // 示例人员数据
    const studentsData = [
      {
        name: '张三',
        phone: '13800138001',
        wechat: 'zhangsan001',
        remark: '英语基础较好，重点练习口语',
        createTime: new Date(),
        updateTime: new Date()
      },
      {
        name: '李四',
        phone: '13800138002',
        wechat: 'lisi002',
        remark: '零基础，需要从基础词汇开始',
        createTime: new Date(),
        updateTime: new Date()
      },
      {
        name: '王五',
        phone: '13800138003',
        wechat: 'wangwu003',
        remark: '有法语基础，学习英语作为第二外语',
        createTime: new Date(),
        updateTime: new Date()
      }
    ];

    // 创建示例人员
    const studentResults = await Promise.all(
      studentsData.map(student => db.collection('students').add({ data: student }))
    );

    // 示例预约数据
    const bookingsData = [
      {
        studentId: studentResults[0]._id,
        studentName: '张三',
        date: formatDate(new Date(Date.now() + 86400000)),
        startTime: '09:00',
        endTime: '10:30',
        courseContent: '英语口语练习',
        remark: '重点练习日常对话',
        status: 'confirmed',
        sendReminder: true,
        reminderTime: 30,
        reminderSent: false,
        createTime: new Date(),
        updateTime: new Date()
      },
      {
        studentId: studentResults[1]._id,
        studentName: '李四',
        date: formatDate(new Date(Date.now() + 86400000)),
        startTime: '14:00',
        endTime: '15:30',
        courseContent: '英语基础词汇',
        remark: '学习日常用品词汇',
        status: 'pending',
        sendReminder: true,
        reminderTime: 30,
        reminderSent: false,
        createTime: new Date(),
        updateTime: new Date()
      }
    ];

    // 创建示例预约
    await Promise.all(
      bookingsData.map(booking => db.collection('bookings').add({ data: booking }))
    );

    return {
      success: true,
      message: '示例数据初始化完成',
      data: {
        studentsCount: studentResults.length,
        bookingsCount: bookingsData.length
      }
    };
  } catch (error) {
    return {
      success: false,
      message: '示例数据初始化失败',
      error
    };
  }
}

/**
 * 重置数据库（清空所有数据）
 */
async function resetDatabase() {
  try {
    // 获取所有数据
    const [students, bookings, messages] = await Promise.all([
      db.collection('students').get(),
      db.collection('bookings').get(),
      db.collection('messages').get()
    ]);

    // 删除所有数据
    await Promise.all([
      ...students.data.map(item => db.collection('students').doc(item._id).remove()),
      ...bookings.data.map(item => db.collection('bookings').doc(item._id).remove()),
      ...messages.data.map(item => db.collection('messages').doc(item._id).remove())
    ]);

    return {
      success: true,
      message: '数据库重置完成',
      data: {
        deletedStudents: students.data.length,
        deletedBookings: bookings.data.length,
        deletedMessages: messages.data.length
      }
    };
  } catch (error) {
    return {
      success: false,
      message: '数据库重置失败',
      error
    };
  }
}

/**
 * 格式化日期
 */
function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
