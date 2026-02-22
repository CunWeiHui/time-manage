// 云函数入口文件
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

/**
 * 预约管理云函数
 * 支持操作：create, update, delete, get, list, checkConflict
 */
exports.main = async (event, context) => {
  const { action, data } = event;
  const { OPENID } = cloud.getWXContext();

  try {
    switch (action) {
      case 'create':
        return await createBooking(data, OPENID);
      case 'update':
        return await updateBooking(data, OPENID);
      case 'delete':
        return await deleteBooking(data, OPENID);
      case 'get':
        return await getBooking(data);
      case 'list':
        return await listBookings(data);
      case 'checkConflict':
        return await checkTimeConflict(data);
      case 'confirm':
        return await confirmBooking(data, OPENID);
      case 'complete':
        return await completeBooking(data, OPENID);
      case 'cancel':
        return await cancelBooking(data, OPENID);
      default:
        return {
          success: false,
          message: '未知的操作类型'
        };
    }
  } catch (error) {
    console.error('预约云函数执行错误:', error);
    return {
      success: false,
      message: error.message,
      error
    };
  }
};

/**
 * 创建预约
 */
async function createBooking(data, openid) {
  const { studentId, date, startTime, endTime, courseContent, remark, sendReminder, reminderTime } = data;

  // 验证必填字段
  if (!studentId || !date || !startTime || !endTime || !courseContent) {
    return {
      success: false,
      message: '请填写完整的预约信息'
    };
  }

  // 获取人员信息
  const studentResult = await db.collection('students').doc(studentId).get();
  if (!studentResult.data) {
    return {
      success: false,
      message: '人员不存在'
    };
  }

  const studentName = studentResult.data.name;

  // 检查时间冲突
  const conflictResult = await checkTimeConflict({ date, startTime, endTime });
  if (!conflictResult.success) {
    return conflictResult;
  }

  if (conflictResult.data.hasConflict) {
    return {
      success: false,
      message: '该时间段已有预约，请选择其他时间'
    };
  }

  // 创建预约
  const bookingData = {
    studentId,
    studentName,
    date,
    startTime,
    endTime,
    courseContent,
    remark: remark || '',
    status: 'pending',
    sendReminder: sendReminder !== false,
    reminderTime: reminderTime || 30,
    reminderSent: false,
    openid,
    createTime: new Date(),
    updateTime: new Date()
  };

  const result = await db.collection('bookings').add({
    data: bookingData
  });

  // 创建消息通知
  await createMessage({
    type: 'booking_created',
    title: '预约创建',
    content: `预约已创建：${date} ${startTime}-${endTime} ${studentName}`,
    bookingId: result._id,
    studentId,
    openid
  });

  return {
    success: true,
    message: '预约创建成功',
    data: {
      _id: result._id,
      ...bookingData
    }
  };
}

/**
 * 更新预约
 */
async function updateBooking(data, openid) {
  const { id, ...updateData } = data;

  if (!id) {
    return {
      success: false,
      message: '预约ID不能为空'
    };
  }

  // 获取原预约
  const oldBooking = await db.collection('bookings').doc(id).get();
  if (!oldBooking.data) {
    return {
      success: false,
      message: '预约不存在'
    };
  }

  // 如果修改了时间，检查冲突
  if (updateData.date || updateData.startTime || updateData.endTime) {
    const date = updateData.date || oldBooking.data.date;
    const startTime = updateData.startTime || oldBooking.data.startTime;
    const endTime = updateData.endTime || oldBooking.data.endTime;

    const conflictResult = await checkTimeConflict({ date, startTime, endTime, excludeId: id });
    if (conflictResult.data.hasConflict) {
      return {
        success: false,
        message: '该时间段已有预约，请选择其他时间'
      };
    }
  }

  // 如果修改了人员，更新人员姓名
  if (updateData.studentId) {
    const studentResult = await db.collection('students').doc(updateData.studentId).get();
    if (studentResult.data) {
      updateData.studentName = studentResult.data.name;
    }
  }

  // 更新预约
  await db.collection('bookings').doc(id).update({
    data: {
      ...updateData,
      updateTime: new Date()
    }
  });

  return {
    success: true,
    message: '预约更新成功'
  };
}

/**
 * 删除预约
 */
async function deleteBooking(data, openid) {
  const { id } = data;

  if (!id) {
    return {
      success: false,
      message: '预约ID不能为空'
    };
  }

  // 获取预约信息
  const booking = await db.collection('bookings').doc(id).get();
  if (!booking.data) {
    return {
      success: false,
      message: '预约不存在'
    };
  }

  // 删除预约
  await db.collection('bookings').doc(id).remove();

  // 创建消息通知
  await createMessage({
    type: 'booking_cancelled',
    title: '预约已取消',
    content: `预约已取消：${booking.data.date} ${booking.data.startTime}-${booking.data.endTime} ${booking.data.studentName}`,
    bookingId: id,
    studentId: booking.data.studentId,
    openid
  });

  return {
    success: true,
    message: '预约删除成功'
  };
}

/**
 * 获取预约详情
 */
async function getBooking(data) {
  const { id } = data;

  if (!id) {
    return {
      success: false,
      message: '预约ID不能为空'
    };
  }

  const result = await db.collection('bookings').doc(id).get();

  if (!result.data) {
    return {
      success: false,
      message: '预约不存在'
    };
  }

  return {
    success: true,
    data: result.data
  };
}

/**
 * 获取预约列表
 */
async function listBookings(data) {
  const { date, studentId, status, startDate, endDate, page = 1, pageSize = 20 } = data;

  let query = db.collection('bookings');

  // 构建查询条件
  const where = {};
  if (date) {
    where.date = date;
  }
  if (studentId) {
    where.studentId = studentId;
  }
  if (status) {
    where.status = status;
  }
  if (startDate && endDate) {
    where.date = _.gte(startDate).and(_.lte(endDate));
  }

  if (Object.keys(where).length > 0) {
    query = query.where(where);
  }

  // 分页查询
  const skip = (page - 1) * pageSize;
  const result = await query
    .orderBy('date', 'asc')
    .orderBy('startTime', 'asc')
    .skip(skip)
    .limit(pageSize)
    .get();

  // 获取总数
  const countResult = await query.count();

  return {
    success: true,
    data: {
      list: result.data,
      total: countResult.total,
      page,
      pageSize
    }
  };
}

/**
 * 检查时间冲突
 */
async function checkTimeConflict(data) {
  const { date, startTime, endTime, excludeId } = data;

  if (!date || !startTime || !endTime) {
    return {
      success: false,
      message: '时间参数不完整'
    };
  }

  // 获取当天的所有有效预约
  const where = {
    date: date,
    status: _.in(['pending', 'confirmed'])
  };

  if (excludeId) {
    where._id = _.neq(excludeId);
  }

  const result = await db.collection('bookings')
    .where(where)
    .get();

  // 检查时间冲突
  const hasConflict = result.data.some(booking => {
    // 时间区间重叠判断：(start1 < end2) && (start2 < end1)
    return (startTime < booking.endTime && endTime > booking.startTime);
  });

  return {
    success: true,
    data: {
      hasConflict,
      conflictBookings: hasConflict ? result.data.filter(booking =>
        (startTime < booking.endTime && endTime > booking.startTime)
      ) : []
    }
  };
}

/**
 * 确认预约
 */
async function confirmBooking(data, openid) {
  const { id } = data;

  if (!id) {
    return {
      success: false,
      message: '预约ID不能为空'
    };
  }

  await db.collection('bookings').doc(id).update({
    data: {
      status: 'confirmed',
      updateTime: new Date()
    }
  });

  return {
    success: true,
    message: '预约已确认'
  };
}

/**
 * 完成预约
 */
async function completeBooking(data, openid) {
  const { id } = data;

  if (!id) {
    return {
      success: false,
      message: '预约ID不能为空'
    };
  }

  await db.collection('bookings').doc(id).update({
    data: {
      status: 'completed',
      updateTime: new Date()
    }
  });

  return {
    success: true,
    message: '课程已完成'
  };
}

/**
 * 取消预约
 */
async function cancelBooking(data, openid) {
  const { id } = data;

  if (!id) {
    return {
      success: false,
      message: '预约ID不能为空'
    };
  }

  await db.collection('bookings').doc(id).update({
    data: {
      status: 'cancelled',
      updateTime: new Date()
    }
  });

  return {
    success: true,
    message: '预约已取消'
  };
}

/**
 * 创建消息
 */
async function createMessage(data) {
  await db.collection('messages').add({
    data: {
      ...data,
      read: false,
      createTime: new Date()
    }
  });
}
