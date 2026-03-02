Page({
  data: {
    currentYear: 2026,
    currentMonth: 2,
    selectedDate: '',
    calendarDays: [],
    dayBookings: [],
    holidays: {}
  },

  onLoad() {
    const today = new Date();
    this.setData({
      currentYear: today.getFullYear(),
      currentMonth: today.getMonth() + 1,
      selectedDate: this.formatDate(today)
    });
    this.generateCalendar();
    this.loadHolidays();
  },

  onShow() {
    // 每次页面显示时刷新数据
    this.loadBookings(true);
  },

  onPullDownRefresh() {
    Promise.all([
      this.loadBookings(false),
      this.loadHolidays()
    ]).finally(() => {
      wx.stopPullDownRefresh();
    });
  },

  generateCalendar() {
    const { currentYear, currentMonth } = this.data;
    const firstDay = new Date(currentYear, currentMonth - 1, 1);
    const lastDay = new Date(currentYear, currentMonth, 0);
    const startWeekday = firstDay.getDay();
    const totalDays = lastDay.getDate();

    const calendarDays = [];

    // 上个月的日期
    const prevMonthLastDay = new Date(currentYear, currentMonth - 1, 0).getDate();
    for (let i = startWeekday - 1; i >= 0; i--) {
      calendarDays.push({
        day: prevMonthLastDay - i,
        isCurrentMonth: false,
        date: this.formatDateString(currentYear, currentMonth - 1, prevMonthLastDay - i)
      });
    }

    // 当前月的日期
    const today = new Date();
    const todayStr = this.formatDate(today);
    for (let i = 1; i <= totalDays; i++) {
      const dateStr = this.formatDateString(currentYear, currentMonth, i);
      calendarDays.push({
        day: i,
        isCurrentMonth: true,
        isToday: dateStr === todayStr,
        isSelected: dateStr === this.data.selectedDate,
        date: dateStr,
        hasBooking: false,
        bookingCount: 0,
        holiday: this.data.holidays[dateStr] || null
      });
    }

    // 下个月的日期
    const remainingDays = 42 - calendarDays.length;
    for (let i = 1; i <= remainingDays; i++) {
      calendarDays.push({
        day: i,
        isCurrentMonth: false,
        date: this.formatDateString(currentYear, currentMonth + 1, i)
      });
    }

    this.setData({ calendarDays });
  },

  formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  formatDateString(year, month, day) {
    const y = month > 12 ? year + 1 : (month < 1 ? year - 1 : year);
    const m = ((month - 1) % 12 + 12) % 12 + 1;
    const d = String(day).padStart(2, '0');
    return `${y}-${String(m).padStart(2, '0')}-${d}`;
  },

  prevMonth() {
    let { currentYear, currentMonth } = this.data;
    currentMonth--;
    if (currentMonth < 1) {
      currentMonth = 12;
      currentYear--;
    }
    this.setData({ currentYear, currentMonth });
    this.generateCalendar();
    this.loadHolidays();
  },

  nextMonth() {
    let { currentYear, currentMonth } = this.data;
    currentMonth++;
    if (currentMonth > 12) {
      currentMonth = 1;
      currentYear++;
    }
    this.setData({ currentYear, currentMonth });
    this.generateCalendar();
    this.loadHolidays();
  },

  goToday() {
    const today = new Date();
    this.setData({
      currentYear: today.getFullYear(),
      currentMonth: today.getMonth() + 1,
      selectedDate: this.formatDate(today)
    });
    this.generateCalendar();
    this.loadBookings();
    this.loadHolidays();
  },

  selectDay(e) {
    const date = e.currentTarget.dataset.date;
    this.setData({ selectedDate: date });
    this.generateCalendar();
    this.loadBookings();
  },

  async loadBookings(showLoading = true) {
    if (showLoading) {
      wx.showLoading({ title: '加载中...' });
    }

    const cloud =  await getApp().getCloudAsync();
    try {
      const res = await cloud.callFunction({
        name: 'booking',
        data: {
          action: 'list',
          data: {
            startDate: `${this.data.currentYear}-${String(this.data.currentMonth).padStart(2, '0')}-01`,
            endDate: `${this.data.currentYear}-${String(this.data.currentMonth).padStart(2, '0')}-31`
          }
        }
      });

      console.log('预约数据返回:', res);

      if (!res.result) {
        console.error('云函数调用失败，result 为空');
        wx.hideLoading();
        wx.showToast({
          title: '云函数未部署或调用失败',
          icon: 'none',
          duration: 3000
        });
        this.setData({ dayBookings: [] });
        return;
      }

      if (!res.result.success) {
        console.error('云函数返回错误:', res.result);
        wx.hideLoading();
        wx.showToast({
          title: res.result.message || '加载失败',
          icon: 'none'
        });
        this.setData({ dayBookings: [] });
        return;
      }

      const monthBookings = res.result.data?.list || [];
      console.log('本月预约数据:', monthBookings);

      // 更新日历标记
      const calendarDays = this.data.calendarDays.map(day => {
        if (!day.isCurrentMonth) return day;

        const dayBookings = monthBookings.filter(b => b.date === day.date);
        return {
          ...day,
          hasBooking: dayBookings.length > 0,
          bookingCount: dayBookings.length
        };
      });

      // 加载选中日期的预约
      const selectedDateBookings = monthBookings.filter(b => b.date === this.data.selectedDate);
      const statusMap = {
        pending: '待确认',
        confirmed: '已确认',
        completed: '已完成',
        cancelled: '已取消'
      };

      const dayBookings = selectedDateBookings.map(b => ({
        id: b._id,
        date: b.date,
        startTime: b.startTime,
        endTime: b.endTime,
        studentName: b.studentName,
        status: b.status,
        statusText: statusMap[b.status] || b.status
      }));

      this.setData({
        calendarDays,
        dayBookings
      });
    } catch (error) {
      console.error('加载预约失败:', error);
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    } finally {
      if (showLoading) {
        wx.hideLoading();
      }
    }
  },

  async loadHolidays() {
    const { currentYear, currentMonth } = this.data;

    try {
      // 计算下个月（跨年处理）
      let nextYear = currentYear;
      let nextMonth = currentMonth + 1;
      if (nextMonth > 12) {
        nextMonth = 1;
        nextYear++;
      }

      // 并行查询本月和下月的节假日数据
      const cloud =  await getApp().getCloudAsync();
      const [currentMonthRes, nextMonthRes] = await Promise.all([
        cloud.callFunction({
          name: 'getHolidays',
          data: { year: currentYear, month: currentMonth }
        }),
        cloud.callFunction({
          name: 'getHolidays',
          data: { year: nextYear, month: nextMonth }
        })
      ]);

      const holidays = {};

      if (currentMonthRes.result?.success) {
        Object.assign(holidays, currentMonthRes.result.data.map);
      }

      if (nextMonthRes.result?.success) {
        Object.assign(holidays, nextMonthRes.result.data.map);
      }

      this.setData({ holidays }, () => {
        this.generateCalendar();
      });

      console.log('节假日数据加载完成:', holidays);
    } catch (error) {
      console.error('加载节假日失败:', error);
      // 静默失败，不影响主流程
    }
  },

  addBooking() {
    wx.navigateTo({
      url: `/pages/booking/create?date=${this.data.selectedDate}`
    });
  },

  viewBooking(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/booking/detail?id=${id}`
    });
  }
});
