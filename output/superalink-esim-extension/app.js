const STORE_API_BASE = 'https://storefront.api.superalink.com';
const SUPERALINK_BASE_URL = 'https://www.superalink.com';
const DEFAULT_LOCALE = 'en';
const DEFAULT_COUPON = 'FRONT0000';
const DEFAULT_COUNTRY_CODE = 'CN';
const DEFAULT_CURRENCY = 'THB';
const DEFAULT_SKU = 'CN-5GB_UNLIMITED-5GB-5-DAYS';
const PLAN_COLLAPSED_LIMIT = 5;
const STORAGE_KEYS = {
  orders: 'superalinkOrders',
  settings: 'superalinkSettings'
};

const COUNTRIES = [
  { code: 'CN', name: 'China Mainland', zhName: '中国大陆', flag: '🇨🇳' },
  { code: 'HK', name: 'Hong Kong', zhName: '中国香港', flag: '🇭🇰' },
  { code: 'HK_MO', name: 'Hong Kong / Macau', zhName: '中国香港 / 澳门', flag: '🇭🇰🇲🇴' },
  { code: 'JP', name: 'Japan', zhName: '日本', flag: '🇯🇵' },
  { code: 'KR', name: 'South Korea', zhName: '韩国', flag: '🇰🇷' },
  { code: 'KR_JP', name: 'South Korea / Japan', zhName: '韩国 / 日本', flag: '🇰🇷🇯🇵' },
  { code: 'SG', name: 'Singapore', zhName: '新加坡', flag: '🇸🇬' },
  { code: 'TH', name: 'Thailand', zhName: '泰国', flag: '🇹🇭' },
  { code: 'MY', name: 'Malaysia', zhName: '马来西亚', flag: '🇲🇾' },
  { code: 'VN', name: 'Vietnam', zhName: '越南', flag: '🇻🇳' },
  { code: 'PH', name: 'Philippines', zhName: '菲律宾', flag: '🇵🇭' },
  { code: 'ID', name: 'Indonesia', zhName: '印度尼西亚', flag: '🇮🇩' },
  { code: 'TW', name: 'Taiwan', zhName: '中国台湾', flag: '🇹🇼' },
  { code: 'US', name: 'United States', zhName: '美国', flag: '🇺🇸' },
  { code: 'US_CA', name: 'United States / Canada', zhName: '美国 / 加拿大', flag: '🇺🇸🇨🇦' },
  { code: 'GB', name: 'United Kingdom', zhName: '英国', flag: '🇬🇧' },
  { code: 'AU', name: 'Australia', zhName: '澳大利亚', flag: '🇦🇺' },
  { code: 'FR', name: 'France', zhName: '法国', flag: '🇫🇷' },
  { code: 'DE', name: 'Germany', zhName: '德国', flag: '🇩🇪' },
  { code: 'ES', name: 'Spain', zhName: '西班牙', flag: '🇪🇸' },
  { code: 'IT', name: 'Italy', zhName: '意大利', flag: '🇮🇹' },
  { code: 'MX', name: 'Mexico', zhName: '墨西哥', flag: '🇲🇽' },
  { code: 'SA', name: 'Saudi Arabia', zhName: '沙特阿拉伯', flag: '🇸🇦' },
  { code: 'AE', name: 'United Arab Emirates', zhName: '阿联酋', flag: '🇦🇪' },
  { code: 'WW_109', name: 'Global 109 Countries', zhName: '全球 109 国家和地区', flag: '🌐' }
];

const COUNTRY_SLUGS = {
  CN: 'china-mainland',
  HK: 'hong-kong',
  HK_MO: 'hong-kong-macau',
  JP: 'japan',
  KR: 'south-korea',
  KR_JP: 'south-korea-japan',
  SG: 'singapore',
  TH: 'thailand',
  MY: 'malaysia',
  VN: 'vietnam',
  PH: 'philippines',
  ID: 'indonesia',
  TW: 'taiwan',
  US: 'united-states',
  US_CA: 'united-states-canada',
  GB: 'united-kingdom',
  AU: 'australia',
  FR: 'france',
  DE: 'germany',
  ES: 'spain',
  IT: 'italy',
  MX: 'mexico',
  SA: 'saudi-arabia',
  AE: 'united-arab-emirates',
  WW_109: 'global-109-countries'
};

const DEFAULT_VISIBLE_DAYS = [5, 7, 10, 12, 15, 20, 30];
const VISIBLE_DAYS_BY_COUNTRY = {
  CN: [5, 6, 7, 10, 12, 15, 20, 30],
  US: [5, 6, 7, 10, 12, 15, 20, 30],
  AU: [5, 6, 7, 10, 12, 15, 20, 30],
  KR: [5, 6, 7, 10, 12, 15, 20, 30],
  JP: [5, 6, 7, 10, 12, 15, 20, 30],
  SG: [5, 6, 7, 10, 12, 15, 20, 30],
  TH: [6, 7, 10, 12, 15, 20, 30],
  MY: [6, 7, 10, 12, 15, 20, 30],
  MX: [5, 6, 7, 10, 12, 15, 20, 30],
  SA: [5, 6, 7, 10, 12, 15, 20, 30]
};

const DISCOUNT_CAPS = {
  THB: { amount: 175, symbol: '฿', decimals: 2 },
  USD: { amount: 5, symbol: '$', decimals: 2 },
  EUR: { amount: 4, symbol: '€', decimals: 2 },
  GBP: { amount: 4, symbol: '£', decimals: 2 },
  SGD: { amount: 6.75, symbol: 'S$', decimals: 2 },
  CNY: { amount: 36.25, symbol: '¥', decimals: 2 },
  JPY: { amount: 775, symbol: '¥', decimals: 0 },
  KRW: { amount: 6750, symbol: '₩', decimals: 0 },
  IDR: { amount: 80000, symbol: 'Rp', decimals: 0 }
};

const CURRENCY_SYMBOLS = {
  THB: '฿',
  USD: '$',
  EUR: '€',
  GBP: '£',
  SGD: 'S$',
  CNY: '¥',
  JPY: '¥',
  KRW: '₩',
  IDR: 'Rp',
  AUD: 'A$',
  HKD: 'HK$',
  TWD: 'NT$'
};

const state = {
  activeView: 'purchase',
  rawProducts: [],
  catalog: [],
  selectedSku: '',
  plansExpanded: false,
  orders: [],
  activeOrderId: '',
  currentOrderId: ''
};

const el = {
  navButtons: Array.from(document.querySelectorAll('.nav')),
  views: {
    purchase: document.getElementById('purchaseView'),
    history: document.getElementById('historyView'),
    mail: document.getElementById('mailView'),
    settings: document.getElementById('settingsView')
  },
  country: document.getElementById('country'),
  currency: document.getElementById('currency'),
  quantity: document.getElementById('quantity'),
  mailProvider: document.getElementById('mailProvider'),
  plans: document.getElementById('plans'),
  planControl: document.getElementById('planControl'),
  planCountText: document.getElementById('planCountText'),
  planToggleBtn: document.getElementById('planToggleBtn'),
  summaryTitle: document.getElementById('summaryTitle'),
  summaryAmount: document.getElementById('summaryAmount'),
  summaryPlan: document.getElementById('summaryPlan'),
  summarySku: document.getElementById('summarySku'),
  summaryQty: document.getElementById('summaryQty'),
  createOrderBtn: document.getElementById('createOrderBtn'),
  currentOrderPanel: document.getElementById('currentOrderPanel'),
  currentOrderCountry: document.getElementById('currentOrderCountry'),
  currentOrderEmail: document.getElementById('currentOrderEmail'),
  currentOrderId: document.getElementById('currentOrderId'),
  openPaymentBtn: document.getElementById('openPaymentBtn'),
  copyCurrentEmailBtn: document.getElementById('copyCurrentEmailBtn'),
  goMailBtn: document.getElementById('goMailBtn'),
  purchaseStatus: document.getElementById('purchaseStatus'),
  topStatus: document.getElementById('topStatus'),
  historyStatus: document.getElementById('historyStatus'),
  historyList: document.getElementById('historyList'),
  detailPanel: document.getElementById('detailPanel'),
  refreshHistoryBtn: document.getElementById('refreshHistoryBtn'),
  mailOrderSelect: document.getElementById('mailOrderSelect'),
  collectMailBtn: document.getElementById('collectMailBtn'),
  listMailBtn: document.getElementById('listMailBtn'),
  manualMailText: document.getElementById('manualMailText'),
  parseManualMailBtn: document.getElementById('parseManualMailBtn'),
  mailStatus: document.getElementById('mailStatus'),
  mailResults: document.getElementById('mailResults'),
  exportBtn: document.getElementById('exportBtn'),
  importFile: document.getElementById('importFile'),
  storageStatus: document.getElementById('storageStatus')
};

function setStatus(target, text, tone = '') {
  target.textContent = text;
  target.className = 'status' + (tone ? ' ' + tone : '');
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

function setActiveView(view) {
  state.activeView = view;
  el.navButtons.forEach(button => button.classList.toggle('active', button.dataset.view === view));
  Object.entries(el.views).forEach(([name, panel]) => panel.classList.toggle('active', name === view));
  if (view === 'history') renderHistory();
  if (view === 'mail') renderMailOrderSelect();
  console.debug('[superalink-extension] view switched', { view });
}

async function storageGet(defaults) {
  return chrome.storage.local.get(defaults);
}

async function storageSet(value) {
  await chrome.storage.local.set(value);
}

async function loadOrders() {
  const data = await storageGet({ [STORAGE_KEYS.orders]: [] });
  state.orders = Array.isArray(data[STORAGE_KEYS.orders]) ? data[STORAGE_KEYS.orders] : [];
}

async function saveOrders() {
  state.orders.sort((left, right) => Date.parse(right.updatedAt || right.createdAt || '') - Date.parse(left.updatedAt || left.createdAt || ''));
  await storageSet({ [STORAGE_KEYS.orders]: state.orders });
}

function upsertOrder(order) {
  const index = state.orders.findIndex(item => item.id === order.id);
  if (index >= 0) state.orders[index] = order;
  else state.orders.unshift(order);
}

async function apiJson(url, options = {}, description = '请求') {
  const response = await fetch(url, options);
  const text = await response.text();
  if (!response.ok) throw new Error(`${description}失败: HTTP ${response.status} ${text.slice(0, 260)}`);
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`${description}返回不是 JSON`);
  }
}

function storefrontHeaders(pageUrl) {
  const url = new URL(pageUrl);
  return {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'Accept-Language': DEFAULT_LOCALE,
    'X-Page-URL': pageUrl,
    'X-Page-Path': `${url.pathname}${url.search}`,
    'X-Page-Origin': SUPERALINK_BASE_URL
  };
}

async function setCheckoutCookies(buyerSessionId) {
  const cookies = [
    { url: STORE_API_BASE, name: 'splnk_checkout_session', value: buyerSessionId },
    { url: STORE_API_BASE, name: 'NEXT_LOCALE', value: DEFAULT_LOCALE },
    { url: SUPERALINK_BASE_URL, name: 'splnk_checkout_session', value: buyerSessionId },
    { url: SUPERALINK_BASE_URL, name: 'NEXT_LOCALE', value: DEFAULT_LOCALE }
  ];

  for (const cookie of cookies) {
    await chrome.cookies.set({
      ...cookie,
      path: '/',
      secure: true,
      sameSite: 'no_restriction'
    });
  }
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

// 临时邮箱接口有时响应较慢，先展示邮件占位能让操作反馈更稳定。
function renderMailSkeletons(count = 3) {
  el.mailResults.innerHTML = Array.from({ length: count }).map(() => {
    return '<div class="mail-skeleton" aria-hidden="true">' +
      '<div class="skeleton-line title"></div>' +
      '<div class="skeleton-line meta"></div>' +
      '<div class="skeleton-line meta"></div>' +
      '</div>';
  }).join('');
}

async function loadCatalog() {
  const countryCode = el.country.value;
  state.plansExpanded = false;
  renderPlanSkeletons();
  el.planControl.hidden = true;
  setStatus(el.purchaseStatus, '读取官方套餐中。');
  console.debug('[superalink-extension] catalog loading skeleton rendered', { countryCode });
  try {
    const groups = await apiJson(`${STORE_API_BASE}/products?country_code=${encodeURIComponent(countryCode)}`, {
      headers: { Accept: 'application/json', 'Accept-Language': DEFAULT_LOCALE }
    }, '读取套餐');
    state.rawProducts = groups.flatMap(group => Array.isArray(group?.products) ? group.products : []);
    state.catalog = uniqueCatalog(state.rawProducts
      .filter(product => isVisibleProduct(product, countryCode))
      .map(product => toCatalogProduct(product, countryCode))
      .filter(Boolean));
    const preferred = state.catalog.find(item => item.sku === DEFAULT_SKU) || state.catalog[0];
    state.selectedSku = preferred?.sku || '';
    renderPlans();
    setStatus(el.purchaseStatus, state.catalog.length ? '套餐已更新。' : '当前目的地没有可用套餐。', state.catalog.length ? 'ok' : 'warn');
  } catch (error) {
    state.rawProducts = [];
    state.catalog = [];
    state.selectedSku = '';
    el.plans.innerHTML = '<div class="empty">套餐读取失败</div>';
    setStatus(el.purchaseStatus, error.message || String(error), 'bad');
    renderSummary();
  }
}

function uniqueCatalog(items) {
  const seen = new Set();
  return items.filter(item => {
    if (seen.has(item.sku)) return false;
    seen.add(item.sku);
    return true;
  }).sort((left, right) => left.durationDays - right.durationDays || left.sku.localeCompare(right.sku));
}

function isVisibleProduct(product, countryCode) {
  const days = durationDays(product);
  const data = productDataAmount(product);
  const allowedDays = VISIBLE_DAYS_BY_COUNTRY[countryCode] || DEFAULT_VISIBLE_DAYS;
  return product?.dataPlan?.option === 'UNLIMITED'
    && Number(data.amount || 0) === 5
    && String(data.unit || '').toUpperCase() === 'GB'
    && days !== undefined
    && allowedDays.includes(days)
    && Boolean(product.sku);
}

function toCatalogProduct(product, countryCode) {
  const sku = product.sku;
  const duration = durationDays(product);
  const data = productDataAmount(product);
  if (!sku || !duration) return undefined;
  const dataText = `${data.amount || ''}${data.unit || ''}`;
  return {
    countryCode,
    sku,
    option: product.dataPlan?.option || 'UNLIMITED',
    durationDays: duration,
    dataText,
    dailyDataText: dataText,
    prices: product.price || {},
    discountedPrices: discountedPrices(product)
  };
}

function productDataAmount(product) {
  if (product?.dataPlan?.option === 'UNLIMITED') return product.dataPlan?.FUP?.data || {};
  return product?.dataPlan?.data?.data || {};
}

function durationDays(product) {
  const duration = product?.dataPlan?.data?.duration;
  if (!duration?.value) return undefined;
  if (duration.unit === 'MILLISECONDS') return Math.round(duration.value / 86400000);
  if (duration.unit === 'DAYS') return duration.value;
  return undefined;
}

function discountedPrices(product) {
  const result = {};
  for (const [currency, price] of Object.entries(product.price || {})) {
    const cap = DISCOUNT_CAPS[currency];
    if (!cap || typeof price.amount !== 'number') continue;
    const amount = Math.max(0, roundCurrencyAmount(price.amount - cap.amount, cap.decimals));
    result[currency] = {
      amount,
      decimals: cap.decimals,
      symbol: cap.symbol,
      display: formatPrice(currency, amount),
      formattedAmount: cap.decimals === 0 ? String(Math.round(amount)) : amount.toFixed(cap.decimals),
      inUse: price.inUse
    };
  }
  return result;
}

function roundCurrencyAmount(value, decimals) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function formatPrice(currency, amount) {
  const decimals = DISCOUNT_CAPS[currency]?.decimals || (['JPY', 'KRW', 'IDR'].includes(currency) ? 0 : 2);
  const symbol = CURRENCY_SYMBOLS[currency] || `${currency} `;
  return `${symbol}${decimals === 0 ? Math.round(amount) : amount.toFixed(decimals)}`;
}

function currentProduct() {
  const catalogItem = state.catalog.find(item => item.sku === state.selectedSku) || state.catalog[0];
  if (!catalogItem) return undefined;
  return state.rawProducts.find(product => product.sku === catalogItem.sku);
}

function currentCatalogItem() {
  return state.catalog.find(item => item.sku === state.selectedSku) || state.catalog[0];
}

function priceFor(item, currency) {
  if (!item) return undefined;
  return item.discountedPrices?.[currency] || item.prices?.[currency];
}

function countryMeta(code) {
  return COUNTRIES.find(country => country.code === code) || {
    code,
    name: code,
    zhName: code,
    flag: '🌐'
  };
}

function countryOptionLabel(country) {
  return `${country.flag} ${country.zhName} · ${country.name} · ${country.code}`;
}

function countryPlainText(code) {
  if (!code) return '--';
  const country = countryMeta(code);
  return `${country.flag} ${country.zhName} · ${country.name} · ${country.code}`;
}

function countrySummaryHtml(code) {
  const country = countryMeta(code);
  return `<span class="country-heading"><span class="country-flag">${escapeHtml(country.flag)}</span><span class="country-copy"><strong>${escapeHtml(country.zhName)}</strong><small>${escapeHtml(`${country.name} · ${country.code}`)}</small></span></span>`;
}

function formatPlan(item) {
  const dataText = item.option === 'UNLIMITED' ? `${item.dailyDataText} per day` : item.dataText;
  return `${item.durationDays} Days · ${dataText}`;
}

function renderPlans() {
  if (state.catalog.length === 0) {
    el.plans.innerHTML = '<div class="empty">没有可用套餐</div>';
    el.planControl.hidden = true;
    renderSummary();
    return;
  }

  let visibleItems = state.plansExpanded ? state.catalog : state.catalog.slice(0, PLAN_COLLAPSED_LIMIT);
  const selectedItem = state.catalog.find(item => item.sku === state.selectedSku);
  if (!state.plansExpanded && selectedItem && !visibleItems.some(item => item.sku === selectedItem.sku)) {
    visibleItems = [selectedItem, ...visibleItems.filter(item => item.sku !== selectedItem.sku)].slice(0, PLAN_COLLAPSED_LIMIT);
  }

  el.plans.innerHTML = visibleItems.map(item => {
    const active = item.sku === state.selectedSku ? ' active' : '';
    const price = priceFor(item, el.currency.value);
    return `<button type="button" class="plan-row${active}" data-sku="${escapeHtml(item.sku)}">
      <div><div class="plan-title">${escapeHtml(formatPlan(item))}</div><div class="plan-meta"><span class="country-inline">${escapeHtml(countryPlainText(item.countryCode))}</span> · ${escapeHtml(item.sku)}</div></div>
      <div class="plan-price">${escapeHtml(price?.display || '--')}<small>after coupon</small></div>
    </button>`;
  }).join('');

  const canToggle = state.catalog.length > PLAN_COLLAPSED_LIMIT;
  el.planControl.hidden = !canToggle;
  el.planToggleBtn.textContent = state.plansExpanded ? '收起' : '查看更多';
  el.planCountText.textContent = state.plansExpanded
    ? `已展示全部 ${state.catalog.length} 个套餐`
    : `已展示 ${visibleItems.length} / ${state.catalog.length} 个套餐`;

  el.plans.querySelectorAll('[data-sku]').forEach(button => {
    button.addEventListener('click', () => {
      state.selectedSku = button.dataset.sku || '';
      renderPlans();
    });
  });

  renderSummary();
}

function renderSummary() {
  const item = currentCatalogItem();
  const quantity = Number.parseInt(el.quantity.value || '1', 10) || 1;
  el.summaryQty.textContent = String(quantity);
  if (!item) {
    el.summaryTitle.innerHTML = countrySummaryHtml(el.country.value);
    el.summaryAmount.textContent = '--';
    el.summaryPlan.textContent = '--';
    el.summarySku.textContent = '--';
    return;
  }
  const price = priceFor(item, el.currency.value);
  el.summaryTitle.innerHTML = countrySummaryHtml(item.countryCode);
  el.summaryAmount.textContent = price?.display || '--';
  el.summaryPlan.textContent = formatPlan(item);
  el.summarySku.textContent = item.sku;
}

async function createMailbox(provider) {
  if (provider === '1secmail') {
    const addresses = await apiJson('https://www.1secmail.com/api/v1/?action=genRandomMailbox&count=1', {
      headers: { Accept: 'application/json' }
    }, '创建邮箱');
    const email = addresses?.[0];
    if (!email) throw new Error('1secmail 未返回邮箱地址');
    return { email, token: email, provider };
  }

  const data = await apiJson('https://api.tempmail.lol/v2/inbox/create', {
    headers: { Accept: 'application/json' }
  }, '创建邮箱');
  if (!data.address || !data.token) throw new Error('tempmail.lol 未返回邮箱 token');
  return { email: data.address, token: data.token, provider };
}

async function createOrder() {
  const product = currentProduct();
  const catalogItem = currentCatalogItem();
  if (!product || !catalogItem) return;

  setButtonLoading(el.createOrderBtn, true, '创建中');
  setStatus(el.purchaseStatus, '正在创建邮箱和 checkout。');
  try {
    const countryCode = el.country.value;
    const currency = el.currency.value;
    const quantity = Number.parseInt(el.quantity.value || '1', 10) || 1;
    const mailbox = await createMailbox(el.mailProvider.value);
    const productUrl = officialProductUrl(countryCode, product, currency);
    const headers = storefrontHeaders(productUrl);
    const payload = {
      sku: product.sku,
      qty: quantity,
      currency,
      isExtension: false,
      coupon: DEFAULT_COUPON
    };

    console.debug('[Superalink Extension] create checkout payload', payload);
    const createResult = await apiJson(`${STORE_API_BASE}/v2/checkout`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    }, '创建 checkout');
    const order = createResult.order || createResult;
    const orderId = required(order.uniqueId, '官方接口未返回订单号');
    const buyerSessionId = required(order.buyer?.sessionID, '官方接口未返回 checkout session');
    await setCheckoutCookies(buyerSessionId);

    const updateResult = await apiJson(`${STORE_API_BASE}/v2/checkout/${encodeURIComponent(orderId)}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: storefrontHeaders(productUrl),
      body: JSON.stringify({
        voucherRecipientEmail: mailbox.email,
        voucherRecipientIsSubscribingToNewsletter: false
      })
    }, '写入接收邮箱');
    const updatedOrder = updateResult.order || updateResult;

    const now = new Date().toISOString();
    const record = {
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
      status: 'created',
      statusText: '订单已创建，等待付款',
      mailbox,
      email: mailbox.email,
      orderId,
      buyerSessionId,
      checkoutUrl: checkoutUrl(orderId, product, currency),
      officialProductUrl: productUrl,
      affiliateCode: DEFAULT_COUPON,
      coupon: DEFAULT_COUPON,
      countryCode,
      sku: product.sku,
      quantity,
      currency,
      amountDisplay: extractAmountDisplay(updatedOrder, currency) || extractAmountDisplay(order, currency) || priceFor(catalogItem, currency)?.display,
      esimMailInfo: []
    };

    upsertOrder(record);
    state.activeOrderId = record.id;
    state.currentOrderId = record.id;
    await saveOrders();
    renderHistory();
    renderMailOrderSelect();
    renderCurrentOrder(record);
    setStatus(el.purchaseStatus, `订单已创建，请手动打开付款页。邮箱: ${mailbox.email}`, 'ok');
  } catch (error) {
    console.debug('[Superalink Extension] create order failed', error);
    setStatus(el.purchaseStatus, error.message || String(error), 'bad');
  } finally {
    setButtonLoading(el.createOrderBtn, false);
  }
}

function currentCreatedOrder() {
  return state.orders.find(order => order.id === state.currentOrderId);
}

function renderCurrentOrder(order) {
  if (!order) {
    el.currentOrderPanel.hidden = true;
    return;
  }
  el.currentOrderPanel.hidden = false;
  el.currentOrderCountry.textContent = countryPlainText(order.countryCode || '');
  el.currentOrderEmail.textContent = order.email || '--';
  el.currentOrderId.textContent = order.orderId || '--';
}

function openCurrentPaymentPage() {
  const order = currentCreatedOrder();
  if (!order?.checkoutUrl) {
    setStatus(el.purchaseStatus, '当前没有可打开的付款页。', 'warn');
    return;
  }
  chrome.tabs.create({ url: order.checkoutUrl });
}

async function copyCurrentEmail() {
  const order = currentCreatedOrder();
  if (!order?.email) {
    setStatus(el.purchaseStatus, '当前订单没有邮箱。', 'warn');
    return;
  }
  await navigator.clipboard.writeText(order.email);
  setStatus(el.purchaseStatus, '邮箱已复制。', 'ok');
}

function goMailViewWithCurrentOrder() {
  const order = currentCreatedOrder();
  if (order?.id) {
    state.activeOrderId = order.id;
    renderMailOrderSelect();
    el.mailOrderSelect.value = order.id;
  }
  setActiveView('mail');
}

function required(value, message) {
  if (!value) throw new Error(message);
  return value;
}

function officialProductUrl(countryCode, product, currency) {
  const slug = COUNTRY_SLUGS[countryCode] || countryCode.toLowerCase().replaceAll('_', '-');
  const url = new URL(`/${DEFAULT_LOCALE}/esim/${slug}`, SUPERALINK_BASE_URL);
  url.searchParams.set('affiliate_code', DEFAULT_COUPON);
  url.searchParams.set('duration', String(durationDays(product) || 5));
  url.searchParams.set('option', 'unlimited');
  url.searchParams.set('promo', 'affiliate-influencer');
  url.searchParams.set('utm_source', 'affiliate');
  url.searchParams.set('currency', currency);
  url.searchParams.set('coupon', DEFAULT_COUPON);
  return url.toString();
}

function checkoutUrl(orderId, product, currency) {
  const url = new URL(`/${DEFAULT_LOCALE}/checkout/${orderId}`, SUPERALINK_BASE_URL);
  url.searchParams.set('affiliate_code', DEFAULT_COUPON);
  url.searchParams.set('duration', String(durationDays(product) || 5));
  url.searchParams.set('option', 'unlimited');
  url.searchParams.set('promo', 'affiliate-influencer');
  url.searchParams.set('utm_source', 'affiliate');
  url.searchParams.set('currency', currency);
  url.searchParams.set('coupon', DEFAULT_COUPON);
  return url.toString();
}

function extractAmountDisplay(order, currency) {
  return order?.netPrice?.[currency]?.display
    || order?.prices?.net?.[currency]?.display
    || order?.grossPrice?.[currency]?.display
    || order?.prices?.gross?.[currency]?.display;
}

function renderHistory() {
  if (state.orders.length === 0) {
    el.historyList.innerHTML = '<div class="empty">暂无订单记录</div>';
    el.detailPanel.innerHTML = '<div class="empty">创建订单后会显示历史。</div>';
    setStatus(el.historyStatus, '暂无本地订单。', 'warn');
    return;
  }

  const activeId = state.activeOrderId || state.orders[0].id;
  state.activeOrderId = activeId;
  el.historyList.innerHTML = state.orders.map(order => {
    const active = order.id === activeId ? ' active' : '';
    const badgeClass = order.status === 'esim_received' ? ' ok' : (order.status === 'mail_timeout' ? ' bad' : '');
    const country = countryPlainText(order.countryCode || '');
    return `<button type="button" class="history-row${active}" data-order-id="${escapeHtml(order.id)}">
      <div class="history-main"><span>${escapeHtml(order.email || order.orderId)}</span><span class="badge${badgeClass}">${escapeHtml(order.statusText || order.status)}</span></div>
      <div class="history-meta">${escapeHtml(order.amountDisplay || order.currency || '--')} · ${escapeHtml(formatTime(order.updatedAt))}</div>
      <div class="history-meta">${escapeHtml(country)}</div>
      <div class="history-meta">${escapeHtml(order.sku || '--')}</div>
      <div class="history-meta">${escapeHtml(order.orderId || '--')}</div>
    </button>`;
  }).join('');
  el.historyList.querySelectorAll('[data-order-id]').forEach(button => {
    button.addEventListener('click', () => {
      state.activeOrderId = button.dataset.orderId || '';
      renderHistory();
    });
  });
  renderDetail(state.orders.find(order => order.id === activeId) || state.orders[0]);
  setStatus(el.historyStatus, `已读取 ${state.orders.length} 条记录。`, 'ok');
}

function renderDetail(order) {
  if (!order) return;
  const infos = order.esimMailInfo || [];
  const orderRows = [
    copyRow('目的地', countryPlainText(order.countryCode || ''), '目的地'),
    copyRow('邮箱', order.email, '邮箱'),
    copyRow('订单', order.orderId, '订单号'),
    copyRow('SKU', order.sku, 'SKU'),
    copyRow('金额', order.amountDisplay || order.currency || '', '金额')
  ].join('');
  const checkoutRows = [
    compactLinkRow('Checkout', order.checkoutUrl, 'Checkout 链接'),
    compactLinkRow('产品页', order.officialProductUrl, '产品页链接')
  ].join('');
  const esimBlocks = infos.length
    ? infos.map((info, index) => renderEsimInfo(info, index)).join('')
    : '<div class="empty">还没有 eSIM 信息。支付后到邮箱查询页点击收集。</div>';
  el.detailPanel.innerHTML = `<div class="esim-card"><div class="mail-subject">订单信息</div><div class="detail-grid">${orderRows}</div>
    <details><summary>订单链接</summary><div class="detail-grid">${checkoutRows}</div></details></div>${esimBlocks}`;
  attachCopyHandlers(el.detailPanel);
}

function renderEsimInfo(info, index) {
  const title = info.subject || `eSIM 邮件 ${index + 1}`;
  const primaryQr = (info.qrImageUrls || [])[0] || '';
  const qrBlock = primaryQr
    ? `<div class="qr-card"><a href="${escapeHtml(primaryQr)}" target="_blank" rel="noopener noreferrer"><img src="${escapeHtml(primaryQr)}" alt="eSIM QR Code"></a>${copyButton(primaryQr, '二维码链接')}</div>`
    : '<div class="qr-card"><div class="empty">未解析到二维码</div></div>';
  const detailRows = [
    ...(info.activationCodes || []).map((code, codeIndex) => copyRow(codeIndex === 0 ? 'LPA' : `LPA ${codeIndex + 1}`, code, 'LPA')),
    ...(info.iccids || []).map((iccid, iccidIndex) => copyRow(iccidIndex === 0 ? 'ICCID' : `ICCID ${iccidIndex + 1}`, iccid, 'ICCID')),
    ...(info.orderIds || []).map((orderId, orderIndex) => copyRow(orderIndex === 0 ? '邮件订单' : `邮件订单 ${orderIndex + 1}`, orderId, '邮件订单号')),
    activationActions(info.activationUrls || [])
  ].join('');
  const rawLinks = uniqueValues([...(info.activationUrls || []), ...(info.urls || [])])
    .slice(0, 10)
    .map((url, urlIndex) => compactLinkRow(`链接 ${urlIndex + 1}`, url, '链接'))
    .join('');
  return `<div class="esim-card"><div><div class="mail-subject">${escapeHtml(title)}</div>${info.from ? `<div class="mail-preview">From: ${escapeHtml(info.from)}</div>` : ''}</div>
    <div class="esim-hero">${qrBlock}<div class="detail-grid">${detailRows}</div></div>
    ${rawLinks ? `<details><summary>原始链接</summary><div class="detail-grid">${rawLinks}</div></details>` : ''}
    <details><summary>邮件摘要</summary><div class="preview-text">${escapeHtml(info.textPreview || '')}</div></details></div>`;
}

function activationActions(urls) {
  const items = uniqueValues(urls).slice(0, 4);
  if (!items.length) return '';
  return `<div class="install-actions">${items.map((url, index) => {
    const title = activationPlatform(url, index);
    return `<div class="install-link"><div class="install-link-title">${escapeHtml(title)}</div><div class="install-link-actions">
      <a class="open-link" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">打开</a>${copyButton(url, `${title}激活链接`)}</div></div>`;
  }).join('')}</div>`;
}

function activationPlatform(url, index) {
  const lower = String(url || '').toLowerCase();
  if (lower.includes('os=ios')) return 'iOS 激活';
  if (lower.includes('os=android')) return 'Android 激活';
  return `激活链接 ${index + 1}`;
}

function copyRow(label, value, copyLabel) {
  if (!value) return '';
  return `<div class="copy-row"><div class="copy-label">${escapeHtml(label)}</div><div class="copy-value">${escapeHtml(value)}</div>${copyButton(value, copyLabel || label)}</div>`;
}

function compactLinkRow(label, value, copyLabel) {
  if (!value) return '';
  return `<div class="copy-row"><div class="copy-label">${escapeHtml(label)}</div><a class="copy-value mail-link" href="${escapeHtml(value)}" target="_blank" rel="noopener noreferrer">${escapeHtml(shortUrl(value))}</a>${copyButton(value, copyLabel || label)}</div>`;
}

function copyButton(value, label) {
  return `<button class="copy-btn" type="button" data-copy="${escapeHtml(value)}" data-copy-label="${escapeHtml(label)}">复制</button>`;
}

function shortUrl(value) {
  try {
    const url = new URL(value);
    return `${url.hostname}${url.pathname && url.pathname !== '/' ? url.pathname : ''}${url.search ? ' ?' : ''}`;
  } catch {
    const text = String(value || '');
    return text.length > 72 ? `${text.slice(0, 69)}...` : text;
  }
}

function attachCopyHandlers(container) {
  container.querySelectorAll('[data-copy]').forEach(button => {
    button.addEventListener('click', async event => {
      event.preventDefault();
      await navigator.clipboard.writeText(button.dataset.copy || '');
      button.textContent = '已复制';
      window.setTimeout(() => { button.textContent = '复制'; }, 1200);
    });
  });
}

function renderMailOrderSelect() {
  el.mailOrderSelect.innerHTML = state.orders.map(order => `<option value="${escapeHtml(order.id)}">${escapeHtml(countryPlainText(order.countryCode || ''))} · ${escapeHtml(order.email || order.orderId)}</option>`).join('');
  if (state.activeOrderId) el.mailOrderSelect.value = state.activeOrderId;
}

async function listMessages(mailbox) {
  if (mailbox.provider === '1secmail') {
    const [login, domain] = mailbox.email.split('@');
    const list = await apiJson(`https://www.1secmail.com/api/v1/?action=getMessages&login=${encodeURIComponent(login)}&domain=${encodeURIComponent(domain)}`, {
      headers: { Accept: 'application/json' }
    }, '读取邮件列表');
    const messages = [];
    for (const item of list) {
      const detail = await apiJson(`https://www.1secmail.com/api/v1/?action=readMessage&login=${encodeURIComponent(login)}&domain=${encodeURIComponent(domain)}&id=${item.id}`, {
        headers: { Accept: 'application/json' }
      }, '读取邮件');
      messages.push({
        id: String(item.id),
        from: detail.from || item.from,
        subject: detail.subject || item.subject,
        text: detail.textBody || detail.body,
        html: detail.htmlBody,
        receivedAt: detail.date || item.date
      });
    }
    return messages;
  }

  const data = await apiJson(`https://api.tempmail.lol/v2/inbox?token=${encodeURIComponent(mailbox.token)}`, {
    headers: { Accept: 'application/json' }
  }, '读取邮件');
  return (data.emails || []).map((message, index) => ({
    id: message.id || `${message.subject || 'mail'}-${index}`,
    from: message.from,
    subject: message.subject,
    text: message.body,
    html: message.html,
    receivedAt: message.date
  }));
}

async function readSelectedMail() {
  const order = state.orders.find(item => item.id === el.mailOrderSelect.value);
  if (!order?.mailbox) throw new Error('请选择带邮箱 token 的订单');
  return { order, messages: await listMessages(order.mailbox) };
}

async function collectMail() {
  setButtonLoading(el.collectMailBtn, true, '收集中');
  renderMailSkeletons();
  setStatus(el.mailStatus, '正在读取邮箱并解析 eSIM 邮件。');
  console.debug('[superalink-extension] collect mail started', { orderId: el.mailOrderSelect.value });
  try {
    const { order, messages } = await readSelectedMail();
    const infos = messages.map(message => parseEsimMail(`${message.subject || ''}\n${message.text || ''}\n${message.html || ''}`, message.subject, message.from)).filter(Boolean);
    order.esimMailInfo = mergeEsimInfo(order.esimMailInfo || [], infos);
    order.status = infos.length ? 'esim_received' : 'mail_pending';
    order.statusText = infos.length ? '已收集 eSIM 邮件' : '邮箱可访问，未找到 eSIM 邮件';
    order.updatedAt = new Date().toISOString();
    upsertOrder(order);
    await saveOrders();
    renderMailMessages(messages);
    renderHistory();
    setStatus(el.mailStatus, order.statusText, infos.length ? 'ok' : 'warn');
  } catch (error) {
    el.mailResults.innerHTML = '<div class="empty">邮件读取失败，请查看状态信息。</div>';
    setStatus(el.mailStatus, error.message || String(error), 'bad');
  } finally {
    setButtonLoading(el.collectMailBtn, false);
  }
}

async function listLatestMail() {
  setButtonLoading(el.listMailBtn, true, '读取中');
  renderMailSkeletons();
  setStatus(el.mailStatus, '正在读取最新邮件。');
  console.debug('[superalink-extension] list latest mail started', { orderId: el.mailOrderSelect.value });
  try {
    const { messages } = await readSelectedMail();
    renderMailMessages(messages);
    setStatus(el.mailStatus, `已读取 ${messages.length} 条邮件。`, 'ok');
  } catch (error) {
    el.mailResults.innerHTML = '<div class="empty">邮件读取失败，请查看状态信息。</div>';
    setStatus(el.mailStatus, error.message || String(error), 'bad');
  } finally {
    setButtonLoading(el.listMailBtn, false);
  }
}

function renderMailMessages(messages) {
  if (!messages.length) {
    el.mailResults.innerHTML = '<div class="empty">当前收件箱没有邮件</div>';
    return;
  }
  el.mailResults.innerHTML = messages.slice(0, 5).map(message => `<div class="mail-item">
    <div class="mail-subject">${escapeHtml(message.subject || '无标题')}</div>
    <div class="mail-preview">${escapeHtml(message.from || '')} · ${escapeHtml(message.receivedAt || '')}</div>
    <div class="mail-preview">${escapeHtml(htmlToText(`${message.text || ''}\n${message.html || ''}`).slice(0, 500))}</div>
  </div>`).join('');
}

async function parseManualMail() {
  const order = state.orders.find(item => item.id === el.mailOrderSelect.value);
  if (!order) {
    setStatus(el.mailStatus, '请选择订单。', 'warn');
    return;
  }
  const text = el.manualMailText.value.trim();
  if (!text) {
    setStatus(el.mailStatus, '请粘贴邮件内容。', 'warn');
    return;
  }
  setButtonLoading(el.parseManualMailBtn, true, '解析中');
  console.debug('[superalink-extension] parse manual mail started', { orderId: order.id });
  try {
    const info = parseEsimMail(text, '手动粘贴 eSIM 邮件', '');
    if (!info) {
      setStatus(el.mailStatus, '没有解析到 eSIM 信息。', 'bad');
      return;
    }
    order.esimMailInfo = mergeEsimInfo(order.esimMailInfo || [], [info]);
    order.status = 'esim_received';
    order.statusText = '已手动保存 eSIM 信息';
    order.updatedAt = new Date().toISOString();
    upsertOrder(order);
    await saveOrders();
    renderHistory();
    setStatus(el.mailStatus, '已解析并保存。', 'ok');
  } finally {
    setButtonLoading(el.parseManualMailBtn, false);
  }
}

function mergeEsimInfo(existing, incoming) {
  const map = new Map();
  for (const info of [...existing, ...incoming]) {
    const key = `${info.subject || ''}|${(info.activationCodes || []).join(',')}|${(info.qrImageUrls || []).join(',')}`;
    map.set(key, info);
  }
  return Array.from(map.values());
}

function parseEsimMail(content, subject, from) {
  const decoded = decodeHtmlEntities(content);
  const text = htmlToText(decoded);
  const normalized = `${subject || ''}\n${from || ''}\n${text}`.toLowerCase();
  const looksLike = normalized.includes('esim') && /(voucher|qr|activation|install|order|purchase|payment|data plan)/i.test(normalized);
  const urls = uniqueValues(extractUrls(decoded));
  const qrImageUrls = uniqueValues([...extractImageUrls(decoded), ...urls].filter(isQrImageUrl)).slice(0, 4);
  const activationCodes = uniqueValues([...extractManualActivationCodes(decoded), ...urls.map(extractActivationCodeFromUrl).filter(Boolean)].map(normalizeActivationCode).filter(Boolean));
  if (!looksLike && qrImageUrls.length === 0 && activationCodes.length === 0) return null;
  return {
    subject,
    from,
    textPreview: text.slice(0, 2000),
    qrImageUrls,
    activationCodes,
    activationUrls: urls.filter(isActivationUrl).slice(0, 4),
    urls: urls.filter(url => !isImageUrl(url)).slice(0, 10),
    orderIds: extractOrderIds(decoded),
    iccids: extractIccids(text)
  };
}

function decodeHtmlEntities(value) {
  return String(value || '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number.parseInt(n, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, n) => String.fromCharCode(Number.parseInt(n, 16)));
}

function htmlToText(html) {
  return decodeHtmlEntities(html)
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractUrls(text) {
  const urls = decodeHtmlEntities(text).match(/https?:\/\/[^\s"'<>]+/gi) || [];
  return urls.map(url => url.replace(/[),.;]+$/g, ''));
}

function extractImageUrls(html) {
  const urls = [];
  const pattern = /<img[^>]+src=["']([^"']+)["']/gi;
  let match;
  while ((match = pattern.exec(html)) !== null) {
    if (match[1]) urls.push(decodeHtmlEntities(match[1]).replace(/[),.;]+$/g, ''));
  }
  return urls;
}

function extractManualActivationCodes(text) {
  const codes = [];
  const patterns = [/\bLPA:1\$[^\s"'<> &]+/gi, /\bLPA\$[^\s"'<> &]+/gi, /\b(?:activation|manual|matching)\s*code[：:\s]+([A-Z0-9$._-]{8,})/gi];
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) codes.push(match[1] || match[0]);
  }
  return codes;
}

function extractActivationCodeFromUrl(rawUrl) {
  try {
    return new URL(rawUrl).searchParams.get('carddata') || undefined;
  } catch {
    return undefined;
  }
}

function normalizeActivationCode(rawValue) {
  let value = safeDecodeURIComponent(String(rawValue || '').trim());
  const match = value.match(/LPA:?1\$[^\s"'<>]+/i) || value.match(/LPA\$[^\s"'<>]+/i);
  if (match?.[0]) value = match[0];
  const queryIndex = value.indexOf('&');
  if (queryIndex >= 0) value = value.slice(0, queryIndex);
  return value.replace(/[),.;]+$/g, '').trim();
}

function safeDecodeURIComponent(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function isActivationUrl(url) {
  const lower = String(url || '').toLowerCase();
  return lower.includes('activate.superalink.com') || lower.includes('carddata=lpa');
}

function isImageUrl(url) {
  return /\.(png|jpe?g|gif|webp)(?:[?#]|$)/i.test(url);
}

function isQrImageUrl(url) {
  const lower = String(url || '').toLowerCase();
  if (!isImageUrl(url)) return false;
  if (lower.includes('superalink-qrcode')) return false;
  return lower.includes('/qr/') || /qr[-_][a-z0-9-]+\.(png|jpe?g|webp)/i.test(lower);
}

function extractOrderIds(text) {
  const ids = [];
  const patterns = [/\bsuperalink-\d+-[A-Z0-9_-]+/gi, /\border\s*(?:id|number|no)?[：:#\s-]+([A-Z0-9][A-Z0-9_-]{5,})/gi];
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) ids.push(match[1] || match[0]);
  }
  return uniqueValues(ids);
}

function extractIccids(text) {
  const values = [];
  const pattern = /\bICCID\s*[:#]?\s*(\d{12,25})/gi;
  let match;
  while ((match = pattern.exec(text)) !== null) if (match[1]) values.push(match[1]);
  return uniqueValues(values);
}

function uniqueValues(values) {
  return Array.from(new Set((values || []).map(value => String(value || '').trim()).filter(Boolean)));
}

function formatTime(value) {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('zh-CN', { hour12: false });
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function refreshHistory() {
  setButtonLoading(el.refreshHistoryBtn, true, '刷新中');
  setStatus(el.historyStatus, '正在刷新本地记录。');
  console.debug('[superalink-extension] history refresh started', { orders: state.orders.length });
  try {
    await wait(180);
    renderHistory();
  } finally {
    setButtonLoading(el.refreshHistoryBtn, false);
  }
}

async function exportOrders() {
  const payload = {
    exportedAt: new Date().toISOString(),
    orders: state.orders
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `superalink-esim-orders-${Date.now()}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
  setStatus(el.storageStatus, '已生成导出文件。', 'ok');
}

async function importOrders(file) {
  const text = await file.text();
  const parsed = JSON.parse(text);
  const incoming = Array.isArray(parsed) ? parsed : parsed.orders;
  if (!Array.isArray(incoming)) throw new Error('导入文件缺少 orders 数组');
  for (const order of incoming) {
    if (!order.id) order.id = crypto.randomUUID();
    upsertOrder(order);
  }
  await saveOrders();
  renderHistory();
  renderMailOrderSelect();
  setStatus(el.storageStatus, `已导入 ${incoming.length} 条记录。`, 'ok');
}

function initCountries() {
  el.country.innerHTML = COUNTRIES.map(country => `<option value="${country.code}">${countryOptionLabel(country)}</option>`).join('');
  el.country.value = DEFAULT_COUNTRY_CODE;
  el.currency.value = DEFAULT_CURRENCY;
  el.quantity.value = '1';
}

function bindEvents() {
  el.navButtons.forEach(button => button.addEventListener('click', () => setActiveView(button.dataset.view)));
  el.country.addEventListener('change', loadCatalog);
  el.currency.addEventListener('change', renderSummary);
  el.quantity.addEventListener('input', renderSummary);
  el.planToggleBtn.addEventListener('click', () => {
    state.plansExpanded = !state.plansExpanded;
    renderPlans();
  });
  el.createOrderBtn.addEventListener('click', createOrder);
  el.openPaymentBtn.addEventListener('click', openCurrentPaymentPage);
  el.copyCurrentEmailBtn.addEventListener('click', copyCurrentEmail);
  el.goMailBtn.addEventListener('click', goMailViewWithCurrentOrder);
  el.refreshHistoryBtn.addEventListener('click', refreshHistory);
  el.mailOrderSelect.addEventListener('change', () => {
    state.activeOrderId = el.mailOrderSelect.value;
    renderHistory();
  });
  el.collectMailBtn.addEventListener('click', collectMail);
  el.listMailBtn.addEventListener('click', listLatestMail);
  el.parseManualMailBtn.addEventListener('click', parseManualMail);
  el.exportBtn.addEventListener('click', exportOrders);
  el.importFile.addEventListener('change', event => {
    const file = event.target.files?.[0];
    if (!file) return;
    importOrders(file).catch(error => setStatus(el.storageStatus, error.message || String(error), 'bad'));
  });
}

async function init() {
  bindEvents();
  initCountries();
  await loadOrders();
  renderHistory();
  renderMailOrderSelect();
  await loadCatalog();
  setStatus(el.storageStatus, `当前 chrome.storage.local 有 ${state.orders.length} 条订单。`, 'ok');
}

init().catch(error => {
  setStatus(el.topStatus, error.message || String(error), 'bad');
});
