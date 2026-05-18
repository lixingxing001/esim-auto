export type CheckoutCountryOption = {
  /** Superalink 商品接口使用的国家或区域代码。 */
  code: string
  /** 页面展示名称。 */
  name: string
  /** 中文展示名称，用于提高下拉列表和订单卡片辨识度。 */
  zhName: string
  /** 国旗或区域图标，用于快速识别目的地。 */
  flag: string
}

export type CheckoutPageConfig = {
  /** 服务端默认国家或区域代码。 */
  defaultCountryCode: string
  /** 默认结算币种。 */
  defaultCurrency: string
  /** 默认购买数量。 */
  defaultQuantity: number
  /** 默认优惠码。 */
  coupon: string
  /** PayPal 前端 SDK client id，公开值，只用于渲染 PayPal Buttons。 */
  paypalClientId: string
  /** 可选择的国家或区域。 */
  countries: CheckoutCountryOption[]
}

export function renderCheckoutPage(config: CheckoutPageConfig): string {
  const configJson = JSON.stringify(config)

  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Superalink Checkout</title>
  <style>
    :root {
      --bg: #f5f6f8;
      --panel: #ffffff;
      --panel-soft: #f0f3f7;
      --ink: #14171f;
      --muted: #667085;
      --line: #d7dde8;
      --accent: #111827;
      --paypal: #f6c557;
      --paypal-ink: #102342;
      --ok: #087443;
      --warn: #9a5b00;
      --bad: #b42318;
      --focus: #446cff;
    }

    * { box-sizing: border-box; }

    body {
      margin: 0;
      min-height: 100vh;
      background:
        linear-gradient(180deg, rgba(255,255,255,.85), rgba(245,246,248,.95)),
        repeating-linear-gradient(135deg, rgba(20,23,31,.035) 0 1px, transparent 1px 18px);
      color: var(--ink);
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      letter-spacing: 0;
    }

    button, input, select {
      font: inherit;
      letter-spacing: 0;
    }

    button {
      cursor: pointer;
    }

    button:disabled {
      cursor: not-allowed;
      opacity: .58;
    }

    .shell {
      width: min(1400px, calc(100% - 32px));
      margin: 0 auto;
      padding: 24px 0 40px;
    }

    .topbar {
      min-height: 52px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 18px;
      border-bottom: 1px solid rgba(20,23,31,.1);
      margin-bottom: 26px;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 10px;
      font-weight: 760;
      font-size: 18px;
    }

    .mark {
      width: 28px;
      height: 28px;
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 3px;
      transform: rotate(-28deg);
    }

    .mark span {
      background: var(--accent);
      border-radius: 2px;
    }

    .top-status {
      color: var(--muted);
      font-size: 13px;
      text-align: right;
    }

    .app-shell {
      display: grid;
      grid-template-columns: 220px minmax(0, 1fr);
      gap: 22px;
      align-items: start;
    }

    .sidebar {
      position: sticky;
      top: 20px;
      padding: 14px;
      display: grid;
      gap: 10px;
    }

    .nav-title {
      color: var(--muted);
      font-size: 12px;
      font-weight: 760;
      padding: 4px 6px 8px;
    }

    .nav-btn {
      min-height: 42px;
      border: 1px solid transparent;
      border-radius: 8px;
      background: transparent;
      color: var(--ink);
      padding: 0 11px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      font-weight: 760;
      text-align: left;
      transition: background-color .18s ease, border-color .18s ease, color .18s ease, transform .18s ease;
    }

    .nav-btn:hover {
      transform: translateX(2px);
      background: #f3f5f8;
    }

    .nav-btn span {
      color: var(--muted);
      font-size: 12px;
      font-weight: 700;
    }

    .nav-btn.active {
      background: #111827;
      color: #fff;
      border-color: #111827;
    }

    .nav-btn.active span {
      color: rgba(255,255,255,.72);
    }

    .content {
      min-width: 0;
    }

    .view {
      display: none;
    }

    .view.active {
      display: block;
      animation: view-enter .24s ease both;
    }

    @keyframes view-enter {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .purchase-layout {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 420px;
      gap: 22px;
      align-items: start;
    }

    .history-layout {
      display: grid;
      grid-template-columns: minmax(420px, 480px) minmax(0, 1fr);
      gap: 18px;
      align-items: start;
    }

    .view-head {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      align-items: end;
      margin-bottom: 16px;
    }

    .view-head h1 {
      font-size: 26px;
    }

    .view-actions {
      min-width: 110px;
    }

    .surface {
      background: rgba(255,255,255,.92);
      border: 1px solid rgba(20,23,31,.1);
      border-radius: 8px;
      box-shadow: 0 18px 52px rgba(16,24,40,.08);
      transition: box-shadow .18s ease, border-color .18s ease, transform .18s ease;
    }

    .workspace {
      padding: 22px;
    }

    .headline {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 18px;
      margin-bottom: 20px;
    }

    h1 {
      margin: 0;
      font-size: 28px;
      line-height: 1.18;
      font-weight: 760;
    }

    .subline {
      margin-top: 8px;
      color: var(--muted);
      font-size: 14px;
      line-height: 1.5;
    }

    .pill {
      min-width: max-content;
      padding: 8px 10px;
      border-radius: 999px;
      background: #eef4ff;
      color: #1d4ed8;
      font-size: 13px;
      font-weight: 700;
    }

    .form-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 14px;
    }

    .field {
      display: grid;
      gap: 7px;
    }

    label {
      color: #344054;
      font-size: 13px;
      font-weight: 700;
    }

    select, input {
      width: 100%;
      height: 46px;
      border: 1px solid var(--line);
      background: #fff;
      border-radius: 8px;
      color: var(--ink);
      padding: 0 12px;
      outline: 0;
      transition: border-color .18s ease, box-shadow .18s ease, background-color .18s ease, transform .18s ease;
    }

    select:focus, input:focus {
      border-color: var(--focus);
      box-shadow: 0 0 0 3px rgba(68,108,255,.14);
      transform: translateY(-1px);
    }

    select:hover, input:hover {
      border-color: #b8c2d4;
    }

    .plans {
      margin-top: 18px;
      display: grid;
      gap: 10px;
    }

    .plan-control {
      margin-top: 12px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
    }

    .plan-control .status {
      min-height: 0;
    }

    .plan-toggle {
      width: auto;
      min-width: 104px;
      min-height: 38px;
      padding: 0 12px;
    }

    .plan-row {
      border: 1px solid var(--line);
      background: #fff;
      border-radius: 8px;
      padding: 14px;
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 14px;
      align-items: center;
      transition: border-color .15s ease, box-shadow .15s ease, transform .15s ease;
    }

    .plan-row.active {
      border-color: #111827;
      box-shadow: 0 10px 24px rgba(17,24,39,.1);
    }

    .plan-row:hover {
      border-color: #b8c2d4;
      box-shadow: 0 10px 22px rgba(16,24,40,.08);
      transform: translateY(-1px);
    }

    .plan-skeleton {
      min-height: 76px;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: #fff;
      padding: 14px;
      display: grid;
      grid-template-columns: minmax(0, 1fr) 112px;
      gap: 14px;
      align-items: center;
      overflow: hidden;
    }

    .skeleton-stack {
      display: grid;
      gap: 9px;
    }

    .skeleton-line {
      height: 12px;
      border-radius: 999px;
      background: linear-gradient(90deg, #eef2f7 0%, #f8fafc 42%, #eef2f7 84%);
      background-size: 220% 100%;
      animation: skeleton-shimmer 1.15s ease-in-out infinite;
    }

    .skeleton-line.title {
      width: min(260px, 72%);
      height: 15px;
    }

    .skeleton-line.meta {
      width: min(360px, 92%);
    }

    .skeleton-line.price {
      width: 96px;
      height: 18px;
      justify-self: end;
    }

    .skeleton-line.price-sub {
      width: 70px;
      justify-self: end;
    }

    @keyframes skeleton-shimmer {
      0% { background-position: 120% 0; }
      100% { background-position: -120% 0; }
    }

    .plan-title {
      font-weight: 760;
      line-height: 1.35;
    }

    .plan-meta {
      margin-top: 4px;
      color: var(--muted);
      font-size: 13px;
    }

    .country-heading {
      display: inline-grid;
      grid-template-columns: auto minmax(0, 1fr);
      column-gap: 10px;
      row-gap: 2px;
      align-items: center;
    }

    .country-flag {
      font-size: .92em;
      line-height: 1;
    }

    .country-copy {
      display: grid;
      gap: 2px;
      min-width: 0;
    }

    .country-copy strong {
      color: inherit;
      font: inherit;
      line-height: 1.1;
    }

    .country-copy small {
      color: rgba(255,255,255,.68);
      font-size: 13px;
      font-weight: 650;
      line-height: 1.25;
    }

    .country-inline {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      min-width: 0;
    }

    .plan-price {
      text-align: right;
      font-weight: 780;
    }

    .plan-price small {
      display: block;
      margin-top: 3px;
      color: var(--muted);
      font-weight: 520;
    }

    .summary {
      position: sticky;
      top: 20px;
      overflow: hidden;
    }

    .summary-head {
      background: #151922;
      color: #fff;
      padding: 18px;
    }

    .summary-head .muted {
      color: rgba(255,255,255,.68);
    }

    .summary-body {
      padding: 18px;
      display: grid;
      gap: 14px;
    }

    .amount {
      display: flex;
      align-items: end;
      justify-content: space-between;
      gap: 16px;
      padding-bottom: 14px;
      border-bottom: 1px solid var(--line);
    }

    .amount strong {
      font-size: 30px;
      line-height: 1;
    }

    .kv {
      display: grid;
      grid-template-columns: 116px minmax(0, 1fr);
      gap: 10px;
      font-size: 14px;
    }

    .kv span:first-child {
      color: var(--muted);
    }

    .email-box {
      background: var(--panel-soft);
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 12px;
      display: grid;
      gap: 7px;
      transition: border-color .18s ease, box-shadow .18s ease, background-color .18s ease;
    }

    .mono {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
      word-break: break-all;
    }

    .method-tabs {
      display: grid;
      grid-template-columns: 1fr;
      gap: 8px;
    }

    .method {
      min-height: 44px;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: #fff;
      color: var(--ink);
      font-weight: 760;
    }

    .method.paypal {
      background: var(--paypal);
      color: var(--paypal-ink);
      border-color: #dba727;
    }

    .method.alipay {
      background: #1677ff;
      color: #fff;
      border-color: #1677ff;
    }

    .primary {
      width: 100%;
      min-height: 48px;
      border: 0;
      border-radius: 8px;
      background: var(--accent);
      color: #fff;
      font-weight: 780;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      transition: transform .15s ease, box-shadow .15s ease, background-color .15s ease;
    }

    .primary.loading {
      background: #0f172a;
      box-shadow: 0 10px 20px rgba(15,23,42,.16);
      transform: translateY(-1px);
    }

    .primary-spinner {
      width: 16px;
      height: 16px;
      border: 2px solid rgba(255,255,255,.42);
      border-top-color: #fff;
      border-radius: 50%;
      display: none;
      flex: 0 0 auto;
      animation: spin .72s linear infinite;
    }

    .primary.loading .primary-spinner {
      display: inline-block;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    @media (prefers-reduced-motion: reduce) {
      * {
        transition: none !important;
        animation-duration: .01ms !important;
        animation-iteration-count: 1 !important;
      }

      .primary {
        transition: none;
      }

      .primary.loading {
        transform: none;
      }

      .primary-spinner {
        animation: none;
      }

      .skeleton-line {
        animation: none;
      }
    }

    .ghost {
      width: 100%;
      min-height: 44px;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: #fff;
      color: var(--ink);
      font-weight: 700;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      transition: border-color .18s ease, box-shadow .18s ease, transform .18s ease, background-color .18s ease;
    }

    .ghost:hover, .copy-btn:hover, .open-link:hover {
      border-color: #b8c2d4;
      box-shadow: 0 8px 18px rgba(16,24,40,.08);
      transform: translateY(-1px);
    }

    button.action-loading {
      pointer-events: none;
    }

    button.action-loading::before {
      content: "";
      width: 14px;
      height: 14px;
      border: 2px solid rgba(20,23,31,.2);
      border-top-color: currentColor;
      border-radius: 50%;
      flex: 0 0 auto;
      animation: spin .72s linear infinite;
    }

    .primary.action-loading::before {
      border-color: rgba(255,255,255,.42);
      border-top-color: #fff;
    }

    .paypal-host {
      min-height: 48px;
      display: grid;
      gap: 8px;
    }

    .mail-lookup {
      padding: 18px;
      display: grid;
      gap: 12px;
    }

    .mail-title {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      align-items: center;
      font-weight: 760;
    }

    .mail-title span {
      color: var(--muted);
      font-size: 12px;
      font-weight: 620;
    }

    .mail-form {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 86px;
      gap: 8px;
    }

    .mail-form .ghost {
      min-height: 46px;
    }

    .mail-results {
      display: grid;
      gap: 8px;
    }

    .mail-item {
      border: 1px solid var(--line);
      border-radius: 8px;
      background: #fff;
      padding: 10px;
      display: grid;
      gap: 7px;
      font-size: 13px;
      line-height: 1.45;
      animation: item-enter .2s ease both;
      transition: border-color .18s ease, box-shadow .18s ease, transform .18s ease;
    }

    .mail-item:hover, .esim-card:hover {
      border-color: #b8c2d4;
      box-shadow: 0 10px 20px rgba(16,24,40,.07);
      transform: translateY(-1px);
    }

    .mail-skeleton {
      min-height: 78px;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: #fff;
      padding: 12px;
      display: grid;
      gap: 10px;
      overflow: hidden;
    }

    @keyframes item-enter {
      from { opacity: 0; transform: translateY(6px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .mail-item-head {
      display: flex;
      justify-content: space-between;
      gap: 10px;
      align-items: start;
    }

    .mail-subject {
      font-weight: 760;
      word-break: break-word;
    }

    .mail-code {
      min-width: max-content;
      padding: 4px 7px;
      border-radius: 999px;
      background: #ecfdf3;
      color: var(--ok);
      font-weight: 800;
    }

    .mail-preview {
      color: var(--muted);
      word-break: break-word;
    }

    .mail-link {
      color: #1d4ed8;
      text-decoration: none;
      word-break: break-all;
      font-weight: 650;
    }

    .history-panel {
      padding: 14px;
      display: grid;
      gap: 10px;
    }

    .esim-panel {
      padding: 16px;
      display: grid;
      gap: 14px;
    }

    .section-head {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      align-items: center;
      font-weight: 760;
    }

    .section-head span {
      color: var(--muted);
      font-size: 12px;
      font-weight: 620;
    }

    .section-head .ghost {
      width: auto;
      min-width: 74px;
      min-height: 34px;
      padding: 0 10px;
      font-size: 12px;
    }

    .esim-card {
      border: 1px solid var(--line);
      border-radius: 8px;
      background: #fff;
      padding: 12px;
      display: grid;
      gap: 10px;
      transition: border-color .18s ease, box-shadow .18s ease, transform .18s ease;
    }

    .esim-hero {
      display: grid;
      grid-template-columns: 240px minmax(0, 1fr);
      gap: 16px;
      align-items: start;
    }

    .esim-qr-card {
      border: 1px solid var(--line);
      border-radius: 8px;
      background: #fff;
      padding: 12px;
      display: grid;
      gap: 10px;
      align-content: start;
    }

    .esim-qr-card img {
      width: 100%;
      aspect-ratio: 1;
      object-fit: contain;
      display: block;
    }

    .detail-grid {
      display: grid;
      gap: 8px;
    }

    .install-grid {
      display: grid;
      gap: 10px;
    }

    .install-actions {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 8px;
    }

    .install-link {
      border: 1px solid var(--line);
      border-radius: 8px;
      background: #f8fafc;
      padding: 10px;
      display: grid;
      gap: 8px;
      min-width: 0;
    }

    .install-link-title {
      color: var(--ink);
      font-size: 13px;
      font-weight: 780;
    }

    .install-link-actions {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 8px;
    }

    .open-link {
      min-height: 32px;
      border: 0;
      border-radius: 8px;
      background: #111827;
      color: #fff;
      display: grid;
      place-items: center;
      text-decoration: none;
      font-size: 12px;
      font-weight: 760;
      padding: 0 10px;
      transition: box-shadow .18s ease, transform .18s ease, background-color .18s ease;
    }

    .compact-links {
      border: 1px solid var(--line);
      border-radius: 8px;
      background: #fff;
      padding: 10px;
      display: grid;
      gap: 8px;
      font-size: 13px;
    }

    .compact-links summary {
      cursor: pointer;
      font-weight: 760;
    }

    .copy-row {
      border: 1px solid rgba(20,23,31,.08);
      border-radius: 8px;
      background: #f8fafc;
      padding: 9px;
      display: grid;
      grid-template-columns: 72px minmax(0, 1fr) auto;
      gap: 8px;
      align-items: center;
      font-size: 13px;
    }

    .copy-label {
      color: var(--muted);
      font-weight: 700;
    }

    .copy-value {
      word-break: break-all;
      line-height: 1.4;
    }

    .copy-btn {
      min-width: 46px;
      min-height: 30px;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: #fff;
      color: var(--ink);
      font-size: 12px;
      font-weight: 760;
      padding: 0 8px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      transition: border-color .18s ease, box-shadow .18s ease, transform .18s ease, background-color .18s ease;
    }

    .qr-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 8px;
    }

    .qr-link {
      border: 1px solid var(--line);
      border-radius: 8px;
      background: #fff;
      padding: 8px;
      display: grid;
      place-items: center;
    }

    .qr-link img {
      width: 100%;
      max-width: 156px;
      aspect-ratio: 1;
      object-fit: contain;
      display: block;
    }

    .history-list {
      display: grid;
      gap: 8px;
      max-height: calc(100vh - 230px);
      overflow: auto;
      padding-right: 6px;
      scrollbar-width: thin;
      scrollbar-color: #98a2b3 #eef2f7;
    }

    .history-list::-webkit-scrollbar {
      width: 8px;
    }

    .history-list::-webkit-scrollbar-track {
      background: #eef2f7;
      border-radius: 999px;
    }

    .history-list::-webkit-scrollbar-thumb {
      background: #98a2b3;
      border-radius: 999px;
      border: 2px solid #eef2f7;
    }

    .history-list::-webkit-scrollbar-thumb:hover {
      background: #667085;
    }

    .history-row {
      width: 100%;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: #fff;
      color: var(--ink);
      padding: 10px;
      text-align: left;
      display: grid;
      gap: 6px;
      transition: border-color .18s ease, box-shadow .18s ease, transform .18s ease, background-color .18s ease;
    }

    .history-row.active {
      border-color: #111827;
      box-shadow: 0 8px 18px rgba(17,24,39,.08);
    }

    .history-row:hover {
      border-color: #b8c2d4;
      box-shadow: 0 8px 18px rgba(17,24,39,.08);
      transform: translateY(-1px);
    }

    .history-main {
      display: flex;
      justify-content: space-between;
      gap: 10px;
      align-items: start;
      font-size: 14px;
      font-weight: 760;
    }

    .history-meta {
      color: var(--muted);
      font-size: 12px;
      line-height: 1.45;
      word-break: break-word;
    }

    .history-line {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      color: var(--muted);
      font-size: 12px;
      line-height: 1.45;
    }

    .history-line span {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .history-order {
      color: var(--muted);
      font-size: 12px;
      line-height: 1.45;
      word-break: break-all;
    }

    .history-badge {
      min-width: max-content;
      border-radius: 999px;
      padding: 3px 7px;
      background: #f2f4f7;
      color: var(--muted);
      font-size: 12px;
      font-weight: 760;
    }

    .history-badge.ok {
      background: #ecfdf3;
      color: var(--ok);
    }

    .history-badge.bad {
      background: #fef3f2;
      color: var(--bad);
    }

    details.mail-preview-box {
      border: 1px solid var(--line);
      border-radius: 8px;
      background: #fff;
      padding: 9px;
      font-size: 13px;
      transition: border-color .18s ease, box-shadow .18s ease, background-color .18s ease;
    }

    details[open] {
      border-color: #b8c2d4;
      box-shadow: 0 8px 18px rgba(16,24,40,.06);
    }

    details.mail-preview-box summary {
      cursor: pointer;
      font-weight: 760;
    }

    .preview-text {
      margin-top: 8px;
      color: var(--muted);
      line-height: 1.5;
      word-break: break-word;
      max-height: 140px;
      overflow: auto;
    }

    .status {
      min-height: 22px;
      color: var(--muted);
      font-size: 13px;
      line-height: 1.55;
    }

    .status.ok { color: var(--ok); }
    .status.warn { color: var(--warn); }
    .status.bad { color: var(--bad); }

    .divider {
      height: 1px;
      background: var(--line);
      margin: 2px 0;
    }

    .empty {
      border: 1px dashed var(--line);
      border-radius: 8px;
      padding: 16px;
      color: var(--muted);
      text-align: center;
      font-size: 14px;
    }

    @media (max-width: 900px) {
      .shell {
        width: min(100% - 20px, 680px);
        padding-top: 16px;
      }

      .topbar, .headline {
        display: grid;
      }

      .top-status {
        text-align: left;
      }

      .app-shell, .purchase-layout, .history-layout {
        grid-template-columns: 1fr;
      }

      .sidebar, .summary {
        position: static;
      }

      .sidebar {
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }

      .nav-title {
        grid-column: 1 / -1;
      }

      .history-list {
        max-height: 360px;
      }

      .esim-hero {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 620px) {
      .form-grid {
        grid-template-columns: 1fr;
      }

      .workspace, .summary-body, .summary-head {
        padding: 16px;
      }

      h1 {
        font-size: 24px;
      }

      .plan-row {
        grid-template-columns: 1fr;
      }

      .plan-skeleton {
        grid-template-columns: 1fr;
      }

      .plan-price {
        text-align: left;
      }

      .copy-row {
        grid-template-columns: 1fr;
      }

      .install-actions {
        grid-template-columns: 1fr;
      }

      .qr-grid {
        grid-template-columns: 1fr;
      }
    }
  </style>
</head>
<body>
  <main class="shell">
    <header class="topbar">
      <div class="brand">
        <div class="mark" aria-hidden="true"><span></span><span></span><span></span></div>
        <span>Superalink Checkout</span>
      </div>
      <div id="topStatus" class="top-status">FRONT0000 · THB · PayPal</div>
    </header>

    <section class="app-shell">
      <nav class="surface sidebar" aria-label="页面导航">
        <div class="nav-title">本地工具</div>
        <button class="nav-btn active" type="button" data-view-target="purchase">购买 eSIM <span>首页</span></button>
        <button class="nav-btn" type="button" data-view-target="history">历史 eSIM <span id="historyNavCount">0</span></button>
        <button class="nav-btn" type="button" data-view-target="mail">邮箱查询 <span>邮件</span></button>
      </nav>

      <div class="content">
        <section id="purchaseView" class="view active" data-view-panel="purchase">
          <section class="purchase-layout">
            <div class="surface workspace">
              <div class="headline">
                <div>
                  <h1>选择 eSIM 套餐</h1>
                  <div class="subline">订单创建后会自动分配邮箱，支付完成后本地收集 eSIM 邮件。</div>
                </div>
                <div id="couponPill" class="pill">FRONT0000</div>
              </div>

              <div class="form-grid">
                <div class="field">
                  <label for="country">目的地</label>
                  <select id="country"></select>
                </div>
                <div class="field">
                  <label for="currency">币种</label>
                  <select id="currency">
                    <option value="THB">THB · 泰铢</option>
                    <option value="USD">USD · 美元</option>
                    <option value="SGD">SGD · 新币</option>
                    <option value="GBP">GBP · 英镑</option>
                    <option value="EUR">EUR · 欧元</option>
                    <option value="JPY">JPY · 日元</option>
                    <option value="KRW">KRW · 韩元</option>
                    <option value="CNY">CNY · 人民币</option>
                  </select>
                </div>
                <div class="field">
                  <label for="quantity">数量</label>
                  <input id="quantity" type="number" min="1" max="20" step="1">
                </div>
                <div class="field">
                  <label for="planFilter">筛选</label>
                  <input id="planFilter" type="search" autocomplete="off" placeholder="5 Days / 10 Days / SKU">
                </div>
              </div>

              <div id="plans" class="plans">
                <div class="plan-skeleton" aria-hidden="true">
                  <div class="skeleton-stack">
                    <div class="skeleton-line title"></div>
                    <div class="skeleton-line meta"></div>
                  </div>
                  <div class="skeleton-stack">
                    <div class="skeleton-line price"></div>
                    <div class="skeleton-line price-sub"></div>
                  </div>
                </div>
                <div class="plan-skeleton" aria-hidden="true">
                  <div class="skeleton-stack">
                    <div class="skeleton-line title"></div>
                    <div class="skeleton-line meta"></div>
                  </div>
                  <div class="skeleton-stack">
                    <div class="skeleton-line price"></div>
                    <div class="skeleton-line price-sub"></div>
                  </div>
                </div>
                <div class="plan-skeleton" aria-hidden="true">
                  <div class="skeleton-stack">
                    <div class="skeleton-line title"></div>
                    <div class="skeleton-line meta"></div>
                  </div>
                  <div class="skeleton-stack">
                    <div class="skeleton-line price"></div>
                    <div class="skeleton-line price-sub"></div>
                  </div>
                </div>
                <div class="plan-skeleton" aria-hidden="true">
                  <div class="skeleton-stack">
                    <div class="skeleton-line title"></div>
                    <div class="skeleton-line meta"></div>
                  </div>
                  <div class="skeleton-stack">
                    <div class="skeleton-line price"></div>
                    <div class="skeleton-line price-sub"></div>
                  </div>
                </div>
                <div class="plan-skeleton" aria-hidden="true">
                  <div class="skeleton-stack">
                    <div class="skeleton-line title"></div>
                    <div class="skeleton-line meta"></div>
                  </div>
                  <div class="skeleton-stack">
                    <div class="skeleton-line price"></div>
                    <div class="skeleton-line price-sub"></div>
                  </div>
                </div>
              </div>
              <div id="planControl" class="plan-control" hidden>
                <div id="planCountText" class="status"></div>
                <button id="planToggleBtn" class="ghost plan-toggle" type="button">查看更多</button>
              </div>
            </div>

            <aside class="surface summary">
              <div class="summary-head">
                <div class="muted">当前订单</div>
                <h1 id="summaryTitle">
                  <span class="country-heading">
                    <span class="country-flag">🇨🇳</span>
                    <span class="country-copy"><strong>中国大陆</strong><small>China Mainland · CN</small></span>
                  </span>
                </h1>
              </div>
              <div class="summary-body">
                <div class="amount">
                  <div>
                    <div class="status">Total</div>
                    <strong id="summaryAmount">--</strong>
                  </div>
                  <div id="summaryDiscount" class="pill">优惠待确认</div>
                </div>

                <div class="kv"><span>套餐</span><b id="summaryPlan">--</b></div>
                <div class="kv"><span>SKU</span><span id="summarySku" class="mono">--</span></div>
                <div class="kv"><span>数量</span><span id="summaryQty">1</span></div>
                <div class="kv"><span>支付</span><span id="summaryMethod">PayPal</span></div>

                <button id="createBtn" class="primary" type="button" aria-busy="false">
                  <span class="primary-spinner" aria-hidden="true"></span>
                  <span id="createBtnText">创建订单</span>
                </button>

                <div id="sessionPanel" class="email-box" hidden>
                  <div class="kv"><span>目的地</span><span id="sessionCountry">--</span></div>
                  <div class="kv"><span>邮箱</span><b id="sessionEmail" class="mono">--</b></div>
                  <div class="kv"><span>订单</span><span id="sessionOrder" class="mono">--</span></div>
                </div>

                <div class="divider"></div>

                <div id="paypalHost" class="paypal-host"></div>
                <div id="alipayHost" class="method-tabs" hidden></div>
                <div id="flowStatus" class="status">先创建订单。</div>
              </div>
            </aside>
          </section>
        </section>

        <section id="historyView" class="view" data-view-panel="history">
          <div class="view-head">
            <div>
              <h1>历史 eSIM</h1>
              <div class="subline">本地记录会按更新时间排序，最近收集成功的 eSIM 会默认打开。</div>
            </div>
            <div class="view-actions">
              <button id="historyRefreshBtn" class="ghost" type="button">刷新</button>
            </div>
          </div>

          <section class="history-layout">
            <div class="surface history-panel">
              <div class="section-head">
                <div>记录</div>
                <span id="historyListHint">最近 30 条</span>
              </div>
              <div id="historyStatus" class="status">正在读取本地记录。</div>
              <div id="historyList" class="history-list"></div>
            </div>

            <div id="esimResult" class="surface esim-panel" hidden>
              <div class="section-head">
                <div id="esimResultTitle">eSIM 信息</div>
                <span id="esimResultHint">选择一条历史记录</span>
              </div>
              <div id="esimResultContent"></div>
            </div>
          </section>
        </section>

        <section id="mailView" class="view" data-view-panel="mail">
          <div class="view-head">
            <div>
              <h1>邮箱查询</h1>
              <div class="subline">只能读取本工具保存过访问 token 的临时邮箱。</div>
            </div>
          </div>

          <div class="surface mail-lookup">
            <div class="mail-title">邮箱邮件查询 <span>最新 2 条</span></div>
            <div class="mail-form">
              <input id="mailLookupEmail" type="email" autocomplete="off" placeholder="输入本工具生成的邮箱">
              <button id="mailLookupBtn" class="ghost" type="button">查询</button>
            </div>
            <div id="mailLookupStatus" class="status">只能查询本地已保存 token 的邮箱。</div>
            <div id="mailResults" class="mail-results"></div>
          </div>
        </section>
      </div>
    </section>
  </main>

  <script>
    const CONFIG = ${configJson};
    const PLAN_COLLAPSED_LIMIT = 5;
    const state = {
      activeView: 'purchase',
      catalog: [],
      selectedSku: '',
      plansExpanded: false,
      session: null,
      history: [],
      activeHistoryToken: '',
      paypalLoadedForCurrency: '',
      pollTimer: null,
      isCreatingCheckout: false
    };

    const el = {
      topStatus: document.getElementById('topStatus'),
      navButtons: Array.from(document.querySelectorAll('[data-view-target]')),
      viewPanels: Array.from(document.querySelectorAll('[data-view-panel]')),
      historyNavCount: document.getElementById('historyNavCount'),
      couponPill: document.getElementById('couponPill'),
      country: document.getElementById('country'),
      currency: document.getElementById('currency'),
      quantity: document.getElementById('quantity'),
      planFilter: document.getElementById('planFilter'),
      plans: document.getElementById('plans'),
      planControl: document.getElementById('planControl'),
      planCountText: document.getElementById('planCountText'),
      planToggleBtn: document.getElementById('planToggleBtn'),
      summaryTitle: document.getElementById('summaryTitle'),
      summaryAmount: document.getElementById('summaryAmount'),
      summaryDiscount: document.getElementById('summaryDiscount'),
      summaryPlan: document.getElementById('summaryPlan'),
      summarySku: document.getElementById('summarySku'),
      summaryQty: document.getElementById('summaryQty'),
      summaryMethod: document.getElementById('summaryMethod'),
      createBtn: document.getElementById('createBtn'),
      createBtnText: document.getElementById('createBtnText'),
      sessionPanel: document.getElementById('sessionPanel'),
      sessionCountry: document.getElementById('sessionCountry'),
      sessionEmail: document.getElementById('sessionEmail'),
      sessionOrder: document.getElementById('sessionOrder'),
      paypalHost: document.getElementById('paypalHost'),
      alipayHost: document.getElementById('alipayHost'),
      flowStatus: document.getElementById('flowStatus'),
      esimResult: document.getElementById('esimResult'),
      esimResultTitle: document.getElementById('esimResultTitle'),
      esimResultHint: document.getElementById('esimResultHint'),
      esimResultContent: document.getElementById('esimResultContent'),
      historyRefreshBtn: document.getElementById('historyRefreshBtn'),
      historyStatus: document.getElementById('historyStatus'),
      historyList: document.getElementById('historyList'),
      mailLookupEmail: document.getElementById('mailLookupEmail'),
      mailLookupBtn: document.getElementById('mailLookupBtn'),
      mailLookupStatus: document.getElementById('mailLookupStatus'),
      mailResults: document.getElementById('mailResults')
    };

    function setStatus(text, tone = '') {
      el.flowStatus.textContent = text;
      el.flowStatus.className = 'status' + (tone ? ' ' + tone : '');
    }

    function setMailStatus(text, tone = '') {
      el.mailLookupStatus.textContent = text;
      el.mailLookupStatus.className = 'status' + (tone ? ' ' + tone : '');
    }

    function setHistoryStatus(text, tone = '') {
      el.historyStatus.textContent = text;
      el.historyStatus.className = 'status' + (tone ? ' ' + tone : '');
    }

    function setActiveView(viewName) {
      state.activeView = viewName;
      el.navButtons.forEach(button => {
        const active = button.getAttribute('data-view-target') === viewName;
        button.classList.toggle('active', active);
      });
      el.viewPanels.forEach(panel => {
        panel.classList.toggle('active', panel.getAttribute('data-view-panel') === viewName);
      });

      if (viewName === 'history') {
        renderHistoryList();
      }
      console.debug('[superalink] view switched', { viewName });
    }

    function setActiveFeedback(text, tone = 'ok') {
      if (state.activeView === 'history') {
        setHistoryStatus(text, tone);
        return;
      }
      if (state.activeView === 'mail') {
        setMailStatus(text, tone);
        return;
      }
      setStatus(text, tone);
    }

    function setCreateButtonLoading(isLoading) {
      state.isCreatingCheckout = isLoading;
      el.createBtn.classList.toggle('loading', isLoading);
      el.createBtn.setAttribute('aria-busy', String(isLoading));
      el.createBtnText.textContent = isLoading ? '创建中' : '创建订单';
      // 创建订单期间禁止重复提交，避免同一套餐被短时间内重复创建。
      el.createBtn.disabled = isLoading || !currentProduct();
    }

    function setButtonLoading(button, isLoading, loadingText) {
      if (!button) return;
      if (!button.dataset.idleText) button.dataset.idleText = button.textContent || '';
      button.classList.toggle('action-loading', isLoading);
      button.setAttribute('aria-busy', String(isLoading));
      button.disabled = isLoading;
      button.textContent = isLoading ? (loadingText || button.dataset.idleText || '处理中') : (button.dataset.idleText || '');
    }

    function escapeHtml(value) {
      return String(value || '').replace(/[&<>"']/g, char => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      }[char]));
    }

    function api(path, options = {}) {
      return fetch(path, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...(options.headers || {})
        }
      }).then(async response => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok || data.ok === false) {
          throw new Error(data.error || '请求失败');
        }
        return data;
      });
    }

    function formatTime(value) {
      if (!value) return '--';
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return value;
      return date.toLocaleString('zh-CN', { hour12: false });
    }

    function clearEsimResult() {
      state.activeHistoryToken = '';
      el.esimResult.hidden = true;
      el.esimResultTitle.textContent = 'eSIM 信息';
      el.esimResultHint.textContent = '支付完成后展示';
      el.esimResultContent.innerHTML = '';
    }

    function historyBadgeClass(status) {
      if (status === 'esim_received') return ' ok';
      if (status === 'mail_timeout' || status === 'payment_failed') return ' bad';
      return '';
    }

    function historyStatusText(record) {
      return record.statusText || record.status || '未知';
    }

    async function loadHistory(options = {}) {
      const shouldSelectLatest = Boolean(options.selectLatest);
      setButtonLoading(el.historyRefreshBtn, true, '刷新中');
      setHistoryStatus('正在读取本地记录。');
      try {
        const data = await api('/api/checkout/history?limit=30');
        state.history = data.records || [];
        renderHistoryList();
        const receivedCount = state.history.filter(record => record.hasEsimMailInfo).length;
        el.historyNavCount.textContent = String(receivedCount || state.history.length);
        setHistoryStatus('已读取 ' + state.history.length + ' 条记录，已收集 ' + receivedCount + ' 条。', state.history.length ? 'ok' : 'warn');

        if (shouldSelectLatest && !state.session) {
          const latest = state.history.find(record => record.hasEsimMailInfo);
          if (latest) await showHistoryDetail(latest.token, '最近收集的 eSIM', true);
        }
      } catch (error) {
        setHistoryStatus(error.message || String(error), 'bad');
      } finally {
        setButtonLoading(el.historyRefreshBtn, false);
      }
    }

    function renderHistoryList() {
      if (!state.history.length) {
        el.historyList.innerHTML = '<div class="empty">暂无本地订单记录</div>';
        return;
      }

      el.historyList.innerHTML = state.history.map(record => {
        const active = record.token === state.activeHistoryToken ? ' active' : '';
        const badgeClass = historyBadgeClass(record.status);
        const title = record.email || record.orderId || '未知邮箱';
        const amount = record.amountDisplay || record.currency || '--';
        const received = record.hasEsimMailInfo ? '已有 eSIM' : '等待邮件';
        const country = countryPlainText(record.countryCode || '');
        return '<button type="button" class="history-row' + active + '" data-history-token="' + escapeHtml(record.token) + '">' +
          '<div class="history-main"><span>' + escapeHtml(title) + '</span><span class="history-badge' + badgeClass + '">' + escapeHtml(historyStatusText(record)) + '</span></div>' +
          '<div class="history-line"><span>' + escapeHtml(amount) + '</span><span>' + escapeHtml(formatTime(record.updatedAt)) + '</span></div>' +
          '<div class="history-line"><span>' + escapeHtml(country) + '</span><span>' + escapeHtml(received) + '</span></div>' +
          '<div class="history-line"><span>' + escapeHtml(record.sku || '--') + '</span><span></span></div>' +
          '<div class="history-order">' + escapeHtml(record.orderId || '--') + '</div>' +
          '</button>';
      }).join('');

      el.historyList.querySelectorAll('[data-history-token]').forEach(button => {
        button.addEventListener('click', () => {
          const token = button.getAttribute('data-history-token') || '';
          showHistoryDetail(token, '历史 eSIM 信息');
        });
      });
    }

    async function showHistoryDetail(token, title, silent = false) {
      if (!token) return;
      try {
        if (!silent) setHistoryStatus('正在读取历史详情。');
        const data = await api('/api/checkout/history/detail?token=' + encodeURIComponent(token));
        state.activeHistoryToken = token;
        renderEsimResult(data.record, title);
        renderHistoryList();
        if (!silent) setHistoryStatus('已打开订单 ' + (data.record.orderId || '--') + '。', 'ok');
      } catch (error) {
        if (!silent) setHistoryStatus(error.message || String(error), 'bad');
        else setStatus(error.message || String(error), 'bad');
      }
    }

    function renderEsimResult(record, title) {
      el.esimResult.hidden = false;
      el.esimResultTitle.textContent = title || 'eSIM 信息';
      el.esimResultHint.textContent = historyStatusText(record) + ' · ' + formatTime(record.updatedAt);

      const infos = record.esimMailInfo || [];
      const orderSummary = [
        renderCopyRow('目的地', countryPlainText(record.countryCode || ''), '目的地'),
        renderCopyRow('邮箱', record.email, '邮箱'),
        renderCopyRow('订单', record.orderId, '订单号'),
        renderCopyRow('SKU', record.sku, 'SKU'),
        renderCopyRow('金额', record.amountDisplay || record.currency || '', '金额')
      ].join('');
      const checkoutLinks = [
        renderCompactLinkRow('Checkout', record.checkoutUrl, 'Checkout 链接'),
        renderCompactLinkRow('产品页', record.officialProductUrl, '产品页链接')
      ].join('');

      const errorBlock = record.error
        ? '<div class="empty">' + escapeHtml(record.error) + '</div>'
        : '';
      const infoBlocks = infos.length
        ? infos.map((info, index) => renderEsimInfo(info, index)).join('')
        : '<div class="empty">这条记录还没有解析到 eSIM 邮件详情。</div>';

      el.esimResultContent.innerHTML =
        '<div class="esim-card"><div class="mail-subject">订单信息</div><div class="detail-grid">' + orderSummary + '</div>' +
        (checkoutLinks ? '<details class="compact-links"><summary>订单链接</summary><div class="detail-grid">' + checkoutLinks + '</div></details>' : '') +
        '</div>' +
        errorBlock +
        infoBlocks;
      attachCopyHandlers(el.esimResultContent);
    }

    function renderEsimInfo(info, index) {
      const title = info.subject || ('eSIM 邮件 ' + (index + 1));
      const primaryQr = (info.qrImageUrls || [])[0] || '';
      const extraQrItems = (info.qrImageUrls || []).slice(1).map(url => {
        return '<a class="qr-link" href="' + escapeHtml(url) + '" target="_blank" rel="noopener noreferrer">' +
          '<img src="' + escapeHtml(url) + '" alt="eSIM QR Code">' +
          '</a>';
      }).join('');
      const primaryQrBlock = primaryQr
        ? '<div class="esim-qr-card"><a href="' + escapeHtml(primaryQr) + '" target="_blank" rel="noopener noreferrer"><img src="' + escapeHtml(primaryQr) + '" alt="eSIM QR Code"></a>' + renderCopyButton(primaryQr, '二维码链接') + '</div>'
        : '<div class="esim-qr-card"><div class="empty">未解析到二维码图片</div></div>';
      const extraQrBlock = extraQrItems
        ? '<div><div class="mail-subject">更多二维码</div><div class="qr-grid">' + extraQrItems + '</div></div>'
        : '';
      const codeRows = (info.activationCodes || []).map((code, codeIndex) => {
        return renderCopyRow(codeIndex === 0 ? 'LPA' : 'LPA ' + (codeIndex + 1), code, 'LPA');
      }).join('');
      const iccidRows = (info.iccids || []).map((iccid, iccidIndex) => {
        return renderCopyRow(iccidIndex === 0 ? 'ICCID' : 'ICCID ' + (iccidIndex + 1), iccid, 'ICCID');
      }).join('');
      const orderRows = (info.orderIds || []).map((orderId, orderIndex) => {
        return renderCopyRow(orderIndex === 0 ? '邮件订单' : '邮件订单 ' + (orderIndex + 1), orderId, '邮件订单号');
      }).join('');
      const activationActions = renderActivationActions(info.activationUrls || []);
      const rawLinks = uniqueValues([...(info.activationUrls || []), ...(info.urls || [])]).slice(0, 10).map((url, urlIndex) => {
        return renderCompactLinkRow('链接 ' + (urlIndex + 1), url, '链接');
      }).join('');
      const hasInstallInfo = primaryQr || codeRows || activationActions;
      const emptyInstall = hasInstallInfo
        ? ''
        : '<div class="empty">这封邮件没有解析到二维码或 LPA，请展开邮件摘要人工核对。</div>';

      return '<div class="esim-card">' +
        '<div><div class="mail-subject">' + escapeHtml(title) + '</div>' +
        (info.from ? '<div class="mail-preview">From: ' + escapeHtml(info.from) + '</div>' : '') +
        '</div>' +
        '<div class="esim-hero">' + primaryQrBlock + '<div class="install-grid">' + codeRows + iccidRows + orderRows + activationActions + '</div></div>' +
        extraQrBlock +
        emptyInstall +
        (rawLinks ? '<details class="compact-links"><summary>原始链接</summary><div class="detail-grid">' + rawLinks + '</div></details>' : '') +
        '<details class="mail-preview-box"><summary>邮件摘要</summary><div class="preview-text">' + escapeHtml(info.textPreview || '') + '</div></details>' +
        '</div>';
    }

    function renderCopyRow(label, value, copyLabel) {
      if (!value) return '';
      return '<div class="copy-row">' +
        '<div class="copy-label">' + escapeHtml(label) + '</div>' +
        '<div class="copy-value mono">' + escapeHtml(value) + '</div>' +
        renderCopyButton(value, copyLabel || label) +
        '</div>';
    }

    function renderLinkRow(label, value, copyLabel) {
      if (!value) return '';
      return '<div class="copy-row">' +
        '<div class="copy-label">' + escapeHtml(label) + '</div>' +
        '<a class="copy-value mail-link" href="' + escapeHtml(value) + '" target="_blank" rel="noopener noreferrer">' + escapeHtml(value) + '</a>' +
        renderCopyButton(value, copyLabel || label) +
        '</div>';
    }

    function renderActivationActions(urls) {
      const items = uniqueValues(urls || []).slice(0, 4);
      if (items.length === 0) return '';
      return '<div class="install-actions">' + items.map((url, index) => {
        const platform = activationPlatform(url, index);
        return '<div class="install-link">' +
          '<div class="install-link-title">' + escapeHtml(platform) + '</div>' +
          '<div class="install-link-actions">' +
          '<a class="open-link" href="' + escapeHtml(url) + '" target="_blank" rel="noopener noreferrer">打开</a>' +
          renderCopyButton(url, platform + '激活链接') +
          '</div>' +
          '</div>';
      }).join('') + '</div>';
    }

    function activationPlatform(url, index) {
      const lower = String(url || '').toLowerCase();
      if (lower.includes('os=ios')) return 'iOS 激活';
      if (lower.includes('os=android')) return 'Android 激活';
      return '激活链接 ' + (index + 1);
    }

    function renderCompactLinkRow(label, value, copyLabel) {
      if (!value) return '';
      return '<div class="copy-row">' +
        '<div class="copy-label">' + escapeHtml(label) + '</div>' +
        '<a class="copy-value mail-link" href="' + escapeHtml(value) + '" target="_blank" rel="noopener noreferrer">' + escapeHtml(shortUrl(value)) + '</a>' +
        renderCopyButton(value, copyLabel || label) +
        '</div>';
    }

    function shortUrl(value) {
      const text = String(value || '');
      try {
        const url = new URL(text);
        const path = url.pathname && url.pathname !== '/' ? url.pathname : '';
        const queryHint = url.search ? ' ?' : '';
        return url.hostname + path + queryHint;
      } catch {
        return text.length > 72 ? text.slice(0, 69) + '...' : text;
      }
    }

    function uniqueValues(values) {
      return Array.from(new Set((values || []).map(value => String(value || '').trim()).filter(Boolean)));
    }

    function renderCopyButton(value, label) {
      return '<button class="copy-btn" type="button" data-copy="' + escapeHtml(value) + '" data-copy-label="' + escapeHtml(label) + '">复制</button>';
    }

    function attachCopyHandlers(container) {
      container.querySelectorAll('[data-copy]').forEach(button => {
        button.addEventListener('click', async event => {
          event.preventDefault();
          const value = button.getAttribute('data-copy') || '';
          const label = button.getAttribute('data-copy-label') || '内容';
          try {
            await copyToClipboard(value);
            const previousText = button.textContent;
            button.textContent = '已复制';
            setActiveFeedback(label + '已复制。', 'ok');
            window.setTimeout(() => {
              button.textContent = previousText || '复制';
            }, 1200);
          } catch (error) {
            setActiveFeedback('复制失败: ' + (error.message || String(error)), 'bad');
          }
        });
      });
    }

    async function copyToClipboard(value) {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(value);
        return;
      }

      const textarea = document.createElement('textarea');
      textarea.value = value;
      textarea.setAttribute('readonly', 'readonly');
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      textarea.remove();
    }

    function countryMeta(code) {
      return CONFIG.countries.find(country => country.code === code) || {
        code,
        name: code,
        zhName: code,
        flag: '🌐'
      };
    }

    function countryOptionLabel(item) {
      return item.flag + ' ' + item.zhName + ' · ' + item.name + ' · ' + item.code;
    }

    function countryPlainText(code) {
      if (!code) return '--';
      const item = countryMeta(code);
      return item.flag + ' ' + item.zhName + ' · ' + item.name + ' · ' + item.code;
    }

    function countrySummaryHtml(code) {
      const item = countryMeta(code);
      return '<span class="country-heading">' +
        '<span class="country-flag">' + escapeHtml(item.flag) + '</span>' +
        '<span class="country-copy"><strong>' + escapeHtml(item.zhName) + '</strong><small>' + escapeHtml(item.name + ' · ' + item.code) + '</small></span>' +
        '</span>';
    }

    function formatPlan(item) {
      const dataText = item.option === 'UNLIMITED' ? item.dailyDataText + ' per day' : item.dataText;
      return item.durationDays + ' Days · ' + dataText;
    }

    function currentProduct() {
      return state.catalog.find(item => item.sku === state.selectedSku) || state.catalog[0];
    }

    function priceFor(item, currency) {
      if (!item) return null;
      return item.discountedPrices && item.discountedPrices[currency]
        ? item.discountedPrices[currency]
        : item.prices && item.prices[currency]
          ? item.prices[currency]
          : null;
    }

    function renderCountries() {
      el.country.innerHTML = CONFIG.countries.map(item => {
        return '<option value="' + item.code + '">' + countryOptionLabel(item) + '</option>';
      }).join('');
      el.country.value = CONFIG.defaultCountryCode;
      el.currency.value = CONFIG.defaultCurrency;
      el.quantity.value = String(CONFIG.defaultQuantity);
      el.couponPill.textContent = CONFIG.coupon;
      el.topStatus.textContent = CONFIG.coupon + ' · ' + CONFIG.defaultCurrency + ' · PayPal';
    }

    function renderPlans() {
      const filter = el.planFilter.value.trim().toLowerCase();
      const items = state.catalog.filter(item => {
        const text = [item.sku, formatPlan(item), item.countryCode, countryPlainText(item.countryCode)].join(' ').toLowerCase();
        return !filter || text.includes(filter);
      });

      if (items.length === 0) {
        el.plans.innerHTML = '<div class="empty">没有匹配套餐</div>';
        el.planControl.hidden = true;
        renderSummary();
        return;
      }

      const selectedItem = items.find(item => item.sku === state.selectedSku);
      let visibleItems = state.plansExpanded ? items : items.slice(0, PLAN_COLLAPSED_LIMIT);
      if (!state.plansExpanded && selectedItem && !visibleItems.some(item => item.sku === selectedItem.sku)) {
        visibleItems = [selectedItem, ...visibleItems.filter(item => item.sku !== selectedItem.sku)].slice(0, PLAN_COLLAPSED_LIMIT);
      }

      el.plans.innerHTML = visibleItems.map(item => {
        const active = item.sku === state.selectedSku ? ' active' : '';
        const price = priceFor(item, el.currency.value);
        const amount = price ? price.display : '--';
        return '<button type="button" class="plan-row' + active + '" data-sku="' + item.sku + '">' +
          '<div><div class="plan-title">' + formatPlan(item) + '</div>' +
          '<div class="plan-meta"><span class="country-inline">' + escapeHtml(countryPlainText(item.countryCode)) + '</span> · ' + escapeHtml(item.sku) + '</div></div>' +
          '<div class="plan-price">' + amount + '<small>after coupon</small></div>' +
          '</button>';
      }).join('');

      const canToggle = items.length > PLAN_COLLAPSED_LIMIT;
      el.planControl.hidden = !canToggle;
      el.planToggleBtn.textContent = state.plansExpanded ? '收起' : '查看更多';
      el.planCountText.textContent = state.plansExpanded
        ? '已展示全部 ' + items.length + ' 个套餐'
        : '已展示 ' + visibleItems.length + ' / ' + items.length + ' 个套餐';

      el.plans.querySelectorAll('[data-sku]').forEach(button => {
        button.addEventListener('click', () => {
          state.selectedSku = button.getAttribute('data-sku') || '';
          state.session = null;
          clearPaypal();
          renderPlans();
        });
      });

      renderSummary();
    }

    function renderSummary() {
      const item = currentProduct();
      const quantity = Number.parseInt(el.quantity.value || '1', 10) || 1;
      el.summaryQty.textContent = String(quantity);
      el.summaryMethod.textContent = 'PayPal';

      if (!item) {
        el.summaryTitle.innerHTML = countrySummaryHtml(el.country.value);
        el.summaryAmount.textContent = '--';
        el.summaryPlan.textContent = '--';
        el.summarySku.textContent = '--';
        return;
      }

      const currency = el.currency.value;
      const price = priceFor(item, currency);
      el.summaryTitle.innerHTML = countrySummaryHtml(item.countryCode);
      el.summaryAmount.textContent = price ? price.display : '--';
      el.summaryPlan.textContent = formatPlan(item);
      el.summarySku.textContent = item.sku;
      el.summaryDiscount.textContent = CONFIG.coupon;
      setCreateButtonLoading(state.isCreatingCheckout);
    }

    // 套餐接口加载前先占住列表空间，避免首屏和切换目的地时页面跳动。
    function renderPlanSkeletons(count = 5) {
      el.plans.innerHTML = Array.from({ length: count }).map(() => {
        return '<div class="plan-skeleton" aria-hidden="true">' +
          '<div class="skeleton-stack">' +
          '<div class="skeleton-line title"></div>' +
          '<div class="skeleton-line meta"></div>' +
          '</div>' +
          '<div class="skeleton-stack">' +
          '<div class="skeleton-line price"></div>' +
          '<div class="skeleton-line price-sub"></div>' +
          '</div>' +
          '</div>';
      }).join('');
    }

    // 邮箱读取时间受临时邮箱服务影响，先渲染占位能让操作反馈更连贯。
    function renderMailSkeletons(count = 2) {
      el.mailResults.innerHTML = Array.from({ length: count }).map(() => {
        return '<div class="mail-skeleton" aria-hidden="true">' +
          '<div class="skeleton-line title"></div>' +
          '<div class="skeleton-line meta"></div>' +
          '<div class="skeleton-line meta"></div>' +
          '</div>';
      }).join('');
    }

    async function loadCatalog() {
      state.session = null;
      state.plansExpanded = false;
      clearPaypal();
      setCreateButtonLoading(false);
      el.createBtn.disabled = true;
      renderPlanSkeletons();
      el.planControl.hidden = true;
      setStatus('读取官方套餐中。');
      const countryCode = el.country.value;
      console.debug('[superalink] catalog loading skeleton rendered', { countryCode });
      try {
        const data = await api('/api/catalog?countryCode=' + encodeURIComponent(countryCode));
        state.catalog = data.products || [];
        const preferred = state.catalog.find(item => item.sku === data.defaultSku) || state.catalog[0];
        state.selectedSku = preferred ? preferred.sku : '';
        renderPlans();
        setStatus(state.catalog.length ? '套餐已更新。' : '当前目的地没有可用套餐。', state.catalog.length ? 'ok' : 'warn');
      } catch (error) {
        state.catalog = [];
        state.selectedSku = '';
        el.plans.innerHTML = '<div class="empty">套餐读取失败</div>';
        setStatus(error.message || String(error), 'bad');
        renderSummary();
      } finally {
        setCreateButtonLoading(false);
      }
    }

    async function createCheckout() {
      if (state.isCreatingCheckout) return;
      const item = currentProduct();
      if (!item) return;
      setCreateButtonLoading(true);
      clearPaypal();
      setStatus('正在创建订单和邮箱。');
      console.debug('[Checkout] 创建订单开始', {
        countryCode: item.countryCode,
        sku: item.sku,
        currency: el.currency.value,
        quantity: Number.parseInt(el.quantity.value || '1', 10) || 1
      });
      try {
        const data = await api('/api/checkout/create', {
          method: 'POST',
          body: JSON.stringify({
            countryCode: item.countryCode,
            sku: item.sku,
            currency: el.currency.value,
            quantity: Number.parseInt(el.quantity.value || '1', 10) || 1
          })
        });
        state.session = data.session;
        el.sessionPanel.hidden = false;
        el.sessionCountry.textContent = countryPlainText(item.countryCode);
        el.sessionEmail.textContent = state.session.email;
        el.sessionOrder.textContent = state.session.orderId;
        el.mailLookupEmail.value = state.session.email;
        el.summaryAmount.textContent = state.session.amountDisplay || el.summaryAmount.textContent;
        setStatus('订单已创建，正在加载可用支付方式。', 'ok');
        console.debug('[Checkout] 创建订单成功', {
          orderId: state.session.orderId,
          email: state.session.email,
          amount: state.session.amountDisplay || '',
          paymentMethods: state.session.paymentMethods || {}
        });
        await setupPaymentMethods();
      } catch (error) {
        setStatus(error.message || String(error), 'bad');
        console.debug('[Checkout] 创建订单失败', error);
      } finally {
        setCreateButtonLoading(false);
      }
    }

    function clearPaypal() {
      state.paypalLoadedForCurrency = '';
      el.paypalHost.innerHTML = '';
      el.alipayHost.innerHTML = '';
      el.alipayHost.hidden = true;
      el.sessionPanel.hidden = true;
      el.sessionCountry.textContent = '--';
      if (state.pollTimer) {
        clearInterval(state.pollTimer);
        state.pollTimer = null;
      }
    }

    function loadPaypalSdk(currency) {
      return new Promise((resolve, reject) => {
        if (window.paypal && state.paypalLoadedForCurrency === currency) {
          resolve(window.paypal);
          return;
        }
        const existing = document.querySelector('script[data-paypal-sdk="true"]');
        if (existing) existing.remove();
        delete window.paypal;

        const clientId = CONFIG.paypalClientId;
        if (!clientId) {
          reject(new Error('缺少 PayPal client id'));
          return;
        }
        const script = document.createElement('script');
        const paypalCurrency = currency === 'KRW' ? 'USD' : currency;
        script.dataset.paypalSdk = 'true';
        // 只加载 PayPal 钱包按钮，避免 SDK 自动展示信用卡、Pay Later 等额外入口。
        script.src = 'https://www.paypal.com/sdk/js?client-id=' + encodeURIComponent(clientId) + '&currency=' + encodeURIComponent(paypalCurrency) + '&intent=capture&components=buttons&disable-funding=card,credit,paylater,venmo';
        script.onload = () => {
          state.paypalLoadedForCurrency = currency;
          window.paypal ? resolve(window.paypal) : reject(new Error('PayPal SDK 未返回'));
        };
        script.onerror = () => reject(new Error('PayPal SDK 加载失败'));
        document.head.appendChild(script);
      });
    }

    async function setupPaymentMethods() {
      if (!state.session) return;
      const paymentMethods = state.session.paymentMethods || {};
      const paypalAvailable = paymentMethods.paypal && paymentMethods.paypal.available;
      const alipay = paymentMethods.alipay || {};
      const alipayAvailable = state.session.currency === 'CNY' && alipay.available && alipay.redirectUrl;

      el.paypalHost.innerHTML = '';
      el.alipayHost.innerHTML = '';
      el.alipayHost.hidden = true;

      console.debug('[Checkout] 支付方式探测结果', {
        orderId: state.session.orderId,
        currency: state.session.currency,
        paypalAvailable,
        alipayAvailable,
        alipayReason: alipay.reason || ''
      });

      if (alipayAvailable) {
        setupAlipay(alipay);
        setStatus('订单已创建，可使用支付宝支付。', 'ok');
        return;
      }

      if (state.session.currency === 'CNY') {
        setStatus('当前人民币订单未检测到支付宝可用，请更换币种或稍后再试。' + (alipay.reason ? ' 原因: ' + alipay.reason : ''), 'warn');
        return;
      }

      if (paypalAvailable) {
        setStatus('订单已创建，可使用 PayPal 支付。', 'ok');
        await setupPaypal();
        return;
      }

      setStatus('当前订单未检测到可用支付方式。', 'bad');
    }

    function setupAlipay(alipay) {
      el.alipayHost.hidden = false;
      el.alipayHost.innerHTML = '<button id="alipayPayBtn" class="method alipay" type="button">使用支付宝支付</button>';
      const button = document.getElementById('alipayPayBtn');
      if (!button) return;
      button.addEventListener('click', async () => {
        if (!state.session) return;
        const paymentWindow = window.open('', '_blank', 'noopener,noreferrer');
        console.debug('[Checkout] 打开支付宝支付', {
          orderId: state.session.orderId,
          currency: state.session.currency,
          redirectUrl: alipay.redirectUrl,
          popupCreated: Boolean(paymentWindow)
        });
        try {
          await api('/api/alipay/start-collection', {
            method: 'POST',
            body: JSON.stringify({ token: state.session.token })
          });
          setStatus('已打开支付宝付款页，完成后请回到本页等待 eSIM 邮件。', 'ok');
          if (paymentWindow) {
            paymentWindow.location.href = alipay.redirectUrl;
          } else {
            window.location.href = alipay.redirectUrl;
          }
          startStatusPolling();
        } catch (error) {
          if (paymentWindow) paymentWindow.close();
          setStatus(error.message || String(error), 'bad');
          console.debug('[Checkout] 支付宝收集启动失败', error);
        }
      });
    }

    async function setupPaypal() {
      if (!state.session) return;
      el.paypalHost.innerHTML = '';
      try {
        const paypal = await loadPaypalSdk(state.session.currency);
        paypal.Buttons({
          // 固定 fundingSource，确保支付区域只渲染 Lee 要求保留的 PayPal 品牌按钮。
          fundingSource: paypal.FUNDING && paypal.FUNDING.PAYPAL ? paypal.FUNDING.PAYPAL : 'paypal',
          style: {
            layout: 'vertical',
            color: 'gold',
            shape: 'rect',
            label: 'paypal',
            height: 48
          },
          createOrder: async () => {
            const data = await api('/api/paypal/create', {
              method: 'POST',
              body: JSON.stringify({ token: state.session.token })
            });
            return data.paypalOrderId;
          },
          onApprove: async data => {
            await api('/api/paypal/capture', {
              method: 'POST',
              body: JSON.stringify({ token: state.session.token, paypalOrderId: data.orderID })
            });
            setStatus('支付已提交，正在等待 eSIM 邮件。', 'ok');
            startStatusPolling();
          },
          onCancel: () => setStatus('PayPal 已取消。', 'warn'),
          onError: err => setStatus('PayPal 错误: ' + (err && err.message ? err.message : String(err)), 'bad')
        }).render('#paypalHost');
      } catch (error) {
        setStatus(error.message || String(error), 'bad');
      }
    }

    async function lookupLatestMail() {
      const email = el.mailLookupEmail.value.trim();
      if (!email) {
        setMailStatus('请输入邮箱。', 'warn');
        return;
      }

      setButtonLoading(el.mailLookupBtn, true, '查询中');
      renderMailSkeletons();
      setMailStatus('正在读取收件箱。');
      console.debug('[superalink] mail lookup loading started', { email });
      try {
        const data = await api('/api/mail/latest', {
          method: 'POST',
          body: JSON.stringify({ email, limit: 2 })
        });
        if (!data.messages || data.messages.length === 0) {
          el.mailResults.innerHTML = '<div class="empty">当前收件箱没有邮件</div>';
          setMailStatus('收件箱可访问，当前没有邮件。', 'warn');
          return;
        }
        el.mailResults.innerHTML = data.messages.map(message => renderMailItem(message)).join('');
        setMailStatus('已读取 ' + data.messages.length + ' 条邮件，总数 ' + data.total + '。', 'ok');
      } catch (error) {
        el.mailResults.innerHTML = '<div class="empty">邮件读取失败，请查看状态信息。</div>';
        setMailStatus(error.message || String(error), 'bad');
      } finally {
        setButtonLoading(el.mailLookupBtn, false);
      }
    }

    function renderMailItem(message) {
      const code = message.verificationCode
        ? '<span class="mail-code">验证码 ' + escapeHtml(message.verificationCode) + '</span>'
        : '<span class="mail-code" style="background:#f2f4f7;color:#667085">无验证码</span>';
      const from = message.from ? '<div class="mail-preview">From: ' + escapeHtml(message.from) + '</div>' : '';
      const time = message.receivedAt ? '<div class="mail-preview">' + escapeHtml(message.receivedAt) + '</div>' : '';
      const urls = (message.urls || []).slice(0, 2).map(url => {
        return '<a class="mail-link" href="' + escapeHtml(url) + '" target="_blank" rel="noopener noreferrer">' + escapeHtml(url) + '</a>';
      }).join('');
      return '<div class="mail-item">' +
        '<div class="mail-item-head"><div><div class="mail-subject">' + escapeHtml(message.subject || '无标题') + '</div>' + time + '</div>' + code + '</div>' +
        from +
        '<div class="mail-preview">' + escapeHtml(message.textPreview || '') + '</div>' +
        (urls ? '<div>' + urls + '</div>' : '') +
        '</div>';
    }

    function startStatusPolling() {
      if (!state.session || state.pollTimer) return;
      state.pollTimer = setInterval(async () => {
        try {
          const data = await api('/api/checkout/status?token=' + encodeURIComponent(state.session.token));
          const status = data.session && data.session.status;
          if (data.session) state.session = data.session;
          if (status === 'esim_received') {
            setStatus('eSIM 邮件已收集，本地记录已保存。', 'ok');
            clearInterval(state.pollTimer);
            state.pollTimer = null;
            setActiveView('history');
            await showHistoryDetail(state.session.token, '当前 eSIM 信息', true);
            await loadHistory();
          } else if (status === 'mail_timeout' || status === 'payment_failed') {
            setStatus(data.session.statusText || '支付后收集失败，请看服务端日志。', 'bad');
            clearInterval(state.pollTimer);
            state.pollTimer = null;
            await loadHistory();
          } else if (status === 'collecting_mail') {
            setStatus('正在轮询邮箱。', 'ok');
          }
        } catch (error) {
          setStatus(error.message || String(error), 'bad');
        }
      }, 5000);
    }

    el.country.addEventListener('change', loadCatalog);
    el.currency.addEventListener('change', () => {
      state.session = null;
      clearPaypal();
      renderPlans();
    });
    el.quantity.addEventListener('input', renderSummary);
    el.planFilter.addEventListener('input', () => {
      state.plansExpanded = false;
      renderPlans();
    });
    el.planToggleBtn.addEventListener('click', () => {
      state.plansExpanded = !state.plansExpanded;
      renderPlans();
    });
    el.createBtn.addEventListener('click', createCheckout);
    el.navButtons.forEach(button => {
      button.addEventListener('click', () => {
        setActiveView(button.getAttribute('data-view-target') || 'purchase');
      });
    });
    el.historyRefreshBtn.addEventListener('click', () => loadHistory());
    el.mailLookupBtn.addEventListener('click', lookupLatestMail);
    el.mailLookupEmail.addEventListener('keydown', event => {
      if (event.key === 'Enter') {
        event.preventDefault();
        lookupLatestMail();
      }
    });

    renderCountries();
    loadHistory({ selectLatest: true });
    loadCatalog();
  </script>
</body>
</html>`
}
