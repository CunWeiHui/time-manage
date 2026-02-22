// 云函数入口文件
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

/**
 * 消息提醒云函数
 * 支持操作：sendReminder, subscribe, getTemplateId, checkReminders
 */
exports.main = async (event, context) => {
  const { action, data } = event;
  const { OPENID } = cloud.getWXContext();

  try {
    switch (action) {
      case 'sendReminder':
        return await sendReminder(data);
      case 'subscribe':
        return await subscribeMessage(data, OPENID);
      case 'getTemplateId':
        return await getTemplateId();
      case 'checkReminders':
        return await checkReminders();
      case 'batchSend':
        return await batchSendReminders();
      default:
        return {
          success: false,
          message: '未知的操作类型'
        };
    }
  } catch (error) {
    console.error('提醒云函数执行错误:', error);
    return {
      success: false,
      message: error.message,
      error
    };
  }
};

/**
 * 发送提醒消息
 */
async function sendReminder(data) {
  const { bookingId, templateId, openid } = data;

  if (!bookingId || !templateId || !openid) {
    return {
      success: false,
      message: '参数不完整'
    };
  }

  // 获取预约信息
  const bookingResult = await db.collection('bookings').doc(bookingId).get();
  if (!bookingResult.data) {
    return {
      success: false,
      message: '预约不存在'
    };
  }

  const booking = bookingResult.data;

  // 构建发送时间
  const bookingDateTime = new Date(`${booking.date} ${booking.startTime}`);
  const sendTime = new Date(bookingDateTime.getTime() - booking.reminderTime * 60 * 1000);

  // 发送订阅消息
  try {
    const result = await cloud.openapi.subscribeMessage.send({
      touser: openid,
      templateId: templateId,
      page: `pages/booking/detail?id=${bookingId}`,
      data: {
        thing1: {
          value: booking.studentName
        },
        time2: {
          value: `${booking.date} ${booking.startTime}`
        },
        time3: {
          value: `${booking.date} ${booking.startTime}`
        },
        thing4: {
          value: booking.courseContent
        }
      },
      miniprogramState: 'formal'
    });

    // 更新预约提醒状态
    await db.collection('bookings').doc(bookingId).update({
      data: {
        reminderSent: true,
        reminderSendTime: new Date()
      }
    });

    // 创建消息记录
    await db.collection('messages').add({
      data: {
        type: 'booking_reminder',
        icon: '⏰',
        title: '预约提醒',
        content: `您与${booking.studentName}的预约将在${booking.reminderTime}分钟后开始`,
        bookingId: booking._id,
        studentId: booking.studentId,
        openid: openid,
        read: false,
        createTime: new Date()
      }
    });

    return {
      success: true,
      message: '提醒发送成功',
      data: result
    };
  } catch (error) {
    console.error('发送订阅消息失败:', error);
    return {
      success: false,
      message: '发送提醒失败',
      error
    };
  }
}

/**
 * 订阅消息模板
 */
async function subscribeMessage(data, openid) {
  const { templateId } = data;

  if (!templateId) {
    return {
      success: false,
      message: '模板ID不能为空'
    };
  }

  // 保存订阅记录
  await db.collection('subscriptions').add({
    data: {
      templateId,
      openid,
      createTime: new Date(),
      updateTime: new Date()
    }
  });

  return {
    success: true,
    message: '订阅成功'
  };
}

/**
 * 获取消息模板ID
 */
async function getTemplateId() {
  // 这里需要替换为你的消息模板ID
  // 消息模板需要在微信公众平台配置
  const templateId = 'your-template-id-here';

  return {
    success: true,
    data: {
      templateId
    }
  };
}

/**
 * 检查需要发送的提醒
 */
async function checkReminders() {
  const now = new Date();
  const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);

  // 查找未来1小时内需要发送提醒的预约
  const result = await db.collection('bookings')
    .where({
      status: _.in(['pending', 'confirmed']),
      sendReminder: true,
      reminderSent: false,
      date: _.gte(formatDate(now)).and(_.lte(formatDate(oneHourLater)))
    })
    .get();

  const reminders = [];
  for (const booking of result.data) {
    const bookingDateTime = new Date(`${booking.date} ${booking.startTime}`);
    const reminderTime = new Date(bookingDateTime.getTime() - booking.reminderTime * 60 * 1000);

    // 检查是否到达提醒时间
    if (reminderTime <= now && reminderTime > new Date(now.getTime() - 5 * 60 * 1000)) {
      reminders.push({
        bookingId: booking._id,
        studentName: booking.studentName,
        bookingTime: `${booking.date} ${booking.startTime}`,
        reminderMinutes: booking.reminderTime
      });
    }
  }

  return {
    success: true,
    data: {
      reminders,
      count: reminders.length
    }
  };
}

/**
 * 批量发送提醒消息
 */
async function batchSendReminders() {
  const now = new Date();

  // 获取所有需要发送提醒的预约
  const bookings = await db.collection('bookings')
    .where({
      status: _.in(['pending', 'confirmed']),
      sendReminder: true,
      reminderSent: false
    })
    .get();

  const results = [];
  for (const booking of bookings.data) {
    const bookingDateTime = new Date(`${booking.date} ${booking.startTime}`);
    const reminderTime = new Date(bookingDateTime.getTime() - booking.reminderTime * 60 * 1000);

    // 检查是否到达提醒时间（前后5分钟内）
    const timeDiff = Math.abs(now.getTime() - reminderTime.getTime());
    if (timeDiff <= 5 * 60 * 1000) {
      // 这里需要获取模板ID和openid
      // 实际使用时需要替换为真实的模板ID
      const templateId = 'your-template-id-here';

      try {
        const result = await sendReminder({
          bookingId: booking._id,
          templateId: templateId,
          openid: booking.openid
        });

        results.push({
          bookingId: booking._id,
          success: result.success,
          message: result.message
        });
      } catch (error) {
        results.push({
          bookingId: booking._id,
          success: false,
          message: error.message
        });
      }
    }
  }

  return {
    success: true,
    message: `批量提醒完成，成功 ${results.filter(r => r.success).length} 条`,
    data: {
      results,
      total: results.length,
      successCount: results.filter(r => r.success).length,
      failCount: results.filter(r => !r.success).length
    }
  };
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
