// app.js
const { envId, resourceAppid, resourceEnv } = require('./env.js');

App({
  globalData: {
    env: envId,
    // 共享云环境实例
    cloud: null,
    // 云开发就绪的 Promise
    cloudReadyPromise: null
  },

  onLaunch: function () {
    if (!wx.cloud) {
      console.error("请使用 2.2.3 或以上的基础库以使用云能力");
      return;
    }

    console.log('开始创建共享云实例...');

    // 创建共享云环境实例（调用资源方的云函数）
    this.globalData.cloud = new wx.cloud.Cloud({
      resourceAppid: resourceAppid,
      resourceEnv: resourceEnv
    });

    // 共享云实例需要异步鉴权，创建 Promise 确保异步就绪
    // 添加超时保护：5秒后自动 resolve
    this.globalData.cloudReadyPromise = new Promise((resolve) => {
      const timeoutId = setTimeout(() => {
        console.warn('云开发初始化超时，直接返回 cloud 实例');
        resolve(this.globalData.cloud);
      }, 5000);

      // 初始化共享云实例
      this.globalData.cloud.init();
    });
  },

  getCloud() {
    return this.globalData.cloud;
  },

  // 获取共享云实例（异步版本，推荐）
  async getCloudAsync() {
    if (this.globalData.cloudReadyPromise) {
      return await this.globalData.cloudReadyPromise;
    }
    // 如果Promise不存在（极少见），直接返回
    return this.globalData.cloud;
  }
});
