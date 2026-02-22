// 云函数入口文件
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

/**
 * 人员管理云函数
 * 支持操作：create, update, delete, get, list, search
 */
exports.main = async (event, context) => {
  const { action, data } = event;
  const { OPENID } = cloud.getWXContext();

  try {
    switch (action) {
      case 'create':
        return await createStudent(data, OPENID);
      case 'update':
        return await updateStudent(data, OPENID);
      case 'delete':
        return await deleteStudent(data, OPENID);
      case 'get':
        return await getStudent(data);
      case 'list':
        return await listStudents(data);
      case 'search':
        return await searchStudents(data);
      case 'getStats':
        return await getStudentStats(data);
      default:
        return {
          success: false,
          message: '未知的操作类型'
        };
    }
  } catch (error) {
    console.error('人员云函数执行错误:', error);
    return {
      success: false,
      message: error.message,
      error
    };
  }
};

/**
 * 创建人员
 */
async function createStudent(data, openid) {
  const { name, phone, wechat, remark } = data;

  // 验证必填字段
  if (!name || !phone) {
    return {
      success: false,
      message: '姓名和手机号不能为空'
    };
  }

  // 验证手机号
  const phoneReg = /^1[3-9]\d{9}$/;
  if (!phoneReg.test(phone)) {
    return {
      success: false,
      message: '手机号格式不正确'
    };
  }

  // 检查手机号是否已存在
  const existingResult = await db.collection('students')
    .where({ phone })
    .get();

  if (existingResult.data.length > 0) {
    return {
      success: false,
      message: '该手机号已存在'
    };
  }

  // 创建人员
  const studentData = {
    name,
    phone,
    wechat: wechat || '',
    remark: remark || '',
    openid,
    createTime: new Date(),
    updateTime: new Date()
  };

  const result = await db.collection('students').add({
    data: studentData
  });

  return {
    success: true,
    message: '人员添加成功',
    data: {
      _id: result._id,
      ...studentData
    }
  };
}

/**
 * 更新人员
 */
async function updateStudent(data, openid) {
  const { id, name, phone, wechat, remark } = data;

  if (!id) {
    return {
      success: false,
      message: '人员ID不能为空'
    };
  }

  // 如果修改手机号，检查是否已存在
  if (phone) {
    const phoneReg = /^1[3-9]\d{9}$/;
    if (!phoneReg.test(phone)) {
      return {
        success: false,
        message: '手机号格式不正确'
      };
    }

    const existingResult = await db.collection('students')
      .where({
        phone,
        _id: _.neq(id)
      })
      .get();

    if (existingResult.data.length > 0) {
      return {
        success: false,
        message: '该手机号已被其他人员使用'
      };
    }
  }

  // 构建更新数据
  const updateData = {};
  if (name !== undefined) updateData.name = name;
  if (phone !== undefined) updateData.phone = phone;
  if (wechat !== undefined) updateData.wechat = wechat;
  if (remark !== undefined) updateData.remark = remark;
  updateData.updateTime = new Date();

  // 更新人员
  await db.collection('students').doc(id).update({
    data: updateData
  });

  return {
    success: true,
    message: '人员信息更新成功'
  };
}

/**
 * 删除人员
 */
async function deleteStudent(data, openid) {
  const { id } = data;

  if (!id) {
    return {
      success: false,
      message: '人员ID不能为空'
    };
  }

  // 检查是否有预约记录
  const bookingsResult = await db.collection('bookings')
    .where({ studentId: id })
    .get();

  if (bookingsResult.data.length > 0) {
    return {
      success: false,
      message: `该人员有 ${bookingsResult.data.length} 条预约记录，无法删除`
    };
  }

  // 删除人员
  await db.collection('students').doc(id).remove();

  return {
    success: true,
    message: '人员删除成功'
  };
}

/**
 * 获取人员详情
 */
async function getStudent(data) {
  const { id } = data;

  if (!id) {
    return {
      success: false,
      message: '人员ID不能为空'
    };
  }

  const result = await db.collection('students').doc(id).get();

  if (!result.data) {
    return {
      success: false,
      message: '人员不存在'
    };
  }

  // 获取人员的预约统计
  const [bookingsResult, lastClassResult] = await Promise.all([
    db.collection('bookings')
      .where({ studentId: id })
      .get(),
    db.collection('bookings')
      .where({ studentId: id, status: _.in(['confirmed', 'completed']) })
      .orderBy('date', 'desc')
      .limit(1)
      .get()
  ]);

  const bookings = bookingsResult.data;
  const completedCount = bookings.filter(b => b.status === 'completed').length;
  const pendingCount = bookings.filter(b => b.status === 'pending' || b.status === 'confirmed').length;
  const cancelledCount = bookings.filter(b => b.status === 'cancelled').length;

  return {
    success: true,
    data: {
      ...result.data,
      completedCount,
      pendingCount,
      cancelledCount,
      lastClass: lastClassResult.data.length > 0 ? lastClassResult.data[0].date : null
    }
  };
}

/**
 * 获取人员列表
 */
async function listStudents(data) {
  const { keyword, page = 1, pageSize = 20 } = data || {};

  let query = db.collection('students');

  // 搜索过滤
  if (keyword) {
    const reg = db.RegExp({
      regexp: keyword,
      options: 'i'
    });
    query = query.where(_.or([
      { name: reg },
      { phone: reg }
    ]));
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

  // 获取每个人员的预约统计
  const studentIds = result.data.map(s => s._id);
  const bookingsResult = await db.collection('bookings')
    .where({
      studentId: _.in(studentIds)
    })
    .get();

  // 统计每个人员的预约数
  const studentStats = {};
  bookingsResult.data.forEach(booking => {
    if (!studentStats[booking.studentId]) {
      studentStats[booking.studentId] = { completed: 0, pending: 0, cancelled: 0 };
    }
    if (booking.status === 'completed') {
      studentStats[booking.studentId].completed++;
    } else if (booking.status === 'pending' || booking.status === 'confirmed') {
      studentStats[booking.studentId].pending++;
    } else if (booking.status === 'cancelled') {
      studentStats[booking.studentId].cancelled++;
    }
  });

  // 合并统计数据
  const list = result.data.map(student => ({
    ...student,
    completedCount: studentStats[student._id]?.completed || 0,
    pendingCount: studentStats[student._id]?.pending || 0,
    cancelledCount: studentStats[student._id]?.cancelled || 0
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
 * 搜索人员
 */
async function searchStudents(data) {
  const { keyword } = data;

  if (!keyword) {
    return {
      success: false,
      message: '搜索关键词不能为空'
    };
  }

  const reg = db.RegExp({
    regexp: keyword,
    options: 'i'
  });

  const result = await db.collection('students')
    .where(_.or([
      { name: reg },
      { phone: reg }
    ]))
    .limit(10)
    .get();

  return {
    success: true,
    data: result.data
  };
}

/**
 * 获取人员统计
 */
async function getStudentStats(data) {
  const { id } = data;

  if (!id) {
    return {
      success: false,
      message: '人员ID不能为空'
    };
  }

  const bookingsResult = await db.collection('bookings')
    .where({ studentId: id })
    .get();

  const bookings = bookingsResult.data;
  const completedCount = bookings.filter(b => b.status === 'completed').length;
  const pendingCount = bookings.filter(b => b.status === 'pending' || b.status === 'confirmed').length;
  const cancelledCount = bookings.filter(b => b.status === 'cancelled').length;

  // 获取最近预约
  const recentBookings = await db.collection('bookings')
    .where({ studentId: id })
    .orderBy('date', 'desc')
    .limit(5)
    .get();

  return {
    success: true,
    data: {
      completedCount,
      pendingCount,
      cancelledCount,
      totalBookings: bookings.length,
      recentBookings: recentBookings.data
    }
  };
}
