const STORAGE_KEYS = {
  orders: 'superalinkOrders'
};

const el = {
  openAppBtn: document.getElementById('openAppBtn'),
  countText: document.getElementById('countText'),
  latestTitle: document.getElementById('latestTitle'),
  latestMeta: document.getElementById('latestMeta'),
  copyLpaBtn: document.getElementById('copyLpaBtn'),
  openCheckoutBtn: document.getElementById('openCheckoutBtn'),
  statusText: document.getElementById('statusText')
};

let latestOrder;

async function loadOrders() {
  const data = await chrome.storage.local.get({ [STORAGE_KEYS.orders]: [] });
  return Array.isArray(data[STORAGE_KEYS.orders]) ? data[STORAGE_KEYS.orders] : [];
}

function latestActivationCode(order) {
  for (const info of order?.esimMailInfo || []) {
    const code = (info.activationCodes || [])[0];
    if (code) return code;
  }
  return '';
}

async function render() {
  const orders = await loadOrders();
  latestOrder = orders.find(order => order.esimMailInfo?.length) || orders[0];
  el.countText.textContent = `${orders.length} 条本地订单`;

  if (!latestOrder) {
    el.latestTitle.textContent = '暂无记录';
    el.latestMeta.textContent = '打开工具页创建订单。';
    return;
  }

  el.latestTitle.textContent = latestOrder.email || latestOrder.orderId || '未命名订单';
  el.latestMeta.textContent = `${latestOrder.statusText || latestOrder.status || '未知状态'} · ${latestOrder.amountDisplay || latestOrder.currency || ''}`;
  el.copyLpaBtn.disabled = !latestActivationCode(latestOrder);
  el.openCheckoutBtn.disabled = !latestOrder.checkoutUrl;
}

async function copyText(value) {
  await navigator.clipboard.writeText(value);
}

el.openAppBtn.addEventListener('click', () => {
  chrome.tabs.create({ url: chrome.runtime.getURL('app.html') });
});

el.copyLpaBtn.addEventListener('click', async () => {
  const code = latestActivationCode(latestOrder);
  if (!code) return;
  await copyText(code);
  el.statusText.textContent = 'LPA 已复制。';
});

el.openCheckoutBtn.addEventListener('click', () => {
  if (latestOrder?.checkoutUrl) chrome.tabs.create({ url: latestOrder.checkoutUrl });
});

render().catch(error => {
  el.statusText.textContent = error.message || String(error);
});
