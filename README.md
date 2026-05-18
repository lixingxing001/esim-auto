# esim-auto

Superalink eSIM Chrome 插件工具。当前主开发面是 `extension/`，用于创建 Superalink checkout、生成临时邮箱、保存订单历史，并在用户确认真实付款后收集 eSIM 邮件。

## 当前主线

- Chrome 插件源码目录：`extension/`
- Chrome 插件显示名：`Superalink eSIM Helper - Chrome`
- Chrome 插件显示版本：`1.0.0 LEE000000 release`
- 插件压缩包产物：`output/superalink-esim-extension.zip`
- 订单保存位置：Chrome 扩展的 `chrome.storage.local`
- 订单保存键名：`superalinkOrders`
- 默认优惠码：`LEE000000`
- 默认 Affiliate Code：`LEE000000`
- 默认币种：`THB`
- 本地 Web checkout 已废弃，不再作为主要开发入口

## 插件功能

- 选择目的地、套餐、数量、币种和邮箱供应商
- 数量代表独立订单数，例如 `3` 会创建 3 个邮箱和 3 个独立 checkout
- 每个 checkout 固定 `qty=1`，并写入对应邮箱
- 顺序打开付款页，避免多个 checkout 共用 Chrome session 时互相覆盖
- 用户真实付款后点击“已完成付款，开始收集”
- 插件轮询对应临时邮箱，解析并保存 eSIM 邮件里的二维码、LPA、ICCID 和激活链接
- 历史页展示订单和 eSIM 信息
- 历史页支持按全部、待付款、待收集、已收集、异常筛选订单
- 历史页支持作废订单，作废后从历史列表和邮箱查询下拉隐藏，导出 JSON 仍保留记录
- 套餐列表读取官方 coupon API；`LEE000000 / TIERED_V1` 按天数阶梯做预计优惠价，订单创建后以 checkout 返回金额为最终金额
- 可一键推荐当前目的地下人民币等价总价最低的套餐和币种，推荐只负责选中，不会自动创建订单
- 主要下拉框使用自定义动效下拉，避免浏览器原生下拉样式不一致
- 数据页支持导入、导出订单 JSON

## 安装依赖

```bash
rtk npm install
```

如仍需运行历史 CLI 浏览器流程，再安装 Playwright 浏览器：

```bash
rtk npm run install-browser
```

## 开发和打包

检查插件 JS 语法：

```bash
rtk npm run extension:check
```

从 `extension/` 生成插件 zip：

```bash
rtk npm run extension:pack
```

项目 TypeScript 检查：

```bash
rtk npm run check
```

## Chrome 安装

开发时加载源码目录：

1. 打开 Chrome 扩展程序页面。
2. 开启开发者模式。
3. 点击“加载已解压的扩展程序”。
4. 选择项目里的 `extension/` 目录。

分发时使用：

```text
output/superalink-esim-extension.zip
```

## 使用流程

1. 点击扩展图标。
2. 点击“打开工具”。
3. 在“购买 eSIM”里选择目的地、币种、数量和邮箱供应商。
4. 点击“创建订单”。
5. 插件会按数量创建独立订单，并显示邮箱、订单号和付款按钮。
6. 点击“打开付款页”，在 Superalink checkout 页面完成当前订单付款。
7. 回到插件点击“已完成付款，开始收集”。
8. 如果还有下一单，继续点击“打开下一付款页”并重复付款和收集。
9. 在“历史 eSIM”里复制 LPA 或打开二维码。

## 配置

当前 Chrome 插件只直接支持：

- `tempmail.lol`
- `1secmail`

后续如接入 `215.im`，需要配置 `YYDS_MAIL_API_KEY` 或等价 API key，并在插件设置页中保存。不要把密钥写入代码仓库。

## 历史 CLI

以下命令属于历史能力，保留用于排障或对照，不再作为主要购买入口：

```bash
rtk npm run register:superalink -- --firstName Lee --lastName Test
rtk npm run purchase:superalink -- --country china-mainland --debug
rtk npm run checkout:superalink -- --debug
```

`start-local.sh` 和 `checkout:superalink` 对应的本地 Web checkout 已废弃；新增能力优先进入 `extension/`。

## 合规边界

这个工具只做订单创建、邮箱填写、真实付款后的邮件收集和本地保存。遇到 CAPTCHA、人机验证、支付风控、短信校验或账号安全检查时，需要人工处理。项目不加入浏览器指纹伪装、自动绕过风控或 IP 轮换逻辑。
