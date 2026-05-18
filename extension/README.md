# Superalink eSIM Helper Chrome Extension

## 安装

1. 打开 Chrome 扩展程序页面。
2. 开启开发者模式。
3. 点击“加载已解压的扩展程序”。
4. 开发时选择项目根目录下的 `extension/`。
5. 分发时使用 `output/superalink-esim-extension.zip`。

## 开发

插件源码以 `extension/` 为准，`output/` 只保存打包产物。

```bash
rtk npm run extension:check
rtk npm run extension:pack
```

## 数据保存位置

订单数据保存在 Chrome 扩展的 `chrome.storage.local` 中，键名是：

```text
superalinkOrders
```

它跟随当前 Chrome 用户配置，不会写入项目里的 JSON 文件。发送给别人使用时，对方会保存到自己的 Chrome 本地配置里。

插件内“数据”页面提供导出和导入 JSON，便于备份或迁移。

## 使用流程

1. 点击扩展图标。
2. 点击“打开工具”。
3. 在“购买 eSIM”里选择目的地、币种、数量和邮箱供应商；数量代表要创建多少个独立邮箱和独立 checkout。
4. 点击“创建订单”。
5. 插件会按数量创建订单，显示邮箱、订单号和“打开付款页”按钮。
6. 手动点击“打开付款页”，在 Superalink checkout 页面完成当前订单付款。
7. 回到插件点击“已完成付款，开始收集”，插件会轮询该订单邮箱并保存 eSIM 信息。
8. 如果本批次还有未付款订单，继续点击“打开下一付款页”并重复确认收集。
9. 在“历史 eSIM”里复制 LPA 或打开二维码。

## 注意

- eSIM 二维码、LPA 和邮箱 token 都是敏感凭证。
- 不要把导出的订单 JSON 发给无关人员。
- MV3 扩展页不能加载 PayPal 远程 SDK，所以插件内只展示付款入口，付款在 Superalink checkout 页面完成。
