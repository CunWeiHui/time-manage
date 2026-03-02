const app = getApp();

Page({
  data: {
    envId: '',
    cloudStatus: 'loading',
    cloudStatusText: '检查中...',
    functions: [
      { name: 'database', desc: '数据库初始化', status: 'pending', statusText: '未检查' },
      { name: 'booking', desc: '预约管理', status: 'pending', statusText: '未检查' },
      { name: 'student', desc: '人员管理', status: 'pending', statusText: '未检查' },
      { name: 'message', desc: '消息管理', status: 'pending', statusText: '未检查' },
      { name: 'reminder', desc: '消息提醒', status: 'pending', statusText: '未检查' }
    ]
  },

  async onLoad() {
    await app.getCloudAsync();
    this.setData({ envId: app.globalData.env });
    this.checkCloud();
    this.checkAll();
  },

  async checkCloud() {
    try {
      await wx.cloud.init({ env: app.globalData.env });
      this.setData({
        cloudStatus: 'success',
        cloudStatusText: '已初始化'
      });
    } catch (error) {
      console.error('云开发初始化失败:', error);
      this.setData({
        cloudStatus: 'error',
        cloudStatusText: '初始化失败'
      });
    }
  },

  async checkAll() {
    const functions = this.data.functions.map(func => ({
      ...func,
      status: 'checking',
      statusText: '检查中...'
    }));

    this.setData({ functions });

    for (let i = 0; i < functions.length; i++) {
      await this.checkFunction(i);
    }
  },

  async checkFunction(index) {
    const funcName = this.data.functions[index].name;

    try {
      let action = '';
      switch (funcName) {
        case 'database':
          action = 'initCollections';
          break;
        case 'booking':
        case 'student':
        case 'message':
          action = 'list';
          break;
        case 'reminder':
          action = 'getTemplateId';
          break;
      }

      const cloud = getApp().globalData.cloud;
      const res = await cloud.callFunction({
        name: funcName,
        data: {
          action: action,
          data: {}
        }
      });

      console.log(`${funcName} 检查结果:`, res);

      const functions = this.data.functions;
      functions[index].status = 'success';
      functions[index].statusText = '正常';
      this.setData({ functions });
    } catch (error) {
      console.error(`${funcName} 检查失败:`, error);

      const functions = this.data.functions;
      functions[index].status = 'error';
      functions[index].statusText = '未部署';
      this.setData({ functions });
    }
  },

  async initDatabase() {
    wx.showModal({
      title: '确认',
      content: '是否初始化数据库？这将创建示例数据。',
      success: async (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '初始化中...' });

          const cloud = getApp().globalData.cloud;
          try {
            const res = await cloud.callFunction({
              name: 'database',
              data: {
                action: 'initData'
              }
            });

            wx.hideLoading();

            if (res.result.success) {
              wx.showToast({
                title: '初始化成功',
                icon: 'success'
              });
            } else {
              wx.showToast({
                title: res.result.message || '初始化失败',
                icon: 'none'
              });
            }
          } catch (error) {
            wx.hideLoading();
            wx.showToast({
              title: '初始化失败，请确保database云函数已部署',
              icon: 'none',
              duration: 3000
            });
          }
        }
      }
    });
  }
});
