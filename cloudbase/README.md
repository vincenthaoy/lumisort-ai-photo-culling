# LumiSort 腾讯云 CloudBase 配置

这套配置把演示版升级为“每个用户拥有独立照片库”的正式版骨架。未填写环境变量时，网页自动使用本地演示模式，不会伪装成云端存储。

## 1. 创建 CloudBase 环境

1. 在腾讯云 CloudBase 控制台创建按量计费环境，地域建议选择上海。
2. 开通“身份认证、文档型数据库、云存储”。
3. 在身份认证中启用“邮箱 + 密码”，配置发件模板和允许访问的 Web 域名。
4. 创建数据库集合 `photos`，并按 `database-security-rules.json` 配置安全规则。
5. 云存储权限设置为“仅创建者可读写”，并允许正式网站域名访问。

## 2. 配置网页环境变量

将 `.env.example` 复制为 `.env.local`，填写：

- `NEXT_PUBLIC_TCB_ENV_ID`：CloudBase 环境 ID。
- `NEXT_PUBLIC_TCB_REGION`：环境地域，默认 `ap-shanghai`。
- `NEXT_PUBLIC_TCB_PUBLISHABLE_KEY`：CloudBase Web 可发布访问密钥。它用于识别 Web 应用，不是腾讯云 SecretKey。
- `DEEPSEEK_API_KEY`：仅服务端使用的视觉模型密钥。

不要把 `.env.local`、腾讯云 SecretId/SecretKey 或 DeepSeek API Key 提交到 GitHub。

## 3. 数据模型

每张照片分为两部分：

- 云存储：原始图片，路径固定为 `users/{uid}/photos/...`。
- `photos` 集合：文件 ID、评分、质量维度、语义标签、EXIF 摘要和处理状态。

每条数据库记录都包含 `userId`。前端查询会带当前账号 UID，数据库安全规则再次校验 `doc.userId == auth.uid`，避免只依赖页面过滤。

建议为 `photos` 创建组合索引：`userId` 升序 + `createdAt` 降序。

## 4. 第三方登录

邮箱登录已经接入代码。微信登录可在 CloudBase 身份源中开通后，通过官方 OAuth 登录方法扩展。QQ、抖音通常需要各自开放平台应用、已备案域名、回调地址和审核资质，建议在完成域名备案后分阶段接入。

## 5. 上线检查

- 使用自有域名并完成 ICP 备案与 HTTPS。
- 在 CloudBase、DeepSeek 和部署平台分别配置生产环境变量。
- 将 AI 分析接口加入限流、配额、失败重试和审计日志。
- 设置云存储生命周期、数据库备份、告警与费用上限。
- 上线隐私政策、用户协议、账号注销和数据删除入口。
