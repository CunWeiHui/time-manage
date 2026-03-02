# 预约管理系统 - 部署指南

## 一、云开发环境配置

### 1. 开通云开发
1. 打开微信开发者工具
2. 点击顶部菜单「云开发」按钮
3. 根据提示开通云开发服务（需要选择付费方案，新用户有免费额度）

### 2. 配置环境ID
项目已配置云开发环境ID：`cloud1-5g9uss0gfe250350`

配置文件：
- `miniprogram/app.js` - 小程序初始化配置
- `project.config.json` - 项目配置文件
- `cloudbaserc.json` - 云开发环境配置

## 二、数据库集合创建

### 创建集合
在云开发控制台的数据库中创建以下集合：

1. **students** - 人员集合
   - 字段：name, phone, wechat, remark, openid, createTime, updateTime

2. **bookings** - 预约集合
   - 字段：studentId, studentName, date, startTime, endTime, courseContent, remark, status, sendReminder, reminderTime, reminderSent, openid, createTime, updateTime

3. **messages** - 消息集合
   - 字段：type, icon, title, content, bookingId, studentId, openid, read, createTime

### 权限设置
将所有集合的权限设置为「自定义」，配置以下规则：
```json
{
  "read": "auth.openid == doc.openid || doc.openid == null",
  "write": "auth.openid != null"
}
```

### 初始化数据
运行以下云函数初始化示例数据：
```javascript
wx.cloud.callFunction({
  name: 'database',
  data: {
    action: 'initData'
  }
});
```

## 三、云函数部署

### 上传云函数
在微信开发者工具中，右键点击以下云函数文件夹，选择「上传并部署：云端安装依赖」：

1. `cloudfunctions/database/` - 数据库初始化云函数
2. `cloudfunctions/booking/` - 预约管理云函数
3. `cloudfunctions/student/` - 人员管理云函数
4. `cloudfunctions/message/` - 消息管理云函数
5. `cloudfunctions/reminder/` - 消息提醒云函数

### 配置云函数权限
在云开发控制台 -> 云函数 -> 函数配置中，为 `reminder` 云函数添加以下权限：
- `subscribeMessage.send` - 发送订阅消息权限

## 四、订阅消息配置

### 1. 创建消息模板
1. 登录微信公众平台
2. 进入「功能」->「订阅消息」
3. 创建新模板，选择「课程提醒」或类似模板

### 2. 获取模板ID
创建模板后，记录模板ID，并修改 `cloudfunctions/reminder/index.js`：
```javascript
const templateId = 'your-template-id-here'; // 替换为你的模板ID
```

### 3. 模板字段示例
- thing1: 人员姓名
- time2: 课程开始时间
- time3: 课程结束时间
- thing4: 日程内容

## 五、小程序配置

### 1. 修改AppID
在 `project.config.json` 中确认 `appid` 为你的小程序AppID

### 2. 服务器域名配置
无需配置，云开发自动处理

### 3. 隐私设置
在小程序管理后台配置用户隐私保护指引

## 六、测试步骤

### 1. 初始化数据库
```javascript
// 在控制台执行
wx.cloud.callFunction({
  name: 'database',
  data: { action: 'initCollections' }
});

// 添加示例数据
wx.cloud.callFunction({
  name: 'database',
  data: { action: 'initData' }
});
```

### 2. 测试功能
1. 添加人员
2. 创建预约
3. 检查时间冲突
4. 查看预约列表
5. 更新预约状态
6. 查看消息通知

### 3. 订阅消息测试
1. 用户点击订阅按钮
2. 在云开发控制台测试云函数 `reminder`
3. 检查订阅消息是否发送成功

## 七、定时任务设置（可选）

### 1. 创建定时触发器
在云开发控制台 -> 云函数 -> reminder -> 触发器管理中创建定时触发器：

```cron
0 */5 * * * * *
```

表示每5分钟执行一次，检查需要发送的提醒消息。

### 2. 配置触发器参数
```json
{
  "action": "batchSend"
}
```

## 八、注意事项

1. **免费额度**：云开发免费额度有限，正式上线建议根据使用量选择合适套餐
2. **订阅消息限制**：订阅消息有发送次数限制，建议合理规划
3. **数据备份**：定期备份重要数据
4. **权限控制**：生产环境建议添加更严格的权限控制
5. **日志监控**：定期查看云函数日志，监控运行状态

## 九、常见问题

### Q1: 云函数调用失败
A: 检查环境ID是否正确，云函数是否已部署

### Q2: 数据库操作无权限
A: 检查数据库集合权限设置是否正确

### Q3: 订阅消息发送失败
A: 检查模板ID是否正确，用户是否已订阅，模板字段是否匹配

### Q4: 时间冲突检测不准确
A: 检查时间格式是否统一，确保使用HH:mm格式

## 十、后续优化建议

1. 添加数据统计功能
2. 实现预约导出功能
3. 添加批量操作功能
4. 支持多教师管理
5. 添加课程评价功能
6. 实现数据可视化报表
