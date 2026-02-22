/**
 * 数据库工具类
 * 封装云数据库操作
 */

const db = wx.cloud.database();

/**
 * 创建记录
 */
function add(collection, data) {
  return db.collection(collection).add({
    data: {
      ...data,
      createTime: db.serverDate(),
      updateTime: db.serverDate()
    }
  });
}

/**
 * 根据ID获取单条记录
 */
function getById(collection, id) {
  return db.collection(collection).doc(id).get();
}

/**
 * 获取列表
 */
function getList(collection, where = {}, orderBy = { field: 'createTime', order: 'desc' }) {
  let query = db.collection(collection);
  if (where && Object.keys(where).length > 0) {
    query = query.where(where);
  }
  if (orderBy) {
    query = query.orderBy(orderBy.field, orderBy.order);
  }
  return query.get();
}

/**
 * 更新记录
 */
function update(collection, id, data) {
  return db.collection(collection).doc(id).update({
    data: {
      ...data,
      updateTime: db.serverDate()
    }
  });
}

/**
 * 删除记录
 */
function remove(collection, id) {
  return db.collection(collection).doc(id).remove();
}

/**
 * 检查时间段是否可用
 */
async function checkTimeAvailable(date, startTime, endTime) {
  const { data } = await db.collection('bookings')
    .where({
      date: date,
      status: db.command.in(['confirmed', 'completed'])
    })
    .get();

  return !data.some(booking => {
    return (startTime < booking.endTime && endTime > booking.startTime);
  });
}

module.exports = {
  db,
  add,
  getById,
  getList,
  update,
  remove,
  checkTimeAvailable
};
