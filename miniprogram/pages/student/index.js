Page({
  data: {
    keyword: '',
    studentList: []
  },

  onLoad() {
    this.loadStudents();
  },

  onShow() {
    this.loadStudents();
  },

  onSearchInput(e) {
    this.setData({ keyword: e.detail.value });
    this.loadStudents();
  },

  clearSearch() {
    this.setData({ keyword: '' });
    this.loadStudents();
  },

  async loadStudents() {
    wx.showLoading({ title: '加载中...' });

    try {
      const res = await wx.cloud.callFunction({
        name: 'student',
        env: 'cloud1-5g9uss0gfe250350',
        data: {
          action: 'list',
          data: {
            keyword: this.data.keyword
          }
        }
      });

      const students = (res.result.data.list || []).map(s => ({
        id: s._id,
        name: s.name,
        phone: s.phone,
        completedCount: s.completedCount || 0,
        pendingCount: s.pendingCount || 0,
        lastClass: s.lastClass || ''
      }));

      this.setData({ studentList: students });
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

  viewStudent(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/student/detail?id=${id}`
    });
  },

  addStudent() {
    wx.navigateTo({
      url: '/pages/student/create'
    });
  }
});
