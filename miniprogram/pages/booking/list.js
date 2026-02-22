Page({
  data: {
    bookingList: [],
    loading: false,
    filterStatus: 'all', // all, pending, confirmed, completed, cancelled
    statusFilterOptions: [
      { label: '全部', value: 'all' },
      { label: '待确认', value: 'pending' },
      { label: '已确认', value: 'confirmed' },
      { label: '已完成', value: 'completed' },
      { label: '已取消', value: 'cancelled' }
    ]
  },

  onLoad() {
    this.loadBookings();
  },

  onShow() {
    this.loadBookings();
  },

  onPullDownRefresh() {
    this.loadBookings().then(() => {
      wx.stopPullDownRefresh();
    });
  },

  async loadBookings() {
    if (this.data.loading) return;

    this.setData({ loading: true });

    try {
      const res = await wx.cloud.callFunction({
        name: 'booking',
        env: 'cloud1-5g9uss0gfe250350',
        data: {
          action: 'list',
          data: {
            status: this.data.filterStatus === 'all' ? undefined : this.data.filterStatus
          }
        }
      });

      if (res.result.success) {
        const list = res.result.data.list || [];
        const statusMap = {
          pending: '待确认',
          confirmed: '已确认',
          completed: '已完成',
          cancelled: '已取消'
        };

        const formattedList = list.map(booking => ({
          ...booking,
          id: booking._id,
          statusText: statusMap[booking.status] || booking.status,
          dateText: this.formatDate(booking.date),
          timeRange: `${booking.startTime} - ${booking.endTime}`
        }));

        this.setData({ bookingList: formattedList });
      } else {
        wx.showToast({
          title: res.result.message || '加载失败',
          icon: 'none'
        });
      }
    } catch (error) {
      console.error('加载日程列表失败:', error);
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  formatDate(date) {
    if (!date) return '';
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  filterByStatus(e) {
    const status = e.currentTarget.dataset.status;
    this.setData({ filterStatus: status });
    this.loadBookings();
  },

  goToDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/booking/detail?id=${id}`
    });
  },

  goToCreate() {
    wx.navigateTo({
      url: '/pages/booking/create'
    });
  },

  deleteBooking(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '确认删除',
      content: '确定要删除此日程吗？删除后无法恢复。',
      confirmColor: '#ff4d4f',
      success: (res) => {
        if (res.confirm) {
          this.performDelete(id);
        }
      }
    });
  },

  async performDelete(id) {
    wx.showLoading({ title: '删除中...' });

    try {
      const res = await wx.cloud.callFunction({
        name: 'booking',
        env: 'cloud1-5g9uss0gfe250350',
        data: {
          action: 'delete',
          data: { id }
        }
      });

      wx.hideLoading();

      if (res.result.success) {
        wx.showToast({
          title: '删除成功',
          icon: 'success'
        });
        this.loadBookings();
      } else {
        wx.showToast({
          title: res.result.message || '删除失败',
          icon: 'none'
        });
      }
    } catch (error) {
      wx.hideLoading();
      console.error('删除日程失败:', error);
      wx.showToast({
        title: '删除失败',
        icon: 'none'
      });
    }
  }
});
