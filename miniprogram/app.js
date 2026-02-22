// app.js
App({
  onLaunch: function () {
    this.globalData = {
      env: "cloud1-5g9uss0gfe250350"
    };

    if (!wx.cloud) {
      console.error("请使用 2.2.3 或以上的基础库以使用云能力");
    } else {
      wx.cloud.init({
        env: this.globalData.env,
        traceUser: true,
      });
      console.log("云开发初始化成功，环境ID:", this.globalData.env);
    }
  }
});
