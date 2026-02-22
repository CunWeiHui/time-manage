Page({
  data: {
    bookingId: '',
    booking: {},
    isLoading: false
  },

  onLoad(options) {
    const id = options.id;
    this.setData({ bookingId: id });
    this.loadBooking();
  },

  formatDateTime(date) {
    if (!date) return '';
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}`;
  },

  async loadBooking() {
    wx.showLoading({ title: '加载中...' });

    try {
      const res = await wx.cloud.callFunction({
        name: 'booking',
        env: 'cloud1-5g9uss0gfe250350',
        data: {
          action: 'get',
          data: { id: this.data.bookingId }
        }
      });

      if (res.result.success) {
        const booking = res.result.data;
        const statusMap = {
          pending: '待确认',
          confirmed: '已确认',
          completed: '已完成',
          cancelled: '已取消'
        };
        const reminderTimeMap = {
          60: '提前1小时',
          30: '提前30分钟',
          15: '提前15分钟',
          5: '提前5分钟'
        };

        this.setData({
          booking: {
            ...booking,
            id: booking._id,
            statusText: statusMap[booking.status] || booking.status,
            reminderTimeLabel: reminderTimeMap[booking.reminderTime] || `提前${booking.reminderTime}分钟`,
            createTime: this.formatDateTime(booking.createTime)
          }
        });
      } else {
        wx.showToast({
          title: '加载失败',
          icon: 'none'
        });
      }
    } catch (error) {
      console.error('加载预约失败:', error);
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    } finally {
      wx.hideLoading();
    }
  },

  confirmBooking() {
    wx.showModal({
      title: '确认预约',
      content: '确定要确认此预约吗？',
      success: (res) => {
        if (res.confirm) {
          this.updateStatus('confirmed');
        }
      }
    });
  },

  completeBooking() {
    wx.showModal({
      title: '完成课程',
      content: '确定要标记此课程为已完成吗？',
      success: (res) => {
        if (res.confirm) {
          this.updateStatus('completed');
        }
      }
    });
  },

  cancelBooking() {
    wx.showModal({
      title: '取消预约',
      content: '确定要取消此预约吗？',
      confirmColor: '#ff4d4f',
      success: (res) => {
        if (res.confirm) {
          this.updateStatus('cancelled');
        }
      }
    });
  },

  async updateStatus(status) {
    if (this.data.isLoading) return;

    const statusMap = {
      confirmed: '已确认',
      completed: '已完成',
      cancelled: '已取消'
    };
    const actionMap = {
      confirmed: 'confirm',
      completed: 'complete',
      cancelled: 'cancel'
    };

    this.setData({ isLoading: true });

    try {
      const res = await wx.cloud.callFunction({
        name: 'booking',
        env: 'cloud1-5g9uss0gfe250350',
        data: {
          action: actionMap[status],
          data: { id: this.data.bookingId }
        }
      });

      if (res.result.success) {
        this.setData({
          'booking.status': status,
          'booking.statusText': statusMap[status],
          isLoading: false
        });
        wx.showToast({
          title: '操作成功',
          icon: 'success'
        });
      } else {
        this.setData({ isLoading: false });
        wx.showToast({
          title: res.result.message || '操作失败',
          icon: 'none'
        });
      }
    } catch (error) {
      this.setData({ isLoading: false });
      console.error('更新状态失败:', error);
      wx.showToast({
        title: '操作失败',
        icon: 'none'
      });
    }
  },

  editBooking() {
    wx.navigateTo({
      url: `/pages/booking/edit?id=${this.data.bookingId}`
    });
  }
});
