const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()

  // 跨账号调用时，获取来源方小程序 AppID
  console.log('FROM_APPID:', wxContext.FROM_APPID)
  // 获取来源方用户 OpenID
  console.log('FROM_OPENID:', wxContext.FROM_OPENID)
  // 获取来源方小程序或 App 的 openid
  console.log('FROM_OPENID:', wxContext.FROM_OPENID)
  // 获取调用环境信息
  console.log('ENV:', wxContext.ENV)

  // 返回授权结果
  // errCode: 0 表示授权通过，非 0 表示拒绝访问
  return {
    errCode: 0,
    errMsg: 'ok',
    // 可以在这里返回额外的授权信息
    auth: {
      fromAppId: wxContext.FROM_APPID,
      fromOpenId: wxContext.FROM_OPENID,
      env: wxContext.ENV
    }
  }
}
