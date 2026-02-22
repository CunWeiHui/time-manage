Page({
  data: {
    formData: {
      name: '',
      phone: '',
      wechat: '',
      remark: ''
    },
    canSave: false,
    isSaving: false
  },

  onNameInput(e) {
    this.setData({
      'formData.name': e.detail.value
    });
    this.checkFormValid();
  },

  onPhoneInput(e) {
    this.setData({
      'formData.phone': e.detail.value
    });
    this.checkFormValid();
  },

  onWechatInput(e) {
    this.setData({
      'formData.wechat': e.detail.value
    });
  },

  onRemarkInput(e) {
    this.setData({
      'formData.remark': e.detail.value
    });
  },

  checkFormValid() {
    const { name, phone } = this.data.formData;
    const isValid = name && phone && phone.length === 11;
    this.setData({ canSave: isValid });
  },

  async saveStudent() {
    if (!this.data.canSave || this.data.isSaving) return;

    this.setData({ isSaving: true });

    try {
      const res = await wx.cloud.callFunction({
        name: 'student',
        env: 'cloud1-5g9uss0gfe250350',
        data: {
          action: 'create',
          data: this.data.formData
        }
      });

      if (res.result.success) {
        wx.showToast({
          title: '人员已添加',
          icon: 'success'
        });
        this.setData({ isSaving: false });
        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
      } else {
        this.setData({ isSaving: false });
        wx.showToast({
          title: res.result.message || '添加失败',
          icon: 'none'
        });
      }
    } catch (error) {
      this.setData({ isSaving: false });
      console.error('添加人员失败:', error);
      wx.showToast({
        title: '添加失败',
        icon: 'none'
      });
    }
  }
});
