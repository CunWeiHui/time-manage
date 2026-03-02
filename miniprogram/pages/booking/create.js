Page({
  data: {
    studentList: [],
    selectedStudent: null,
    formData: {
      studentId: '',
      date: '',
      startTime: '',
      endTime: '',
      courseContent: '',
      remark: '',
      sendReminder: true,
      reminderTime: 30
    },
    reminderTimes: [
      { value: 60, label: '提前1小时' },
      { value: 30, label: '提前30分钟' },
      { value: 15, label: '提前15分钟' },
      { value: 5, label: '提前5分钟' }
    ],
    reminderTimeIndex: 1,
    hasConflict: false,
    canSave: false,
    minDate: '',
    maxDate: '',
    isSaving: false
  },

  async onLoad(options) {
    await getApp().getCloudAsync();
    const today = new Date();
    const threeMonthsLater = new Date();
    threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3);

    this.setData({
      minDate: this.formatDate(today),
      maxDate: this.formatDate(threeMonthsLater),
      'formData.date': options.date || this.formatDate(today)
    });

    this.loadStudents();
    this.checkFormValid();
  },

  formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  async loadStudents() {
    const cloud = getApp().globalData.cloud;
    try {
      const res = await cloud.callFunction({
        name: 'student',
        data: {
          action: 'list'
        }
      });

      console.log('人员数据返回:', res);

      if (!res.result?.success) {
        console.error('加载人员失败:', res.result);
        wx.showToast({
          title: res.result?.message || '云函数未部署',
          icon: 'none',
          duration: 3000
        });
        this.setData({ studentList: [] });
        return;
      }

      const students = (res.result.data?.list || []).map(s => ({
        id: s._id,
        name: s.name,
        phone: s.phone
      }));

      this.setData({ studentList: students });
    } catch (error) {
      console.error('加载人员失败:', error);
      wx.showToast({
        title: '云函数调用失败，请先部署云函数',
        icon: 'none',
        duration: 3000
      });
      this.setData({ studentList: [] });
    }
  },

  onStudentChange(e) {
    const index = e.detail.value;
    const student = this.data.studentList[index];
    this.setData({
      selectedStudent: student,
      'formData.studentId': student.id
    });
    this.checkFormValid();
  },

  onDateChange(e) {
    this.setData({
      'formData.date': e.detail.value
    });
    this.checkFormValid();
    this.checkConflict();
  },

  onStartTimeChange(e) {
    const startTime = e.detail.value;
    const { endTime } = this.data.formData;

    // 如果结束时间已选择，校验开始时间是否早于结束时间
    if (endTime && startTime >= endTime) {
      wx.showToast({
        title: '开始时间必须早于结束时间',
        icon: 'none'
      });
      return;
    }

    this.setData({
      'formData.startTime': startTime
    });
    this.checkFormValid();
    this.checkConflict();
  },

  onEndTimeChange(e) {
    const endTime = e.detail.value;
    const { startTime } = this.data.formData;

    // 如果开始时间已选择，校验结束时间是否晚于开始时间
    if (startTime && endTime <= startTime) {
      wx.showToast({
        title: '结束时间必须晚于开始时间',
        icon: 'none'
      });
      return;
    }

    this.setData({
      'formData.endTime': endTime
    });
    this.checkFormValid();
    this.checkConflict();
  },

  onContentInput(e) {
    this.setData({
      'formData.courseContent': e.detail.value
    });
    this.checkFormValid();
  },

  onRemarkInput(e) {
    this.setData({
      'formData.remark': e.detail.value
    });
  },

  onReminderChange(e) {
    this.setData({
      'formData.sendReminder': e.detail.value
    });
  },

  onReminderTimeChange(e) {
    const index = e.detail.value;
    this.setData({
      reminderTimeIndex: parseInt(index),
      'formData.reminderTime': this.data.reminderTimes[index].value
    });
  },

  checkFormValid() {
    const { studentId, date, startTime, endTime, courseContent } = this.data.formData;
    const isValid = studentId && date && startTime && endTime && courseContent;
    this.setData({ canSave: isValid && !this.data.hasConflict });
  },

  async checkConflict() {
    const { date, startTime, endTime } = this.data.formData;
    if (!date || !startTime || !endTime) {
      this.setData({ hasConflict: false });
      return;
    }

    const cloud = getApp().globalData.cloud;
    try {
      const res = await cloud.callFunction({
        name: 'booking',
        data: {
          action: 'checkConflict',
          data: { date, startTime, endTime }
        }
      });

      console.log('冲突检测结果:', res);

      const hasConflict = res.result?.data?.hasConflict || false;
      this.setData({ hasConflict });
      this.checkFormValid();
    } catch (error) {
      console.error('检查冲突失败:', error);
      // 云函数未部署时，暂时不检测冲突
      this.setData({ hasConflict: false });
    }
  },

  async saveBooking() {
    if (!this.data.canSave || this.data.isSaving) return;

    this.setData({ isSaving: true });

    const cloud = getApp().globalData.cloud;
    try {
      const res = await cloud.callFunction({
        name: 'booking',
        data: {
          action: 'create',
          data: this.data.formData
        }
      });

      console.log('创建预约返回:', res);

      if (res.result?.success) {
        wx.showToast({
          title: '预约已创建',
          icon: 'success'
        });
        this.setData({ isSaving: false });
        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
      } else {
        this.setData({ isSaving: false });
        wx.showToast({
          title: res.result?.message || '创建失败，请检查云函数',
          icon: 'none',
          duration: 3000
        });
      }
    } catch (error) {
      this.setData({ isSaving: false });
      console.error('创建预约失败:', error);
      wx.showToast({
        title: '云函数调用失败，请先部署云函数',
        icon: 'none',
        duration: 3000
      });
    }
  }
});
