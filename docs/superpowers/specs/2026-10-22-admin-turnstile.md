# 后台验证码与登录限流

用户已确认 Turnstile 人机验证配合服务端限流。保留一个管理口令，不新增用户输入项。

登录前由同源配置接口提供公开 site key。登录 POST 校验同源 Origin、请求体、Redis 原子限流、Turnstile siteverify（success、hostname、action），再比较管理口令。每 IP 15 分钟最多 10 次登录尝试（含验证码失败及成功），不根据前端按钮状态判断授权。缺配置、Redis/验证码网络异常时拒绝登录，不回退为裸口令。原 Bearer 读取通道移除。

成功后生成随机会话，Redis 保存会话摘要及当前管理口令摘要，一小时过期；Cookie 为 HttpOnly、Secure、SameSite=Strict，限定 /api/stats。更改口令立即使旧会话失效。GET 只接受有效会话；DELETE 同源退出撤销会话。刷新页面可恢复一小时内的会话，无需反复验证码。

不保存原始 IP、验证码或管理口令；限流 key 使用 IP 的 SHA-256。公网代理后的 IP 读取采用部署平台提供的 x-forwarded-for / x-real-ip，不能由客户端指定 body 字段。

验证覆盖缺配置/缺验证码/错误凭证/hostname/action 不匹配/重复验证码/限流及过期/并发尝试、会话过期/口令轮换/退出/旧 Bearer 绕过、前端加载失败/过期/重复提交/恢复会话。Cloudflare 官方依据：server-side-validation、client-side-rendering 文档，2026-10-22 直接获取原文核对。真实生产密钥由用户创建后在 Vercel 配置；本地测试使用 mock，不上传真实密钥。

实施顺序：先写接口拒绝绕过测试，再实现认证及会话，接入界面，更新已有测试及部署说明，浏览器验证，提交推送。
