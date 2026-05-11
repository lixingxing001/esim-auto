# Superalink eSIM Helper Chrome Extension

## 安装

1. 打开 Chrome 扩展程序页面。
2. 开启开发者模式。
3. 点击“加载已解压的扩展程序”。
4. 选择本目录：`output/superalink-esim-extension`。

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
3. 在“购买 eSIM”里选择目的地、币种、数量和邮箱供应商。
4. 点击“创建订单”。
5. 插件会显示订单号、邮箱和“打开付款页”按钮。
6. 手动点击“打开付款页”，在 Superalink checkout 页面完成付款。
7. 回到插件“邮箱查询”，选择订单，点击“收集 eSIM 邮件”。
8. 在“历史 eSIM”里复制 LPA 或打开二维码。

## 注意

- eSIM 二维码、LPA 和邮箱 token 都是敏感凭证。
- 不要把导出的订单 JSON 发给无关人员。
- MV3 扩展页不能加载 PayPal 远程 SDK，所以插件内只展示付款入口，付款在 Superalink checkout 页面完成。
