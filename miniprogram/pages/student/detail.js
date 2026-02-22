Page({
  data: {
    studentId: '',
    student: {},
    recentBookings: [],
    isLoading: false
  },

  onLoad(options) {
    const id = options.id;
    this.setData({ studentId: id });
    this.loadStudent();
    this.loadRecentBookings();
  },

  async loadStudent() {
    wx.showLoading({ title: '加载中...' });

    try {
      const res = await wx.cloud.callFunction({
        name: 'student',
        env: 'cloud1-5g9uss0gfe250350',
        data: {
          action: 'get',
          data: { id: this.data.studentId }
        }
      });

      if (res.result.success) {
        const student = res.result.data;
        this.setData({
          student: {
            id: student._id,
            name: student.name,
            phone: student.phone,
            wechat: student.wechat || '',
            remark: student.remark || '',
            createTime: this.formatDate(student.createTime),
            lastClass: student.lastClass || '',
            completedCount: student.completedCount || 0,
            pendingCount: student.pendingCount || 0,
            cancelledCount: student.cancelledCount || 0
          }
        });
      } else {
        wx.showToast({
          title: '加载失败',
          icon: 'none'
        });
      }
    } catch (error) {
      console.error('加载人员失败:', error);
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    } finally {
      wx.hideLoading();
    }
  },

  async loadRecentBookings() {
    try {
      const res = await wx.cloud.callFunction({
        name: 'booking',
        env: 'cloud1-5g9uss0gfe250350',
        data: {
          action: 'list',
          data: {
            studentId: this.data.studentId,
            pageSize: 5
          }
        }
      });

      const statusMap = {
        pending: '待确认',
        confirmed: '已确认',
        completed: '已完成',
        cancelled: '已取消'
      };

      const bookings = (res.result.data.list || []).map(b => ({
        id: b._id,
        date: b.date,
        startTime: b.startTime,
        endTime: b.endTime,
        status: b.status,
        statusText: statusMap[b.status] || b.status
      }));

      this.setData({ recentBookings: bookings });
    } catch (error) {
      console.error('加载预约失败:', error);
    }
  },

  viewAllBookings() {
    wx.navigateTo({
      url: `/pages/booking/list?studentId=${this.data.studentId}`
    });
  },

  viewBooking(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/booking/detail?id=${id}`
    });
  },

  createBooking() {
    wx.navigateTo({
      url: `/pages/booking/create?studentId=${this.data.studentId}`
    });
  },

  editStudent() {
    wx.navigateTo({
      url: `/pages/student/edit?id=${this.data.studentId}`
    });
  },

  async deleteStudent() {
    if (this.data.isLoading) return;

    wx.showModal({
      title: '删除人员',
      content: '确定要删除该人员吗？删除后不可恢复。',
      confirmColor: '#ff4d4f',
      success: async (res) => {
        if (res.confirm) {
          this.setData({ isLoading: true });

          try {
            const result = await wx.cloud.callFunction({
              name: 'student',
              env: 'cloud1-5g9uss0gfe250350',
              data: {
                action: 'delete',
                data: { id: this.data.studentId }
              }
            });

            if (result.result.success) {
              wx.showToast({
                title: '已删除',
                icon: 'success'
              });
              this.setData({ isLoading: false });
              setTimeout(() => {
                wx.navigateBack();
              }, 1500);
            } else {
              this.setData({ isLoading: false });
              wx.showToast({
                title: result.result.message || '删除失败',
                icon: 'none'
              });
            }
          } catch (error) {
            this.setData({ isLoading: false });
            console.error('删除人员失败:', error);
            wx.showToast({
              title: '删除失败',
              icon: 'none'
            });
          }
        }
      }
    });
  },

  formatDate(date) {
    if (!date) return '';
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
});
