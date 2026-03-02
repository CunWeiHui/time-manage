Page({
  data: {
    messageList: []
  },

  async onLoad() {
    await getApp().getCloudAsync();
    this.loadMessages();
  },

  async onShow() {
    await getApp().getCloudAsync();
    this.loadMessages();
  },

  async loadMessages() {
    wx.showLoading({ title: '加载中...' });
    const cloud = getApp().globalData.cloud;

    try {
      const res = await cloud.callFunction({
        name: 'message',
        data: {
          action: 'list'
        }
      });

      console.log('消息数据返回:', res);

      if (!res.result || !res.result.success) {
        console.error('云函数调用失败:', res.result);
        wx.hideLoading();
        wx.showToast({
          title: res.result?.message || '云函数未部署或调用失败',
          icon: 'none',
          duration: 3000
        });
        this.setData({ messageList: [] });
        return;
      }

      const messages = (res.result.data?.list || []).map(m => ({
        id: m._id,
        icon: m.icon,
        title: m.title,
        content: m.content,
        time: m.time,
        read: m.read,
        bookingId: m.bookingId
      }));

      this.setData({ messageList: messages });
    } catch (error) {
      console.error('加载消息失败:', error);
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
      this.setData({ messageList: [] });
    } finally {
      wx.hideLoading();
    }
  },

  viewMessage(e) {
    const id = e.currentTarget.dataset.id;
    const message = this.data.messageList.find(m => m.id === id);
    if (message) {
      this.updateMessageRead(id);
    }

    if (message && message.bookingId) {
      wx.navigateTo({
        url: `/pages/booking/detail?id=${message.bookingId}`
      });
    }
  },

  async updateMessageRead(id) {
    const cloud = getApp().globalData.cloud;
    try {
      await cloud.callFunction({
        name: 'message',
        data: {
          action: 'markRead',
          data: { id }
        }
      });

      const messageList = this.data.messageList.map(m => {
        if (m.id === id) {
          return { ...m, read: true };
        }
        return m;
      });
      this.setData({ messageList });
    } catch (error) {
      console.error('标记已读失败:', error);
    }
  }
});
