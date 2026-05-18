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

## V1.4.0

时间：2026-05-18

已确认：

- Lee 明确要求 Chrome 插件里的购买数量代表所选套餐的独立购买份数。
- 输入 `3` 时应创建 3 个邮箱和 3 个独立套餐订单，而不是一个 checkout 内的 `qty=3`。
- 插件付款后不需要自动判断页面支付状态，用户会在真实付款后点击确认按钮，再触发邮件收集。

实现决策：

- Chrome 插件创建订单时按数量循环创建独立 checkout，每个 checkout 固定 `qty=1`。
- 每个 checkout 单独创建临时邮箱，并把该邮箱写入 `voucherRecipientEmail`。
- 当前订单面板展示本批次订单列表、邮箱和订单号。
- 付款页按订单顺序打开，避免多个 checkout 共用 Chrome Cookie 时互相覆盖 session。
- 点击“打开付款页”后按钮切换为“已完成付款，开始收集”。
- 用户确认付款后，插件轮询当前订单邮箱，解析到 eSIM 邮件后保存到 `chrome.storage.local`。
- 本批次还有未付款订单时，收集完成后按钮恢复为“打开下一付款页”。

验证记录：

- `rtk node --check output/superalink-esim-extension/app.js` 已通过。
- `rtk node --check output/superalink-esim-extension/popup.js` 已通过。
- `rtk node --check output/superalink-esim-extension/background.js` 已通过。
- `manifest.json` 已通过 JSON 解析校验。
- `rtk npm run check` 已通过。
- 已通过 PowerShell `Compress-Archive` 重新生成 `output/superalink-esim-extension.zip`。
- `unzip -l output/superalink-esim-extension.zip` 已确认压缩包包含 14 个插件文件。

## V1.5.0

时间：2026-05-18

已确认：

- Lee 要求 Chrome 插件成为后续主要开发项目。
- 之前的本地 Web checkout 不再作为主开发入口。
- 不引入浏览器指纹伪装、IP 轮换或风控绕过逻辑。

实现决策：

- 新增 `extension/` 作为 Chrome 插件源码目录。
- `output/` 改为插件 zip 等产物目录。
- 新增 `scripts/pack-extension.mjs`，使用 Node 内置能力从 `extension/` 打包 zip，不依赖系统 `zip` 命令。
- 新增 npm 脚本 `extension:check` 和 `extension:pack`。
- README 改为插件主线文档，历史 CLI 和本地 Web checkout 只作为废弃/对照入口保留。

验证记录：

- `rtk npm run extension:check` 已通过。
- `extension/manifest.json` 已通过 JSON 解析校验。
- `rtk npm run extension:pack` 已通过，生成 `output/superalink-esim-extension.zip`。
- `rtk npm run check` 已通过。
- `unzip -l output/superalink-esim-extension.zip` 已确认压缩包包含 14 个插件文件。
- `unzip -p output/superalink-esim-extension.zip app.js | rg ...` 已确认 zip 内包含 `qty: 1`、付款后收集和“打开下一付款页”逻辑。

## V1.5.1

时间：2026-05-18

已确认：

- Lee 反馈 Chrome 扩展页里 `Superalink eSIM Helper 0.1.0` 与旧插件难以区分。
- 新版需要在 Chrome 扩展管理页可直接识别。

实现决策：

- 插件 manifest 的 `name` 改为 `Superalink eSIM Helper - Chrome`。
- 插件 manifest 的 `version` 改为 `1.5.1`。
- 插件 manifest 新增 `version_name` 为 `1.5.1 Chrome mainline`，用于展示层面区分新版。
- 同步历史解压产物目录的 `manifest.json`，避免误加载旧产物目录时仍显示旧名称和版本。

验证记录：

- `rtk ./test-extension.sh` 已通过。
- `extension/manifest.json` 和 `output/superalink-esim-extension/manifest.json` 已通过 JSON 解析校验。
- `unzip -p output/superalink-esim-extension.zip manifest.json` 已确认 zip 内显示名、`version` 和 `version_name` 已更新。

## V1.5.2

时间：2026-05-18

已确认：

- Lee 反馈切换币种后，左侧套餐列表价格没有同步切换到所选币种。

实现决策：

- 币种选择变化时不再只刷新右侧订单摘要。
- 新增币种相关刷新入口，同步刷新顶部币种提示、套餐卡片价格和右侧订单摘要。
- 插件 manifest 版本提升到 `1.5.2`，`version_name` 改为 `1.5.2 currency refresh fix`，便于在 Chrome 扩展页区分修复版。

验证记录：

- `rtk ./test-extension.sh` 已通过。
- `extension/manifest.json` 和 `output/superalink-esim-extension/manifest.json` 已通过 JSON 解析校验。
- `unzip -p output/superalink-esim-extension.zip app.js | rg ...` 已确认 zip 内币种 change 事件绑定到 `renderCurrencyDependentViews`。
- `unzip -p output/superalink-esim-extension.zip manifest.json` 已确认 zip 内版本为 `1.5.2 currency refresh fix`。

## V1.5.3

时间：2026-05-18

已确认：

- Lee 要求历史 eSIM 列表增加“作废”按钮。
- 点击作废后，该订单不再在历史 eSIM 列表展示。
- 页面中按钮点击交互需要更丝滑和连贯。

实现决策：

- 使用软作废，不物理删除订单数据。
- 订单作废时写入 `voidedAt`，并更新 `updatedAt`。
- 历史 eSIM 列表只展示未作废订单。
- 邮箱查询下拉同步隐藏已作废订单，避免历史页和邮箱页状态不一致。
- 历史行从整行按钮改为“行容器 + 选择按钮 + 作废按钮”，避免按钮嵌套导致点击事件串扰。
- 全局按钮、文件按钮、套餐卡片、历史选择和作废按钮增加按压反馈与轻量涟漪动效，并保留 `prefers-reduced-motion` 降级。
- 插件 manifest 版本提升到 `1.5.3`，`version_name` 改为 `1.5.3 void history order`。

验证记录：

- `rtk ./test-extension.sh` 已通过。
- `rtk npm run check` 已通过。
- `extension/manifest.json` 和 `output/superalink-esim-extension/manifest.json` 已通过 JSON 解析校验。
- `unzip -p output/superalink-esim-extension.zip app.js | rg ...` 已确认 zip 内包含 `voidOrder`、`visibleOrders`、`bindButtonFeedback` 和作废按钮绑定。
- `unzip -p output/superalink-esim-extension.zip app.css | rg ...` 已确认 zip 内包含作废按钮和按钮动效样式。
- `unzip -p output/superalink-esim-extension.zip manifest.json` 已确认 zip 内版本为 `1.5.3 void history order`。

## V1.5.4

时间：2026-05-18

已确认：

- Lee 要求历史 eSIM 列表增加必要状态筛选。
- 所有下拉框需要美化，展开时要有更丝滑的动画。
- 作废按钮不再弹确认框，改为第一次点击变成“确认作废”，第二次点击直接作废。

实现决策：

- 历史列表增加状态筛选：全部、待付款、待收集、已收集、异常。
- 状态筛选只作用于未作废订单；作废订单继续隐藏。
- 作废交互改为二次点击确认，移除 `window.confirm` 弹框。
- 原生 `<select>` 保留为真实值和事件来源，但视觉层升级为自定义下拉，统一样式并增加展开动画。
- 自定义下拉覆盖目的地、币种、邮箱供应商、邮箱查询历史订单。
- 插件 manifest 版本提升到 `1.5.4`，`version_name` 改为 `1.5.4 history filters`。

验证记录：

- `rtk ./test-extension.sh` 已通过。
- `rtk npm run check` 已通过。
- `unzip -p output/superalink-esim-extension.zip app.js | rg ...` 已确认 zip 内包含 `HISTORY_FILTERS`、`renderHistoryFilters`、`requestVoidOrder` 和 `enhanceSelectControls`。
- `unzip -p output/superalink-esim-extension.zip app.css | rg ...` 已确认 zip 内包含历史筛选、自定义下拉和“确认作废”样式。
- `unzip -p output/superalink-esim-extension.zip manifest.json` 已确认 zip 内版本为 `1.5.4 history filters`。

## V1.5.5

时间：2026-05-18

已确认：

- Lee 确认 `FRONT0000` 优惠看起来比 `LINK20` 更大。
- 官方条款明确单个产品只能使用一个 coupon，不能叠加 `FRONT0000` 和 `LINK20`。
- 插件默认继续使用 `FRONT0000`，不切换到 `LINK20`。

实现决策：

- 拆分 `DEFAULT_AFFILIATE_CODE` 和 `DEFAULT_COUPON`，当前默认值都为 `FRONT0000`。
- 移除旧的本地静态 `DISCOUNT_CAPS` 估算表。
- 加载套餐时请求官方 `GET /v2/coupons/FRONT0000`。
- 套餐列表使用官方 coupon 返回的 `cutPercentage` 或 `cutAmount` 做预计优惠价。
- 如果官方 coupon 读取失败，套餐列表退回官方原价，并给出 warn 状态。
- 创建 checkout 时继续传入 `coupon=FRONT0000`，订单保存 `affiliateCode`、`coupon`、`couponType` 和 `couponDescription`。
- 订单金额仍优先使用官方 checkout 返回的 `netPrice` / `prices.net`，预计价只作为 fallback。
- 插件 manifest 版本提升到 `1.5.5`，`version_name` 改为 `1.5.5 live coupon pricing`。

验证记录：

- `rtk npm run extension:check` 已通过。
- `rtk ./test-extension.sh` 已通过。
- `rtk npm run check` 已通过。
- `unzip -p output/superalink-esim-extension.zip app.js | rg ...` 已确认 zip 内包含 `DEFAULT_AFFILIATE_CODE`、`loadCoupon`、`normalizeCoupon` 和 `estimateCouponPrice`。
- `unzip -p output/superalink-esim-extension.zip manifest.json` 已确认 zip 内版本为 `1.5.5 live coupon pricing`。
- `unzip -p output/superalink-esim-extension.zip app.html | rg topStatus` 已确认顶部状态展示 `FRONT0000 / FRONT0000`。

## V1.5.6

时间：2026-05-18

已确认：

- Lee 反馈按钮点击动画有抖动感。
- 历史 eSIM 中间区域偏窄，订单状态筛选按钮容易换行，布局不够舒服。

实现决策：

- 去掉点击反馈里的位移和缩放 transform，避免与 hover transform 叠加造成抖动。
- 点击反馈保留轻量 brightness 和涟漪效果，维持操作反馈但不移动按钮位置。
- 外层工作区宽度从 `1400px` 放宽到 `1560px`。
- 左侧导航列略收窄，给主内容区让出更多空间。
- 历史 eSIM 左侧列表列宽从 `420-480px` 放宽到 `560-640px`。
- 历史状态筛选改为单行均分，并允许横向滚动兜底，避免按钮换行后视觉松散。
- 插件 manifest 版本提升到 `1.5.6`，`version_name` 改为 `1.5.6 smoother layout`。

验证记录：

- `rtk ./test-extension.sh` 已通过。
- `rtk npm run check` 已通过。
- `unzip -p output/superalink-esim-extension.zip app.css | rg ...` 已确认 zip 内包含放宽后的布局和去 transform 的点击动画。
- `unzip -p output/superalink-esim-extension.zip manifest.json` 已确认 zip 内版本为 `1.5.6 smoother layout`。

## V1.5.7

时间：2026-05-18

已确认：

- Lee 通过真实 checkout 截图反馈：12 Days 套餐官方显示 `¥98 - ¥36.25 = ¥61.75`。
- 插件列表错误显示 `¥11.00`，部分低价套餐错误显示 `¥0.00`。
- 根因是插件把 `FRONT0000` coupon API 返回的 `cutAmount ¥87` 直接当作当前产品实际折扣；但 checkout 对 `FRONT0000 / TIERED_V1` 实际按 flat-rate coupon 金额扣减。

实现决策：

- `PERCENTAGE_CUT` 继续使用官方 `cutPercentage`，例如 `LINK20` 仍按百分比估算。
- `AFFILIATED_INFLUENCER + TIERED_V1` 不再使用 coupon API 的 `cutAmount` 直接扣减。
- 对 `FRONT0000 / TIERED_V1` 使用与 checkout 实测一致的 flat-rate 金额表，例如 CNY `¥36.25`、THB `฿175`、USD `$5`。
- 套餐列表仍标记为预计价，订单创建后继续以官方 checkout 返回的 `netPrice` 为最终金额。
- 插件 manifest 版本提升到 `1.5.7`，`version_name` 改为 `1.5.7 flat coupon pricing`。

验证记录：

- 已用官方产品接口核对 CN 5GB Unlimited 套餐原价并按 CNY `¥36.25` 计算预计价，12 Days 从 `¥98.00` 得到 `¥61.75`。
- `rtk ./test-extension.sh` 已通过。
- `rtk npm run check` 已通过。
- `extension/manifest.json` 和 `output/superalink-esim-extension/manifest.json` 已通过 JSON 解析校验。
- `unzip -p output/superalink-esim-extension.zip app.js | rg ...` 已确认 zip 内包含 `FLAT_RATE_COUPON_AMOUNTS` 和 `TIERED_V1` 分支。
- `unzip -p output/superalink-esim-extension.zip manifest.json` 已确认 zip 内版本为 `1.5.7 flat coupon pricing`。

## V1.5.8

时间：2026-05-18

已确认：

- Lee 进一步反馈 `FRONT0000` 更像按天数阶梯优惠：5 天及以上 `$2 OFF`，7 天及以上 `$5 OFF`，15 天及以上 `$7 OFF`，20 天及以上 `$9 OFF`，30 天 `$12 OFF`。
- 之前 `1.5.7` 的固定 `$5 / ¥36.25` 只会让 7-14 天区间对齐真实 checkout；5/6 天会优惠过多，15/20/30 天会优惠不足。

实现决策：

- `AFFILIATED_INFLUENCER + TIERED_V1` 改为按套餐 `durationDays` 选择阶梯优惠，不再使用固定 flat-rate 金额。
- 阶梯优惠先按 USD 规则定义，再按当前 Superalink coupon 最大档可推导的币种比例换算：CNY `7.25`、THB `35`、SGD `1.35`、EUR/GBP `0.8`、JPY `155`、KRW `1350`、IDR `16000`。
- 保持列表金额为预计价；创建 checkout 后仍优先使用官方返回的 `netPrice` / `prices.net`。
- 插件 manifest 版本提升到 `1.5.8`，`version_name` 改为 `1.5.8 tiered coupon pricing`。

验证记录：

- 已用官方产品接口核对 CN 5GB Unlimited 套餐原价，并按阶梯规则计算预计 CNY：5 Days `¥28.50`，6 Days `¥36.50`，7 Days `¥22.75`，10 Days `¥46.75`，12 Days `¥61.75`，15 Days `¥70.25`，20 Days `¥91.75`，30 Days `¥135.00`。
- 已用官方 coupon 接口核对 `FRONT0000` 当前仍为 `AFFILIATED_INFLUENCER / TIERED_V1`，最大档返回 USD `12`、CNY `87`、THB `420`。
- `rtk npm run extension:check` 已通过。
- `rtk npm run extension:pack` 已通过。
- `rtk npm run check` 已通过。
- `rtk ./test-extension.sh` 已通过。
- `unzip -p output/superalink-esim-extension.zip app.js | rg ...` 已确认 zip 内包含 `FRONT_TIER_USD_DISCOUNTS`、`FRONT_TIER_USD_TO_CURRENCY_RATE` 和 `frontTierDiscountAmount`。
- `unzip -p output/superalink-esim-extension.zip manifest.json` 已确认 zip 内版本为 `1.5.8 tiered coupon pricing`。

已知坑位：

- `FRONT0000 / TIERED_V1` 的真实规则没有由 coupon API 直接返回完整阶梯，只能按官方 checkout 表现和 coupon 最大档推导。若 Superalink 再次调整活动，仍要以真实 checkout 摘要为最终准绳。

## V1.5.9

时间：2026-05-18

已确认：

- Lee 反馈套餐选中样式不明显，像点击后有 bug。
- 当前 hover 边框会覆盖 active 边框，导致选中态在悬浮时不稳定。

实现决策：

- 套餐选中态从普通边框改为深色左侧强调条、深色描边、独立阴影和浅背景。
- 价格区域增加“已选”标记，提升选中状态识别。
- 新增 `.plan-row.active:hover` 覆盖规则，确保 hover 不再覆盖选中态。
- 历史行 active 样式与套餐 active 样式拆分，避免互相影响。
- 插件 manifest 版本提升到 `1.5.9`，`version_name` 改为 `1.5.9 selected plan clarity`。

验证记录：

- `rtk ./test-extension.sh` 已通过。
- `rtk npm run check` 已通过。
- `unzip -p output/superalink-esim-extension.zip app.css | rg ...` 已确认 zip 内包含新的套餐 active、active hover 和“已选”标记样式。
- `unzip -p output/superalink-esim-extension.zip manifest.json` 已确认 zip 内版本为 `1.5.9 selected plan clarity`。

## V1.5.10

时间：2026-05-18

已确认：

- Lee 反馈套餐选中态里的“已选”文字太丑。
- Lee 希望改成右上角对号方式展示。

实现决策：

- 移除套餐价格区域的“已选”文字标签。
- 改为在选中套餐边框右上角显示深色对号角标。
- 保留左侧强调条、深色描边和 active hover 兜底规则。
- 插件 manifest 版本提升到 `1.5.10`，`version_name` 改为 `1.5.10 selected plan check`。

验证记录：

- `rtk ./test-extension.sh` 已通过。
- `rtk npm run check` 已通过。
- `unzip -p output/superalink-esim-extension.zip app.css | rg ...` 已确认 zip 内包含 `content: "✓"`，且不再包含 `content: "已选"`。
- `unzip -p output/superalink-esim-extension.zip manifest.json` 已确认 zip 内版本为 `1.5.10 selected plan check`。

## V1.5.11

时间：2026-05-18

已确认：

- Lee 截图反馈右上角对号过大，遮住套餐价格文字。

实现决策：

- 对号标识从大角块改为更小的圆形角标。
- 对号尺寸从 `30px x 26px` 调整为 `17px x 17px`。
- 角标位置从贴边 `-1px` 改为右上角内缩 `7px`。
- 选中套餐价格区增加 `padding-right: 18px`，为角标预留安全空间。
- 插件 manifest 版本提升到 `1.5.11`，`version_name` 改为 `1.5.11 compact plan check`。

验证记录：

- `rtk ./test-extension.sh` 已通过。
- `rtk npm run check` 已通过。
- `unzip -p output/superalink-esim-extension.zip app.css | rg ...` 已确认 zip 内包含新的小尺寸对号角标和价格右侧留白。
- `unzip -p output/superalink-esim-extension.zip manifest.json` 已确认 zip 内版本为 `1.5.11 compact plan check`。

## V1.5.12

时间：2026-05-18

已确认：

- Lee 希望增加一个推荐选择按钮，由插件在当前目的地下遍历所有套餐和所有可选币种，换算成人民币后自动选中更省钱的组合。
- 推荐只负责切换币种和选中套餐，不自动创建订单，避免误下单。

实现决策：

- 在购买页套餐列表上方增加 `推荐最划算` 按钮。
- 遍历当前目的地下的全部可见套餐和币种下拉框里的可选币种。
- 每个候选项先走现有 `priceFor`，即使用 `FRONT0000 / TIERED_V1` 优惠后的预计价，再用当前内置 USD/CNY/THB 等换算比例折算人民币。
- 推荐排序优先按人民币预计总价最低；总价几乎相同时，再按人民币日均成本更低排序。
- 点击推荐后同步更新币种下拉、选中套餐、套餐列表和摘要，并在购买状态中展示人民币约算值。
- 插件 manifest 版本提升到 `1.5.12`，`version_name` 改为 `1.5.12 best value selector`。

验证记录：

- `rtk npm run extension:check` 已通过。
- 已用官方 CN 产品接口做候选排序模拟，当前 CN 5GB 推荐结果为 `7 Days / THB`，预计 `฿101.00`，折合约 `¥20.92`。
- 已用 Playwright 加载插件页面并模拟点击 `推荐最划算`，确认会选中 `CN-5GB_UNLIMITED-5GB-7-DAYS`，币种切到 `THB`，摘要显示 `฿101.00`，状态显示约 `¥20.92`。
- `rtk npm run extension:pack` 已通过。
- `rtk npm run check` 已通过。
- `rtk ./test-extension.sh` 已通过。
- `unzip -p output/superalink-esim-extension.zip app.html | rg ...` 已确认 zip 内包含 `recommendPlanBtn`。
- `unzip -p output/superalink-esim-extension.zip app.js | rg ...` 已确认 zip 内包含推荐排序和人民币换算函数。
- `unzip -p output/superalink-esim-extension.zip manifest.json` 已确认 zip 内版本为 `1.5.12 best value selector`。

已知坑位：

- 人民币换算是插件内估算，不代表 PayPal、Stripe、银行卡或发卡行最终入账汇率。
- 当前只遍历币种下拉框中可以实际选中的币种；如果后续要支持 IDR 等更多币种，需要先确认 checkout 可用性并补充下拉选项。
