# Superalink 注册辅助进度

## V0.1.0

时间：2026-05-11

已确认：

- `esim-auto` 当前目录为空，需要初始化 TypeScript CLI 项目。
- `kiro-auto` 的邮箱逻辑主要在 `lib/register.ts`，包含临时邮箱申请、邮件轮询和验证码解析。
- Superalink 注册页是 Next.js 应用，注册入口为 `/en/register`。
- 前端注册链路会先检查 `users/email/availability`，再通过 `users/otp` 发送注册邮件。
- 设置密码阶段会把邮件中的 `issuance_token` 提交给 `users/claim`。

实现决策：

- 采用浏览器自动化走 Superalink 可见页面，降低接口逆向耦合。
- 只支持单账号注册辅助，不做批量并发和指纹伪装。
- 邮件模块独立封装，后续可扩展其他邮箱供应商。

待验证：

- 实际注册邮件中的链接格式。
- Superalink 是否拦截公开临时邮箱域名。

验证记录：

- `rtk npm run check` 已通过。
- V0.2 历史冒烟已走到付款前，保存 checkout URL 和付款前截图。
- V0.2 历史冒烟已验证数量参数生效，checkout 摘要显示 `2 item(s)`。
- `rtk npm run install-browser` 已安装 Playwright 所需 Chromium 和 Headless Shell。
- 页面探测确认预置 `NEXT_LOCALE=en` 和 `is_locale_checked=true` 后能稳定停留在 `/en/register`，输入框为 `First name`、`Last name (optional)`、`Email`。
- `tempmail.lol` 邮箱创建已验证成功。

## V0.2.0

时间：2026-05-11

已确认：

- 正确 affiliate 入口为 `https://www.superalink.com/destination/aff/FRONT0000`，会跳转到 `/en/destination/aff/FRONT0000`。
- 页面会写入 `affiliate_code=FRONT0000`，并展示 `$5 OFF` 相关弹窗。
- 产品页会通过 `POST https://storefront.api.superalink.com/v2/checkout` 创建 checkout 订单。
- checkout 页邮箱输入框为 `#email-form`，设备兼容确认框为 `#compatibility-toggle`。
- checkout 页加载 Cloudflare Turnstile 和 Stripe iframe，最终支付按钮文案为 `Pay Now`。

实现决策：

- 新增 `purchase:superalink` 命令，注册逻辑和购买逻辑分开维护。
- 购买流程默认走 affiliate 入口，再进入指定产品页，保证折扣由官网链路写入。
- 真实支付默认人工处理，脚本只填邮箱、勾选设备兼容确认并停在 `Pay Now` 前。
- V0.2 阶段曾支持手动邮箱测试模式，V0.3 已调整为默认自动邮箱。
- 购买结果保存到 `output/superalink-purchases.json`，付款前截图保存到 `output/screenshots`。

待验证：

- 不同国家和套餐的 URL 参数是否都能稳定映射到正确 SKU。
- Cloudflare Turnstile 对无界面浏览器的影响范围。

## V0.3.0

时间：2026-05-11

已确认：

- Lee 要求新建 eSIM 时，用户侧只看到支付页。
- 邮箱需要脚本自动生成并填写。
- 默认支付货币改为 THB。
- Cloudflare Turnstile 或支付风控由人工在浏览器处理。
- 支付完成后需要把邮箱、密码、eSIM 信息保存到本地。

实现决策：

- `purchase:superalink` 默认自动创建邮箱，不再要求 `--email`。
- 默认生成账号密码，并在支付前后台完成 Superalink 账号注册。
- 默认打开有界面浏览器，便于人工处理人机验证和真实支付。
- 支付后自动轮询邮箱，解析 Superalink eSIM 邮件中的 URL、图片地址、手动安装码和订单号。
- 本地结果保存邮箱访问令牌、生成密码、账号注册结果、checkout URL、订单摘要、支付后截图和 eSIM 邮件信息。

待验证：

- 真实付款后的邮件格式是否包含 QR 图片、手动安装码或仅包含 voucher 链接。
- 部分邮箱供应商的公开域名是否会被 Superalink 拦截。

验证记录：

- `rtk npm run check` 已通过。
- 邮件解析器样例已验证，可提取 voucher URL、QR 图片地址、LPA 手动安装码和订单号。
- `--email` 参数已做拦截冒烟，当前新建 eSIM 流程要求自动邮箱。

## V0.4.0

时间：2026-05-11

已确认：

- Superalink affiliate 入口会弹出 `Claim Discount` 优惠弹窗。
- Lee 要求脚本自动领取该优惠，用户侧只在付款阶段介入。
- 优惠必须在支付前确认，避免人工付款时实际没有应用 `FRONT0000`。

实现决策：

- 购买流程在 affiliate 页和产品页都会尝试处理 Cookie 横幅并点击 `Claim Discount`。
- 点击弹窗后读取 `affiliate_code`、`coupon_applied`、`showed_coupon` Cookie，确认优惠状态。
- 若官网按钮没有及时写完整状态，会补齐当前浏览器会话中的优惠 Cookie，保证后续 checkout 使用 `FRONT0000`。
- 进入 checkout 后读取订单摘要，必须出现 `Coupon FRONT0000` 才允许继续停在 `Pay Now` 前。
- 默认 THB 流程会额外校验 checkout 摘要中存在泰铢符号 `฿`。
- 如果 checkout 摘要没有显示 `Coupon FRONT0000`，脚本会在支付前报错停止，防止错误付款。

待验证：

- 不同国家和套餐是否都在 checkout 摘要中保持相同的 `Coupon FRONT0000` 文案。
- 官网如果调整优惠 Cookie 名称，需要同步更新 `purchase.ts` 中的优惠状态校验。

验证记录：

- `rtk npm run check` 已通过。
- Headless 无支付冒烟已走到 checkout 页，当前 smoke 记录显示 `Coupon FRONT0000 - ฿175`、`Total ฿25`。

## V0.5.0

时间：2026-05-11

已确认：

- 参考项目 `mhan24/superalink-checkout-tool` 使用自建页面创建 Superalink 官方 checkout。
- 官方接口 `paymentMethod=paypal` 在 THB 和 USD 下可创建 PayPal intent。
- 官方接口 `paymentMethod=alipay` 在 THB、CNY、USD 下返回 `Invalid payment method`。
- Lee 要求页面重新设计为简约高级，用户侧只保留 PayPal，Alipay 仅在官方支持时展示。

实现决策：

- 新增 `checkout:superalink` 命令启动本地 Web 服务。
- 新增 `checkout-web.ts` 管理官方产品目录、checkout 创建、邮箱写入、PayPal intent、capture 和支付后邮件收集。
- 新增 `checkout-web-page.ts` 渲染简约页面，首屏为目的地、套餐、数量、币种和订单摘要。
- 默认仍使用 `FRONT0000` 和 `THB`，默认目的地为 `CN`。
- 服务端自动创建邮箱并生成本地密码，订单创建后写入 `voucherRecipientEmail`。
- 前端只公开短期 token，订单 session、邮箱访问令牌和 PayPal intent 保存在服务端内存和本地记录中。
- Alipay 按订单创建阶段探测，当前探测失败时不展示按钮。
- 支付提交后服务端后台轮询 eSIM 邮件，结果写入 `output/superalink-web-purchases.json`。

待验证：

- 真实 PayPal 授权后 Superalink capture 返回结构。
- 真实支付后 eSIM 邮件到达时间和邮件格式。
- 长时间运行时 token 过期和后台邮件轮询是否符合预期。

验证记录：

- `rtk npm run check` 已通过。
- 本地服务冒烟已通过，`/api/catalog?countryCode=CN` 返回 8 个套餐。
- `POST /api/checkout/create` 已验证可创建 THB 订单，自动邮箱写入成功，返回金额 `฿25.00`。
- `POST /api/paypal/create` 已验证可创建 PayPal order，`preCaptureOk=true`。
- Playwright 已截图验证首页非空、套餐列表为 8 项、PayPal 可见、Alipay 隐藏。

## V0.6.0

时间：2026-05-11

已确认：

- Lee 需要在自建 checkout 页面输入邮箱并查看 Superalink 验证码或最新邮件。
- 临时邮箱读取需要本地保存的访问 token，仅凭邮箱地址不能读取收件箱。

实现决策：

- 新增 `/api/mail/latest` 接口，按邮箱查找当前内存 session 和本地 purchase 记录里的 mailbox token。
- 页面右侧新增“邮箱邮件查询”区域，输入邮箱后展示最新 2 条邮件。
- 邮件摘要包含发件人、标题、接收时间、自动提取的验证码、正文摘要和最多 2 个链接。
- 未找到本地 token 时返回明确错误，避免误导为可查询任意邮箱。

验证记录：

- `rtk npm run check` 已通过。
- 使用本地生成邮箱调用 `/api/mail/latest` 成功，当前收件箱可访问且邮件数为 0。
- Playwright 已截图验证页面新增邮件查询面板，截图为 `output/screenshots/superalink-web-mail-lookup.png`。

## V0.6.1

时间：2026-05-11

已确认：

- Lee 要求支付区只保留 PayPal SDK 的品牌按钮。
- 页面不再展示自定义 PayPal 标签、Alipay 标签、信用卡按钮和备用“打开 PayPal”按钮。

实现决策：

- 移除页面自定义支付方式切换区域，订单摘要固定展示 `PayPal`。
- PayPal SDK 加载参数增加 `disable-funding=card,credit,paylater,venmo`。
- PayPal Buttons 固定 `fundingSource=paypal`，减少 SDK 自动扩展出多余支付入口的概率。

验证记录：

- `rtk npm run check` 已通过。
- Playwright 已验证 `methodTabs`、`paypalTab`、`alipayTab`、`paypalFallback` 均不存在。
- 支付区截图已保存为 `output/screenshots/superalink-web-paypal-single-button.png`。

## V0.7.0

时间：2026-05-11

已确认：

- Lee 反馈点击“创建订单”时交互太生硬，需要明确 loading 效果。
- Lee 完成真实支付后，页面只提示“eSIM 邮件已收集，本地记录已保存”，不利于直接使用二维码、LPA 和邮箱信息。
- 刚刚支付的记录已经保存到 `output/superalink-web-purchases.json`，不能在新增历史能力时丢失。

实现决策：

- 创建订单按钮新增 spinner、`创建中` 文案和 `aria-busy` 状态，请求期间禁用按钮，避免重复创建订单。
- 新增 `/api/checkout/history` 和 `/api/checkout/history/detail`，读取现有本地 JSON 记录，并合并当前内存 session 的最新状态。
- 历史接口只返回页面需要的安全字段，避免把邮箱访问 token、buyer session 和 PayPal 原始 capture 对象直接暴露给前端。
- 页面右侧新增 eSIM 信息面板，展示邮箱、订单、SKU、金额、Checkout 链接、二维码、LPA、ICCID、激活链接和邮件摘要。
- 页面右侧新增历史记录列表，默认加载最近记录，支付后自动刷新，并打开当前 eSIM 详情。
- 二维码识别会过滤 Superalink logo、指南图、设备图和营销图，只展示疑似真实 QR 图片。
- LPA 展示会从邮件 URL 和手动安装码中统一提取，并清理 `&os=ios` / `&os=android` 这类 URL 参数。

验证记录：

- `rtk npm run check` 已通过。
- `/api/checkout/history?limit=3` 已确认刚刚支付的记录在第一条，状态为 `esim_received`。
- `/api/checkout/history/detail` 已确认能返回真实 QR 图片、LPA、ICCID 和激活链接。
- Playwright 已验证页面历史记录 6 条，最近收集记录自动打开，邮箱、LPA、二维码和 ICCID 均可见。

## V0.8.0

时间：2026-05-11

已确认：

- Lee 反馈历史记录、邮件查询和 eSIM 详情都堆在购买页下方，页面纵向过长。
- 购买页需要作为首页，历史 eSIM 和邮箱查询需要独立入口。
- 套餐列表默认最多展示 5 个，其余通过“查看更多”展开。
- 历史 eSIM 详情已有独立菜单页，可以重新设计成更适合安装使用的详情布局。

实现决策：

- 页面改为左侧菜单导航，包含“购买 eSIM”“历史 eSIM”“邮箱查询”三个视图。
- 购买页只保留套餐选择、订单摘要、创建订单、PayPal 和当前流程状态。
- 套餐列表新增折叠逻辑，默认展示 5 个，点击“查看更多”展示全部，再点击“收起”恢复。
- 历史 eSIM 页拆成记录列表和详情区域，默认打开最近一条已收集成功的 eSIM。
- eSIM 详情改为二维码优先展示，LPA、ICCID、订单、激活链接和 Checkout 链接集中在右侧字段区。
- 邮箱查询迁移到独立菜单页，避免和历史记录混在同一条购买流程里。
- 支付收集完成后会自动切到历史 eSIM 页，并打开当前订单详情。

验证记录：

- `rtk npm run check` 已通过。
- Playwright 已验证购买页默认激活，套餐默认展示 5 个。
- Playwright 已验证“查看更多”后展示 7 个测试套餐，“收起”按钮出现。
- Playwright 已验证历史页显示 6 条记录，最近收集的 eSIM 默认打开，二维码、复制字段和邮箱可见。
- Playwright 已验证邮箱查询页可从左侧菜单单独进入。

## V0.9.0

时间：2026-05-11

已确认：

- Lee 反馈历史 eSIM 记录列表太窄，订单和 SKU 换行过多，扫描效率差。
- 历史记录区域滚动条视觉粗糙。
- eSIM 详情里的完整激活链接拉长页面，安装核心信息被冲淡。

实现决策：

- 页面最大宽度从 `1160px` 扩到 `1400px`，历史页在桌面端获得更宽详情区。
- 历史页记录列表固定到 `420px` 到 `480px` 范围，记录卡片改为邮箱、金额时间、SKU 状态、订单号四层信息。
- 历史列表增加 Chromium 和 Firefox 的细滚动条样式。
- eSIM 详情把 iOS / Android 激活链接改成短按钮卡片，保留打开和复制，不在主区域展示完整 URL。
- Checkout、产品页、激活原始 URL 和参考链接放入折叠区，减少主详情高度。

验证记录：

- `rtk npm run check` 已通过。
- Playwright 桌面端验证历史列宽 `480px`，详情列宽 `660px`。
- Playwright 验证激活链接按钮为 2 个，主区域不再展示长激活链接行。
- Playwright 移动端验证历史页无横向溢出。

## V1.0.0

时间：2026-05-11

已确认：

- Lee 要求将工具做成 Chrome 插件，便于在浏览器中快速使用。
- Lee 要求订单数据使用 `chrome.storage.local` 保存。
- Lee 要求成品单独放在 `output` 目录，便于发给别人使用。

实现决策：

- 新增 `output/superalink-esim-extension/` 作为可加载的 MV3 插件目录。
- 插件 popup 提供最近 eSIM 快速复制和打开完整工具页。
- 插件完整页提供“购买 eSIM”“历史 eSIM”“邮箱查询”“数据”四个视图。
- 订单数据保存到 `chrome.storage.local` 的 `superalinkOrders` 键。
- 插件不依赖本地 Node 服务，创建 checkout、创建临时邮箱、读取临时邮箱都在扩展页内完成。
- MV3 扩展页不能加载 PayPal 远程 SDK，付款阶段改为打开 Superalink 官方 checkout 页面。
- 数据页面提供导出和导入 JSON，便于备份或迁移 Chrome 本地存储里的订单。
- 生成 `output/superalink-esim-extension.zip`，便于分发。

验证记录：

- `rtk node --check` 已通过 `app.js`、`popup.js` 和 `background.js`。
- Playwright 使用 `chrome.storage.local` mock 验证插件完整页可打开。
- Playwright 验证套餐默认展示 5 个，点击“查看更多”后展示 7 个测试套餐。
- `unzip -l output/superalink-esim-extension.zip` 已确认压缩包包含 9 个插件文件。

## V1.1.0

时间：2026-05-11

已确认：

- Lee 反馈 Chrome 插件界面和 `http://127.0.0.1:53334/` 差异过大。
- Lee 反馈插件创建订单后直接跳转 Superalink 官方页面，操作预期不一致。

实现决策：

- 插件完整页增加顶部品牌栏，左侧菜单保留“本地工具”结构，购买页风格继续贴近本地 Web 页面。
- “创建订单并打开付款页”改为“创建订单”。
- 创建订单成功后停留在插件内，展示邮箱、订单号、“打开付款页”“复制邮箱”“去邮箱查询”按钮。
- 只有用户点击“打开付款页”时才调用 `chrome.tabs.create` 打开 Superalink checkout。
- README 同步更新插件使用流程，说明插件内展示付款入口，付款在 checkout 页面完成。

验证记录：

- `rtk node --check` 已通过 `app.js`、`popup.js` 和 `background.js`。
- Playwright mock 验证创建订单后 `tabs.create` 调用次数为 0。
- Playwright mock 验证点击“打开付款页”后 `tabs.create` 调用次数为 1。
- `rtk npm run check` 已通过。
- `unzip -l output/superalink-esim-extension.zip` 已确认压缩包已重新生成。

## V1.2.0

时间：2026-05-11

已确认：

- Lee 反馈本地页和 Chrome 插件刚开始读取套餐时，旧文字 loading 体验生硬。
- 本地页面和插件完整页都需要在套餐接口返回前先展示占位结构。

实现决策：

- 本地页面和 Chrome 插件都将“正在读取套餐”替换为 5 条套餐骨架屏。
- 首屏 HTML 直接带骨架结构，避免脚本执行前出现旧文字闪烁。
- 切换目的地重新读取套餐时复用 `renderPlanSkeletons()`，列表区域高度更稳定。
- 骨架动画遵守 `prefers-reduced-motion`，系统减少动态效果时停止 shimmer。
- 套餐加载入口增加 `console.debug` 日志，便于测试时确认加载链路触发。

验证记录：

- `rtk npm run check` 已通过。
- `rtk node --check output/superalink-esim-extension/app.js` 已通过。
- `rtk node --check output/superalink-esim-extension/popup.js` 已通过。
- `rtk node --check output/superalink-esim-extension/background.js` 已通过。
- Playwright mock 验证本地页桌面视口加载期间显示 5 条骨架，接口返回后展示 5 个折叠套餐。
- Playwright mock 验证插件页桌面视口加载期间显示 5 条骨架，接口返回后展示 5 个折叠套餐。
- Playwright mock 验证本地页和插件页移动视口加载期间显示 5 条骨架，接口返回后展示 5 个折叠套餐。
- `unzip -l output/superalink-esim-extension.zip` 已确认压缩包包含 9 个插件文件。

## V1.3.0

时间：2026-05-11

已确认：

- Lee 要求目的地下拉列表增加中文和国旗图标。
- 当前订单区域也需要显示国旗和中文目的地，提高识别速度。
- 页面切换、下拉框、邮箱邮件、刷新按钮等交互需要更连贯的过渡和 loading 反馈。
- Chrome 插件安装后需要真实图标，不能只显示浏览器默认首字母。

实现决策：

- 本地页面和 Chrome 插件都为国家配置补充 `zhName` 和 `flag` 展示字段。
- 目的地下拉列表展示为“国旗 中文名 · 英文名 · 代码”。
- 当前订单标题和订单详情增加带国旗的目的地展示。
- 页面切换、菜单、套餐卡片、历史记录、邮件卡片、详情卡片、输入框和按钮增加克制过渡动画。
- 邮箱查询、插件收集邮件、查看最新邮件、手动解析、历史刷新增加按钮 loading 状态和必要调试日志。
- 邮箱读取失败时清理骨架屏并显示错误占位，避免用户误以为还在加载。
- 插件新增 `icons/icon-16.png`、`icons/icon-32.png`、`icons/icon-48.png`、`icons/icon-128.png` 和源 `icons/icon.svg`。
- `manifest.json` 增加 `icons` 和 `action.default_icon`，覆盖扩展管理页和工具栏图标。

验证记录：

- `rtk npm run check` 已通过。
- `rtk node --check output/superalink-esim-extension/app.js` 已通过。
- `rtk node --check output/superalink-esim-extension/popup.js` 已通过。
- `rtk node --check output/superalink-esim-extension/background.js` 已通过。
- `manifest.json` 已通过 JSON 解析校验。
- `file` 已确认 4 个插件 PNG 图标分别为 16、32、48、128 尺寸。
- Playwright mock 验证本地页目的地下拉包含 `🇨🇳 中国大陆 · China Mainland · CN`。
- Playwright mock 验证插件页目的地下拉包含 `🇨🇳 中国大陆 · China Mainland · CN`。
- Playwright mock 验证本地页和插件页当前订单标题展示国旗、中文和英文目的地。
- Playwright mock 验证本地页邮箱查询按钮点击后出现 2 条邮件骨架。
- Playwright mock 验证插件页查看最新邮件按钮点击后出现 3 条邮件骨架。
- `unzip -l output/superalink-esim-extension.zip` 已确认压缩包包含 14 个插件文件和图标资源。

## V1.3.6

时间：2026-05-11

已确认：

- Lee 需要一个 macOS 和 WSL 可用的本地快速启动脚本。
- Windows 原生命令行先不纳入范围。
- 启动教程需要写入 README。

实现决策：

- 新增 `start-local.sh`，使用 POSIX `sh` 写法，兼容 macOS 和 WSL。
- 默认端口为 `53334`，默认追加 `--debug`，便于测试时直接看日志。
- 启动前检查 `node`、`npm`、依赖目录和端口占用。
- 端口被占用时只提示占用信息和换端口示例，不自动结束已有进程。
- 支持透传 checkout 参数，例如 `--port`、`--country`、`--currency`、`--mailProvider`。
- README 增加 macOS / WSL 快速启动教程，并保留 npm 原始启动方式。

验证记录：

- `rtk sh -n start-local.sh` 已通过。
- `rtk ./start-local.sh` 已验证可启动 `http://127.0.0.1:53334/`。
- `rtk ./start-local.sh --port 53333` 已验证端口占用提示可用。
