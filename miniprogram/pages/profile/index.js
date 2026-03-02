Page({
  data: {
    stats: {
      studentCount: 15,
      todayBookings: 2,
      totalBookings: 86
    }
  },

  async onLoad() {
    await getApp().getCloudAsync();
    this.loadStats();
  },

  async onShow() {
    await getApp().getCloudAsync();
    this.loadStats();
  },

  async loadStats() {
    const cloud = getApp().globalData.cloud;
    try {
      // 并行获取统计数据
      const [studentRes, todayBookingRes, totalBookingRes] = await Promise.all([
        cloud.callFunction({
          name: 'student',
          data: { action: 'list', data: { pageSize: 1 } }
        }),
        cloud.callFunction({
          name: 'booking',
          data: {
            action: 'list',
            data: {
              date: this.formatDate(new Date()),
              pageSize: 1
            }
          }
        }),
        cloud.callFunction({
          name: 'booking',
          data: { action: 'list', data: { pageSize: 1 } }
        })
      ]);

      this.setData({
        stats: {
          studentCount: studentRes.result.data.total || 0,
          todayBookings: todayBookingRes.result.data.total || 0,
          totalBookings: totalBookingRes.result.data.total || 0
        }
      });
    } catch (error) {
      console.error('加载统计数据失败:', error);
    }
  },

  formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  goToBookingList() {
    wx.navigateTo({
      url: '/pages/booking/list'
    });
  },

  goToStudentList() {
    wx.switchTab({
      url: '/pages/student/index'
    });
  },

  goToStatistics() {
    wx.navigateTo({
      url: '/pages/statistics/index'
    });
  },

  goToSettings() {
    wx.navigateTo({
      url: '/pages/settings/index'
    });
  },

  goToAbout() {
    wx.navigateTo({
      url: '/pages/about/index'
    });
  },

  quickAddBooking() {
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];
    wx.navigateTo({
      url: `/pages/booking/create?date=${dateStr}`
    });
  },

  quickAddStudent() {
    wx.navigateTo({
      url: '/pages/student/create'
    });
  }
});
