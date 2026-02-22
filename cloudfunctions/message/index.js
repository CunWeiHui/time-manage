// 云函数入口文件
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

/**
 * 消息管理云函数
 * 支持操作：create, list, get, markRead, markAllRead, delete, getUnreadCount
 */
exports.main = async (event, context) => {
  const { action, data } = event;
  const { OPENID } = cloud.getWXContext();

  try {
    switch (action) {
      case 'create':
        return await createMessage(data);
      case 'list':
        return await listMessages(data);
      case 'get':
        return await getMessage(data);
      case 'markRead':
        return await markAsRead(data);
      case 'markAllRead':
        return await markAllAsRead(data);
      case 'delete':
        return await deleteMessage(data);
      case 'getUnreadCount':
        return await getUnreadCount(data);
      default:
        return {
          success: false,
          message: '未知的操作类型'
        };
    }
  } catch (error) {
    console.error('消息云函数执行错误:', error);
    return {
      success: false,
      message: error.message,
      error
    };
  }
};

/**
 * 创建消息
 */
async function createMessage(data) {
  const { type, title, content, bookingId, studentId, openid } = data;

  if (!type || !title || !content) {
    return {
      success: false,
      message: '消息类型、标题和内容不能为空'
    };
  }

  // 根据类型设置图标
  const iconMap = {
    'booking_created': '📅',
    'booking_confirmed': '✅',
    'booking_cancelled': '❌',
    'booking_reminder': '⏰',
    'student_added': '👤',
    'system': '📧'
  };

  const messageData = {
    type,
    icon: iconMap[type] || '📧',
    title,
    content,
    bookingId: bookingId || null,
    studentId: studentId || null,
    openid: openid || null,
    read: false,
    createTime: new Date()
  };

  const result = await db.collection('messages').add({
    data: messageData
  });

  return {
    success: true,
    message: '消息创建成功',
    data: {
      _id: result._id,
      ...messageData
    }
  };
}

/**
 * 获取消息列表
 */
async function listMessages(data) {
  const { page = 1, pageSize = 20, type, unreadOnly } = data || {};

  let query = db.collection('messages');

  // 构建查询条件
  const where = {};
  if (type) {
    where.type = type;
  }
  if (unreadOnly) {
    where.read = false;
  }

  if (Object.keys(where).length > 0) {
    query = query.where(where);
  }

  // 分页查询
  const skip = (page - 1) * pageSize;
  const result = await query
    .orderBy('createTime', 'desc')
    .skip(skip)
    .limit(pageSize)
    .get();

  // 获取总数
  const countResult = await query.count();

  // 格式化消息时间
  const list = result.data.map(msg => ({
    ...msg,
    time: formatRelativeTime(msg.createTime)
  }));

  return {
    success: true,
    data: {
      list,
      total: countResult.total,
      page,
      pageSize
    }
  };
}

/**
 * 获取消息详情
 */
async function getMessage(data) {
  const { id } = data;

  if (!id) {
    return {
      success: false,
      message: '消息ID不能为空'
    };
  }

  const result = await db.collection('messages').doc(id).get();

  if (!result.data) {
    return {
      success: false,
      message: '消息不存在'
    };
  }

  return {
    success: true,
    data: result.data
  };
}

/**
 * 标记为已读
 */
async function markAsRead(data) {
  const { id } = data;

  if (!id) {
    return {
      success: false,
      message: '消息ID不能为空'
    };
  }

  await db.collection('messages').doc(id).update({
    data: {
      read: true
    }
  });

  return {
    success: true,
    message: '已标记为已读'
  };
}

/**
 * 标记所有为已读
 */
async function markAllAsRead() {
  const result = await db.collection('messages')
    .where({ read: false })
    .update({
      data: { read: true }
    });

  return {
    success: true,
    message: '已全部标记为已读',
    data: {
      count: result.stats.updated
    }
  };
}

/**
 * 删除消息
 */
async function deleteMessage(data) {
  const { id } = data;

  if (!id) {
    return {
      success: false,
      message: '消息ID不能为空'
    };
  }

  await db.collection('messages').doc(id).remove();

  return {
    success: true,
    message: '消息删除成功'
  };
}

/**
 * 获取未读消息数量
 */
async function getUnreadCount() {
  const result = await db.collection('messages')
    .where({ read: false })
    .count();

  return {
    success: true,
    data: {
      count: result.total
    }
  };
}

/**
 * 格式化相对时间
 */
function formatRelativeTime(date) {
  const now = new Date();
  const msgDate = new Date(date);
  const diff = now.getTime() - msgDate.getTime();

  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diff < minute) {
    return '刚刚';
  } else if (diff < hour) {
    return `${Math.floor(diff / minute)}分钟前`;
  } else if (diff < day) {
    return `${Math.floor(diff / hour)}小时前`;
  } else if (diff < day * 2) {
    return '昨天';
  } else {
    return formatDate(msgDate);
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
