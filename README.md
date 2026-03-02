# 预约管理系统

基于微信小程序云开发的培训课程预约管理系统，帮助老师高效管理人员预约、课程安排和消息提醒。

## 功能特点

### 核心功能
- 📅 **日历管理** - 直观的日历视图，查看和管理每日预约
- 👥 **人员管理** - 人员信息管理、预约统计、历史记录
- 📝 **预约管理** - 创建、编辑、取消预约，支持状态流转
- ⏰ **智能提醒** - 预约提醒功能，避免错过课程
- 🔔 **消息通知** - 实时接收预约变动通知
- ⚡ **冲突检测** - 自动检测时间冲突，避免预约重叠

### 特色功能
- **1对1课程管理** - 专注一对一培训场景
- **时间冲突自动检测** - 创建预约时自动检查时间冲突
- **消息订阅提醒** - 支持订阅消息提前提醒
- **数据统计分析** - 人员预约统计、课程完成情况
- **响应式设计** - 美观简洁的 UI 设计

## 技术架构

### 前端技术
- **微信小程序** - 原生小程序开发
- **WXML/WXSS** - 小程序模板和样式
- **JavaScript/ES6+** - 业务逻辑实现

### 后端技术
- **微信云开发** - 云原生后端服务
- **云数据库** - JSON 文档型数据库
- **云函数** - 服务端业务逻辑
- **云存储** - 文件存储服务
- **订阅消息** - 消息推送服务

## 系统架构

```
┌─────────────────────────────────────────────────────────┐
│                   微信小程序前端                       │
├─────────────────────────────────────────────────────────┤
│  页面层              │  组件层         │  工具层   │
│  - index (日历)      │  - calendar    │  - db.js   │
│  - booking (预约)    │                │  - util.js │
│  - student (人员)    │                │           │
│  - message (消息)    │                │           │
│  - profile (我的)    │                │           │
└──────────────┬────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────┐
│                  微信云开发后端                       │
├─────────────────────────────────────────────────────────┤
│  云函数层              │  数据库层       │  消息层   │
│  - database          │  - students    │  订阅消息  │
│  - booking           │  - bookings    │           │
│  - student           │  - messages    │           │
│  - message           │               │           │
│  - reminder          │               │           │
└─────────────────────────────────────────────────────────┘
```

## 数据库设计

### 1. students（人员集合）
```json
{
  "_id": "人员ID",
  "name": "人员姓名",
  "phone": "手机号",
  "wechat": "微信号",
  "remark": "备注",
  "openid": "用户OpenID",
  "createTime": "创建时间",
  "updateTime": "更新时间"
}
```

### 2. bookings（预约集合）
```json
{
  "_id": "预约ID",
  "studentId": "人员ID",
  "studentName": "人员姓名",
  "date": "预约日期",
  "startTime": "开始时间",
  "endTime": "结束时间",
  "courseContent": "日程内容",
  "remark": "备注",
  "status": "状态(pending/confirmed/completed/cancelled)",
  "sendReminder": "是否发送提醒",
  "reminderTime": "提前提醒时间(分钟)",
  "reminderSent": "提醒是否已发送",
  "openid": "创建者OpenID",
  "createTime": "创建时间",
  "updateTime": "更新时间"
}
```

### 3. messages（消息集合）
```json
{
  "_id": "消息ID",
  "type": "消息类型",
  "icon": "图标",
  "title": "标题",
  "content": "内容",
  "bookingId": "关联预约ID",
  "studentId": "关联人员ID",
  "openid": "接收者OpenID",
  "read": "是否已读",
  "createTime": "创建时间"
}
```

## 页面结构

### 1. 日历首页 (pages/index)
**功能：**
- 日历视图展示，支持月份切换
- 显示每日预约数量标记
- 选中日期查看当日预约列表
- 快速创建预约

**核心逻辑：**
```javascript
- 加载当月所有预约数据
- 更新日历标记（显示预约数量）
- 点击日期过滤当日预约
```

### 2. 预约管理 (pages/booking)
**创建预约 (create)：**
- 选择人员、日期、时间段
- 填写日程内容和备注
- 设置提醒时间和方式
- 实时检测时间冲突

**预约详情 (detail)：**
- 查看预约完整信息
- 状态管理（确认/完成/取消）
- 跳转人员详情
- 编辑预约信息

### 3. 人员管理 (pages/student)
**人员列表 (index)：**
- 人员列表展示
- 搜索人员（姓名/手机号）
- 显示预约统计数据
- 添加新人员

**人员详情 (detail)：**
- 人员基本信息
- 预约统计数据
- 最近预约记录
- 快捷操作（新建预约、编辑、删除）

**添加人员 (create)：**
- 填写人员信息
- 验证手机号格式
- 检查手机号重复

### 4. 消息中心 (pages/message)
**功能：**
- 消息列表展示
- 未读/已读状态标记
- 关联预约跳转
- 相对时间显示

**消息类型：**
- 预约创建通知
- 预约确认通知
- 预约取消通知
- 预约提醒
- 系统通知

### 5. 个人中心 (pages/profile)
**功能：**
- 统计数据展示
- 快捷操作入口
- 功能菜单导航

**统计数据：**
- 人员总数
- 今日预约数
- 累计预约数

## 云函数设计

### 1. database（数据库管理）
**功能：**
- `initCollections` - 初始化集合
- `initData` - 初始化示例数据
- `reset` - 重置数据库

### 2. booking（预约管理）
**功能：**
- `create` - 创建预约
- `update` - 更新预约
- `delete` - 删除预约
- `get` - 获取预约详情
- `list` - 获取预约列表
- `checkConflict` - 检测时间冲突
- `confirm` - 确认预约
- `complete` - 完成预约
- `cancel` - 取消预约

**核心算法 - 时间冲突检测：**
```javascript
// 判断两个时间段是否重叠
// 重叠条件: (start1 < end2) && (start2 < end1)
const hasConflict = existingBookings.some(booking => {
  return (startTime < booking.endTime) && (endTime > booking.startTime);
});
```

### 3. student（人员管理）
**功能：**
- `create` - 创建人员
- `update` - 更新人员
- `delete` - 删除人员
- `get` - 获取人员详情
- `list` - 获取人员列表
- `search` - 搜索人员
- `getStats` - 获取人员统计

### 4. message（消息管理）
**功能：**
- `create` - 创建消息
- `list` - 获取消息列表
- `get` - 获取消息详情
- `markRead` - 标记已读
- `markAllRead` - 全部标记已读
- `delete` - 删除消息
- `getUnreadCount` - 获取未读数

### 5. reminder（消息提醒）
**功能：**
- `sendReminder` - 发送提醒消息
- `subscribe` - 订阅消息模板
- `getTemplateId` - 获取模板ID
- `checkReminders` - 检查需要发送的提醒
- `batchSend` - 批量发送提醒

**订阅消息模板：**
```
模板字段：
- thing1: 人员姓名
- time2: 课程开始时间
- time3: 课程结束时间
- thing4: 日程内容
```

## 业务流程

### 预约创建流程
```
1. 选择人员 → 2. 选择日期时间 → 3. 检测时间冲突
     ↓                                         ↓
5. 设置提醒 → 4. 冲突则提示重新选择 → 6. 填写日程内容
     ↓                                         ↓
              7. 保存预约 → 8. 创建消息通知
```

### 时间冲突检测流程
```
输入: 日期、开始时间、结束时间
  ↓
查询该日期所有有效预约 (status in [pending, confirmed])
  ↓
遍历检测时间段重叠
  ↓
返回: 冲突状态、冲突预约列表
```

### 预约状态流转
```
pending (待确认)
    ↓ 确认
confirmed (已确认)
    ↓ 完成
completed (已完成)

    ↓ 取消
cancelled (已取消)
```

### 消息提醒流程
```
1. 创建预约时设置提醒
  ↓
2. 定时任务检查需要提醒的预约
  ↓
3. 发送订阅消息
  ↓
4. 标记提醒已发送
  ↓
5. 创建消息记录
```

## UI 设计

### 设计原则
- **简洁美观** - 清爽的界面设计，突出核心信息
- **操作便捷** - 减少操作步骤，提升用户体验
- **信息清晰** - 层级分明，重点突出
- **交互友好** - 及时反馈，流畅动画

### 配色方案
```
主色调: #4A76a8
成功色: #73a1d6
警告色: #faad14
错误色: #c4cbcf
背景色: #73a1d6
其他背景色调: #295484
```

### 组件设计
- **卡片式布局** - 信息模块化展示
- **圆角设计** - 16rpx 圆角，柔和视觉效果
- **阴影效果** - 轻微阴影，层次分明
- **状态标签** - 不同颜色区分状态

## 共享云环境架构

本项目采用共享云环境模式，调用 scoreborad 项目的云开发资源。

### 架构说明

```
┌─────────────────────────────────────────────────────────────────┐
│                        项目关系图                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌─────────────────┐              ┌─────────────────┐          │
│   │   time-manage   │              │    scoreborad  │          │
│   │   (调用方)      │    共享      │    (资源方)    │          │
│   │   小程序 A      │ ──────────→ │    小程序 B     │          │
│   └────────┬────────┘   云环境    └────────┬────────┘          │
│            │                               │                    │
│            │  wx.cloud.init()              │  云函数部署        │
│            │  resourceAppid               │  - booking         │
│            │  resourceEnv                 │  - cloudbase_auth │
│            │                               │  - getHolidays    │
│            └───────────────────────────────┘                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 关键概念

- **资源方 (scoreborad)**：拥有云开发环境的小程序，负责部署云函数和数据库
- **调用方 (time-manage)**：通过共享云环境调用资源方的云函数

### 配置说明

`miniprogram/env.js` 中配置：
```javascript
module.exports = {
  envId: 'cloud1-3go4l2wh77af1171',      // 资源方环境ID
  resourceAppid: 'wxxxxxxxxx',            // 资源方小程序AppID
  resourceEnv: 'cloud1-3go4l2wh77af1171'  // 资源方云环境ID
};
```

### 初始化流程

1. **app.js 初始化**
   - `wx.cloud.init()` - 初始化默认云实例
   - `new wx.cloud.Cloud()` - 创建共享云实例
   - 设置 `cloudReady: true` 标志

2. **页面调用**
   - 使用 `getApp().getCloud()` 获取共享云实例
   - 确保在 `cloudReady` 为 true 后再调用云函数

### cloudbase_auth 云函数

**重要**：此云函数必须在 **scoreborad** 项目中部署，不能在 time-manage 中。

在 scoreborad 项目的 `cloudfunctions/cloudbase_auth/index.js` 中：
```javascript
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  // 返回调用方的 OpenID，用于跨账号云函数调用鉴权
  return {
    cloudBaseCUid: wxContext.OPENID || wxContext.FROM_OPENID
  }
}
```

部署步骤：
1. 在微信开发者工具中打开 scoreborad 项目
2. 右键点击 `cloudfunctions/cloud目录
3.base_auth`  选择「上传并部署-云端安装依赖」

### 常见问题

**Q: "Cloud API isn't enabled, please call wx.cloud.init first"**
- 确保 app.js 中已正确初始化云开发
- 页面 onLoad 可能在 app.onLaunch 之前执行，需要添加 cloudReady 检查

**Q: "cloudbase_auth 返回无效的回包"**
- 确保 cloudbase_auth 云函数返回 `cloudBaseCUid` 字段
- 确保该云函数已在 scoreborad 项目中正确部署

## 部署指南

详细部署步骤请参考 [DEPLOY.md](./DEPLOY.md)

## 快速开始

### 1. 环境准备
```bash
# 克隆项目
git clone <repository-url>
cd time-manage
```

### 2. 微信开发者工具配置
1. 用微信开发者工具打开项目
2. 填入 AppID
3. 开通云开发服务

### 3. 配置环境
项目已配置云开发环境ID：`cloud1-5g9uss0gfe250350`

配置文件：
- `miniprogram/app.js` - 小程序环境配置
- `project.config.json` - 项目配置
- `cloudbaserc.json` - 云开发配置

### 4. 部署云函数
右键点击云函数文件夹，选择「上传并部署：云端安装依赖」

### 5. 创建数据库集合
在云开发控制台 → 数据库中，手动创建以下3个集合：

#### students（人员集合）
```
集合名称: students
描述: 人员信息集合
```

#### bookings（预约集合）
```
集合名称: bookings
描述: 预约记录集合
```

#### messages（消息集合）
```
集合名称: messages
描述: 消息通知集合
```

**注意：** 创建集合后无需添加索引和示例数据，系统会自动管理数据结构。

## 开发规范

### 代码规范
- 使用 ES6+ 语法
- 云函数统一使用 async/await
- 错误处理使用 try-catch
- 命名使用驼峰命名法

### 目录结构
```
miniprogram/
├── pages/           # 页面目录
│   ├── index/       # 首页
│   ├── booking/     # 预约管理
│   ├── student/     # 人员管理
│   ├── message/     # 消息中心
│   └── profile/     # 个人中心
├── components/      # 组件目录
├── utils/          # 工具函数
│   ├── db.js       # 数据库封装
│   └── util.js     # 通用工具
├── images/         # 图片资源
├── app.js          # 小程序入口
├── app.json        # 小程序配置
└── app.wxss        # 全局样式

cloudfunctions/
├── database/       # 数据库管理
├── booking/        # 预约管理
├── student/        # 人员管理
├── message/        # 消息管理
└── reminder/       # 消息提醒
```

## 注意事项

### 性能优化
- 合理使用云数据库分页
- 云函数避免返回大量数据
- 图片资源使用 WebP 格式
- 开启懒加载

### 安全建议
- 数据库设置合理权限
- 敏感操作添加 openid 验证
- 定期备份数据
- 监控云函数运行状态

### 订阅消息限制
- 每个用户只能接收一条订阅消息
- 需要用户主动订阅
- 模板有发送次数限制

## 后续优化

### 功能增强
- [ ] 支持多教师管理
- [ ] 添加课程评价功能
- [ ] 实现预约导出功能
- [ ] 支持批量操作
- [ ] 添加数据可视化报表

### 体验优化
- [ ] 支持暗色模式
- [ ] 添加手势操作
- [ ] 优化加载动画
- [ ] 增加搜索历史

## 参考资源

- [微信小程序官方文档](https://developers.weixin.qq.com/miniprogram/dev/framework/)
- [云开发官方文档](https://developers.weixin.qq.com/miniprogram/dev/wxcloud/basis/getting-started.html)
- [订阅消息文档](https://developers.weixin.qq.com/miniprogram/dev/framework/server-ability/message-push.html)



## 许可证

MIT License

## 联系方式

如有问题或建议，欢迎提出 Issue。
