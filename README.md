# esim-auto

Superalink 注册和购买辅助工具。当前实现参考了 `kiro-auto` 的临时邮箱和邮件轮询思路，但去掉了批量并发、指纹伪装、风控规避这类高风险逻辑。

## 功能范围

- 自动申请临时邮箱，优先支持 `215.im`，也支持 `tempmail.lol` 和 `1secmail`
- 打开 Superalink 注册页，填写姓名和邮箱
- 等待注册邮件，解析创建密码链接或 `token`
- 打开创建密码页，设置密码
- 保存注册结果到 `output/superalink-accounts.json`
- 打开 `FRONT0000` affiliate 入口，进入指定目的地产品页
- 自动生成购买邮箱和账号密码，后台完成 Superalink 账号注册
- 自动创建 checkout、填写 eSIM 接收邮箱、勾选设备兼容确认，默认使用 THB
- 支付页交给人工处理人机验证和付款，支付后自动收集 eSIM 邮件并保存本地
- 提供自建 checkout Web 页面，可直接选目的地、套餐、数量和币种
- 自建 checkout 自动生成邮箱并写入订单，支付方式默认只展示 PayPal
- Alipay 会按官方接口探测，当前官方返回不可用时页面不展示

## 安装

```bash
rtk npm install
rtk npm run install-browser
```

## 配置

复制 `.env.example` 的配置项到你的 shell 环境或 `.env` 管理工具中。当前 CLI 不会主动读取 `.env` 文件，直接使用系统环境变量。

推荐配置 `YYDS_MAIL_API_KEY`。原因是公开临时邮箱域名容易被注册站点拦截，`215.im` 的稳定性通常更高，日志也更容易定位。

```bash
export YYDS_MAIL_API_KEY="你的 API Key"
export SUPERALINK_FIRST_NAME="Lee"
export SUPERALINK_LAST_NAME="Test"
```

## 注册使用

可见浏览器模式，便于观察页面状态：

```bash
rtk npm run register:superalink -- --headed --firstName Lee --lastName Test --debug
```

后台模式：

```bash
rtk npm run register:superalink -- --firstName Lee --lastName Test
```

使用已有邮箱：

```bash
rtk npm run register:superalink -- --email you@example.com --firstName Lee --lastName Test --headed
```

已有邮箱模式会提交注册页，然后等待你手动粘贴邮件里的创建密码链接或 token。也可以提前传入：

```bash
rtk npm run register:superalink -- --email you@example.com --firstName Lee --token "邮件里的 token"
```

指定密码：

```bash
rtk npm run register:superalink -- --firstName Lee --lastName Test --password 'Aa123456!'
```

## 购买使用

默认会自动生成邮箱和密码，后台注册 Superalink 账号，然后打开支付页。你只需要在浏览器里处理 Cloudflare 人机验证和真实付款。付款完成后，脚本会继续轮询邮箱，把 eSIM 邮件、账号密码、checkout URL、订单摘要和截图保存到本地。

```bash
rtk npm run purchase:superalink -- --country china-mainland --debug
```

默认货币是 THB。临时改美元可以传 `--currency USD`：

```bash
rtk npm run purchase:superalink -- --country china-mainland --currency USD
```

指定天数和数量：

```bash
rtk npm run purchase:superalink -- --country china-mainland --days 4 --qty 1
```

使用完整产品页：

```bash
rtk npm run purchase:superalink -- --productUrl "https://www.superalink.com/en/esim/china-mainland?affiliate_code=FRONT0000&duration=4&option=unlimited&promo=affiliate-influencer&utm_source=affiliate"
```

跳过后台账号注册，只做 guest checkout：

```bash
rtk npm run purchase:superalink -- --country china-mainland --skipRegisterAccount
```

邮箱访问令牌会写入 `output/superalink-purchases.json`，方便后续取回 voucher。

## 自建 checkout Web

### macOS / WSL 快速启动

推荐用项目根目录的 `start-local.sh` 启动本地 Web。脚本会自动检查 `node`、`npm`、依赖目录和端口占用，默认启动到 `53334` 端口，并自动带上 `--debug` 日志。

首次使用建议先给脚本加执行权限：

```bash
rtk chmod +x start-local.sh
```

启动默认服务：

```bash
rtk ./start-local.sh
```

默认访问：

```text
http://127.0.0.1:53334/
```

如果提示端口被占用，可以换一个端口：

```bash
rtk ./start-local.sh --port 53335
```

也可以继续透传 checkout 参数：

```bash
rtk ./start-local.sh --country CN --currency THB --mailProvider tempmail-lol
```

在普通 macOS 或 WSL 终端里，如果没有安装 `rtk`，把命令前面的 `rtk` 去掉即可。

停止服务：回到启动脚本的终端窗口，按 `Ctrl+C`。

### npm 原始启动

也可以直接使用 npm 脚本启动本地 Web 服务：

```bash
rtk npm run checkout:superalink -- --debug
```

默认访问：

```text
http://127.0.0.1:53333/
```

页面流程：

- 选择目的地、套餐、数量和币种
- 点击创建订单
- 服务端自动生成邮箱和本地密码
- 服务端创建 Superalink 官方 checkout，并把邮箱写入订单
- 页面加载 PayPal Buttons
- 支付提交后服务端轮询邮箱并保存 eSIM 邮件信息
- 页面右侧可输入本工具生成过的邮箱，查询最新 2 条邮件和验证码

默认参数：

- 优惠码：`FRONT0000`
- 币种：`THB`
- 默认目的地：`CN`
- 默认套餐：中国大陆 5GB/day 5 天
- 本地记录：`output/superalink-web-purchases.json`

可调整启动参数：

```bash
rtk npm run checkout:superalink -- --port 53334 --country CN --currency THB --mailProvider tempmail-lol --debug
```

PayPal Buttons 默认使用当前 Superalink 前端公开的 client id。你也可以显式覆盖：

```bash
export SUPERALINK_PAYPAL_CLIENT_ID="你的 PayPal client id"
```

当前官方接口对 `paymentMethod=alipay` 返回 `Invalid payment method`，所以页面不会展示 Alipay。后续官方支持并返回可跳转支付信息时，页面会按探测结果展示。

邮箱邮件查询只支持本地记录中带访问 token 的邮箱，例如自建 checkout 生成的 `tempmail.lol` 邮箱。只输入 Gmail、Outlook 或其他没有 token 的邮箱，服务端无法读取收件箱。

## 合规边界

这个工具只做单账号注册、邮箱填写、支付页等待和支付后邮箱信息收集。遇到 CAPTCHA、人机验证、支付风控、短信校验或账号安全检查时，会停止或等待人工处理，并输出可定位日志。购买脚本不会自动点击最终扣款动作。
