# CostCacl
消费计算器

## 查看统计

打开 `/admin.html`，填写 `ANALYTICS_ADMIN_TOKEN` 对应的管理口令，完成人机验证即可登录。会话有效期一小时，刷新可恢复；退出会在服务端撤销会话。口令不保存在浏览器存储中。旧的 `ANALYTICS_GATE_TOKEN` 已不再使用，可从部署环境删除。统计继续使用既有 Upstash Redis 配置。

### 配置后台人机验证

1. 在 Cloudflare 控制台进入 Turnstile，添加站点，类型选择 **Managed**，添加 `cost.ahopig.com`。若要使用 Vercel 预览域名，也需将实际使用的预览域名加入允许列表。
2. 在 Vercel 项目环境变量中新增 `TURNSTILE_SITE_KEY`（Cloudflare 提供的 Site Key）和 `TURNSTILE_SECRET_KEY`（Secret Key，设为敏感变量），保留 `ANALYTICS_ADMIN_TOKEN`。Site Key 是公开值；Secret Key 只供服务端验证，不能写进网页或提交仓库。
3. 应用于 Production；需要预览测试时也配置 Preview。保存后重新部署，在 `/admin.html` 完成人机验证并用现有管理口令登录。

未配置验证码密钥时后台会拒绝登录并提示配置，前台计算器不受影响。验证码服务或 Redis 故障时也不会回退为仅口令登录。同一 IP 每 15 分钟最多 10 次登录尝试（包括验证码失败、口令错误及成功），超过后返回 429 和重试时间。登录后的统计刷新不消耗登录次数。验证码检查来源域名与 `analytics_login` action，每个凭证只能使用一次；旧的 Bearer 口令直接访问不再支持。

参考：[Cloudflare 服务端验证](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/)、[创建 Turnstile 站点](https://developers.cloudflare.com/turnstile/get-started/widget-management/dashboard/)。

新版统计按北京时间、匿名浏览器每天去重，包括访问、有效测算、生成车格卡、点击保存、系统分享成功、反馈点击和隔天回访，并展示近七天趋势。累计为每日人数之和，不是历史独立用户数；清除浏览器存储或换设备会产生新身份。保存点击不能证明保存成功，系统分享成功不能衡量接收人数或后续转发。不上传测算参数。

新版写入独立的 `stats:v2:*` 数据，旧数据保留，不混合换算。首页公开访问计数仍沿用原先的 IP 半小时去重口径，与后台新版访问人次不同。

## 分享昵称

生成分享卡片时自动显示一个趣味昵称，用户可以在卡片预览中修改（1～16 个字），修改后重新生成图片。同一浏览器保存昵称和匿名编号；昵称不唯一，改名仍归属原编号。未打开卡片前不上传昵称。打开后，后续行为会携带昵称供后台区分使用者，不上传车辆参数。清除浏览器存储或换设备会产生不同编号，不支持跨设备认人。

后台展示最近 50 位生成卡片的使用者及其卡片生成、保存、分享的每日去重次数；名单最多索引 1000 位，昵称档案自最后上报起保留 180 天。历史行为不追溯归到新昵称，未生成卡片者仍只计聚合统计。
