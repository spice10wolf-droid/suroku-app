const storageKey = "suroku-records";
const shopsKey = "suroku-shops";
const machinesKey = "suroku-machines";
const ratesKey = "suroku-rates";
let displayedMonth = new Date();
let selectedDate = "";
let editingId = null;
let managingType = "";
displayedMonth.setDate(1);

const calendar = document.querySelector("#calendar");
const monthLabel = document.querySelector("#month-label");
const total = document.querySelector("#monthly-total");
const yearlyTotalElement = document.querySelector("#yearly-total");
const yearlyTitle = document.querySelector("#yearly-title");
const yearlyInvestment = document.querySelector("#yearly-investment");
const yearlyReturn = document.querySelector("#yearly-return");
const yearlyDays = document.querySelector("#yearly-days");
const yearlyWinRate = document.querySelector("#yearly-win-rate");
const monthlyInvestment = document.querySelector("#monthly-investment");
const monthlyReturn = document.querySelector("#monthly-return");
const monthlyDays = document.querySelector("#monthly-days");
const monthlyWinRate = document.querySelector("#monthly-win-rate");
const recordDialog = document.querySelector("#record-dialog");
const detailsDialog = document.querySelector("#details-dialog");
const form = document.querySelector("#record-form");
const recordList = document.querySelector("#record-list");
const shopTabs = document.querySelector("#shop-tabs");
const machineTabs = document.querySelector("#machine-tabs");
const rateTabs = document.querySelector("#rate-tabs");
const nameManagerDialog = document.querySelector("#name-manager-dialog");
const nameManagerTitle = document.querySelector("#name-manager-title");
const nameManagerInput = document.querySelector("#name-manager-input");
const nameManagerList = document.querySelector("#name-manager-list");
const shopRankingTitle = document.querySelector("#shop-ranking-title");
const machineRankingTitle = document.querySelector("#machine-ranking-title");
const shopRanking = document.querySelector("#shop-ranking");
const machineRanking = document.querySelector("#machine-ranking");
const shopSort = document.querySelector("#shop-sort");
const machineSort = document.querySelector("#machine-sort");
const rateSort = document.querySelector("#rate-sort");
const rateRanking = document.querySelector("#rate-ranking");
const monthlyChart = document.querySelector("#monthly-chart");
const monthlyChartTitle = document.querySelector("#monthly-chart-title");
const monthlyChartDetail = document.querySelector("#monthly-chart-detail");
const dashboardView = document.querySelector("#dashboard-view");
const analysisView = document.querySelector("#analysis-view");
const graphView = document.querySelector("#graph-view");
const settingsView = document.querySelector("#settings-view");
const bottomNavItems = document.querySelectorAll(".bottom-nav-item");
const exportBackupButton = document.querySelector("#export-backup");
const importBackupInput = document.querySelector("#import-backup");

function getRecords() {
  return JSON.parse(localStorage.getItem(storageKey) || "[]").map((record, index) => ({ ...record, id: record.id || `old-record-${index}` }));
}
function saveRecords(records) { localStorage.setItem(storageKey, JSON.stringify(records)); }
const nameConfigs = {
  shop: { key: shopsKey, field: "shop", label: "店名", tabs: shopTabs },
  machine: { key: machinesKey, field: "machine", label: "機種名", tabs: machineTabs },
  rate: { key: ratesKey, field: "rate", label: "レート", tabs: rateTabs, defaults: ["20スロ", "5スロ", "4パチ", "1パチ", "その他"] },
};
function getNames(type) {
  const config = nameConfigs[type];
  const stored = localStorage.getItem(config.key);
  if (stored !== null) return JSON.parse(stored).map((name) => name.trim()).filter(Boolean);
  const migrated = [...new Set([...(config.defaults || []), ...getRecords().map((record) => record[config.field]?.trim()).filter(Boolean)])].sort((a, b) => a.localeCompare(b, "ja"));
  localStorage.setItem(config.key, JSON.stringify(migrated));
  return migrated;
}
function saveName(type, name) {
  const trimmed = name.trim();
  if (!trimmed) return false;
  const config = nameConfigs[type];
  const names = getNames(type);
  if (!names.includes(trimmed)) localStorage.setItem(config.key, JSON.stringify([...names, trimmed]));
  return true;
}
function removeName(type, name) {
  const config = nameConfigs[type];
  localStorage.setItem(config.key, JSON.stringify(getNames(type).filter((item) => item !== name)));
}
let draggedCandidate = null;
function saveDraggedOrder() {
  if (!draggedCandidate) return;
  const config = nameConfigs[managingType];
  const names = [...nameManagerList.querySelectorAll(".managed-name")].map((item) => item.dataset.candidateName);
  localStorage.setItem(config.key, JSON.stringify(names));
  draggedCandidate.classList.remove("dragging");
  draggedCandidate = null;
  renderNameTabs();
}
function moveDraggedCandidate(clientX, clientY) {
  if (!draggedCandidate) return;
  const target = document.elementFromPoint(clientX, clientY)?.closest(".managed-name");
  if (!target || target === draggedCandidate || !nameManagerList.contains(target)) return;
  const midpoint = target.getBoundingClientRect().top + target.getBoundingClientRect().height / 2;
  nameManagerList.insertBefore(draggedCandidate, clientY < midpoint ? target : target.nextSibling);
}
function renderNameTabs() {
  Object.entries(nameConfigs).forEach(([type, config]) => {
    const selected = form.elements[config.field].value;
    const names = getNames(type);
    config.tabs.innerHTML = names.length
      ? names.map((name) => `<button type="button" class="name-tab ${name === selected ? "selected" : ""}" data-name-type="${type}" data-name="${escapeHTML(name)}">${escapeHTML(name)}</button>`).join("")
      : '<p class="empty-tabs">「編集」から候補を追加できます</p>';
  });
}
function renderNameManager() {
  const names = getNames(managingType);
  nameManagerList.innerHTML = names.length
    ? names.map((name) => `<div class="managed-name" data-candidate-name="${escapeHTML(name)}"><span class="drag-handle" aria-hidden="true">⠿</span><span class="managed-name-label">${escapeHTML(name)}</span><button type="button" class="remove-name" data-remove-name="${escapeHTML(name)}" aria-label="${escapeHTML(name)}を削除">×</button></div>`).join("")
    : '<p class="empty-tabs">候補はまだありません</p>';
}
function openNameManager(type) {
  managingType = type;
  nameManagerTitle.textContent = `${nameConfigs[type].label}を編集`;
  nameManagerInput.placeholder = type === "rate" ? "例：2スロ" : `${nameConfigs[type].label}を入力`;
  nameManagerInput.value = "";
  renderNameManager();
  nameManagerDialog.showModal();
}
function backupFileName() {
  const today = new Date().toISOString().slice(0, 10);
  return `スロットパチンコ収支表-${today}.json`;
}
function exportBackup() {
  const backup = {
    app: "スロットパチンコ収支表",
    version: 1,
    exportedAt: new Date().toISOString(),
    records: getRecords(),
    candidates: {
      shops: getNames("shop"),
      machines: getNames("machine"),
      rates: getNames("rate"),
    },
  };
  const url = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = backupFileName();
  link.click();
  URL.revokeObjectURL(url);
}
function validNames(names) {
  return Array.isArray(names) ? [...new Set(names.filter((name) => typeof name === "string").map((name) => name.trim()).filter(Boolean))] : null;
}
function restoreBackup(backup) {
  if (!backup || !Array.isArray(backup.records)) throw new Error("backup format");
  const records = backup.records.filter((record) => record && typeof record.date === "string").map((record, index) => ({
    ...record,
    shop: typeof record.shop === "string" ? record.shop.trim() : "",
    machine: typeof record.machine === "string" ? record.machine.trim() : "",
    machineNumber: typeof record.machineNumber === "string" ? record.machineNumber.trim() : "",
    memo: typeof record.memo === "string" ? record.memo.trim() : "",
    rate: typeof record.rate === "string" && record.rate.trim() ? record.rate.trim() : "20スロ",
    investment: Number(record.investment) || 0,
    returnAmount: Number(record.returnAmount) || 0,
    id: record.id || `restored-record-${index}-${crypto.randomUUID()}`,
  }));
  const candidates = backup.candidates || {};
  const shops = validNames(candidates.shops);
  const machines = validNames(candidates.machines);
  const rates = validNames(candidates.rates);
  saveRecords(records);
  if (shops) localStorage.setItem(shopsKey, JSON.stringify(shops));
  if (machines) localStorage.setItem(machinesKey, JSON.stringify(machines));
  if (rates) localStorage.setItem(ratesKey, JSON.stringify(rates));
  renderNameTabs();
  renderCalendar();
}
function yen(amount) { return `¥${Math.abs(amount).toLocaleString("ja-JP")}`; }
function calendarAmount(amount) { return Math.abs(amount).toLocaleString("ja-JP"); }
function isoDate(year, month, day) { return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`; }
function balance(record) { return record.returnAmount - record.investment; }
function money(amount) { return `¥${amount.toLocaleString("ja-JP")}`; }
function escapeHTML(value) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}
function renderRanking(records, field, container, sortBy) {
  const groups = new Map();
  records.forEach((record) => {
    const name = record[field]?.trim();
    if (!name) return;
    const group = groups.get(name) || { name, investment: 0, returnAmount: 0, count: 0 };
    group.investment += record.investment;
    group.returnAmount += record.returnAmount;
    group.count += 1;
    groups.set(name, group);
  });
  const ranking = [...groups.values()].map((group) => ({ ...group, total: group.returnAmount - group.investment }));
  ranking.sort((a, b) => {
    if (sortBy === "total-asc") return a.total - b.total;
    if (sortBy === "investment-desc") return b.investment - a.investment;
    if (sortBy === "return-desc") return b.returnAmount - a.returnAmount;
    if (sortBy === "count-desc") return b.count - a.count;
    if (sortBy === "name-asc") return a.name.localeCompare(b.name, "ja");
    return b.total - a.total;
  });
  if (!ranking.length) { container.innerHTML = '<p class="empty-ranking">まだ記録がありません</p>'; return; }
  container.innerHTML = ranking.map((group, index) => `<div class="ranking-row"><span class="rank-number">${index + 1}</span><span><span class="ranking-name">${escapeHTML(group.name)}</span><span class="ranking-meta">${group.count}件 ・ 投資 ${money(group.investment)} ・ 回収 ${money(group.returnAmount)}</span></span><strong class="ranking-total ${group.total > 0 ? "positive" : group.total < 0 ? "negative" : ""}">${yen(group.total)}</strong></div>`).join("");
}
function renderMonthlyChart(records, year) {
  const totals = Array.from({ length: 12 }, (_, month) => records
    .filter((record) => record.date.startsWith(`${year}-${String(month + 1).padStart(2, "0")}`))
    .reduce((sum, record) => sum + balance(record), 0));
  const maxAmount = Math.max(...totals.map((amount) => Math.abs(amount)), 1);
  monthlyChartTitle.textContent = `${year}年 月別収支`;
  monthlyChartDetail.textContent = "棒を押すと金額を表示";
  monthlyChartDetail.className = "";
  monthlyChart.innerHTML = totals.map((amount, month) => {
    const height = amount ? Math.max(7, Math.round((Math.abs(amount) / maxAmount) * 100)) : 0;
    const kind = amount > 0 ? "positive" : amount < 0 ? "negative" : "zero";
    return `<button type="button" class="chart-column ${kind}" data-chart-month="${month}" data-chart-amount="${amount}" aria-label="${month + 1}月 ${yen(amount)}"><span class="chart-positive-zone">${amount > 0 ? `<span class="chart-bar positive" style="height:${height}%"></span>` : ""}</span><span class="chart-negative-zone">${amount < 0 ? `<span class="chart-bar negative" style="height:${height}%"></span>` : ""}</span><span class="chart-month">${month + 1}月</span></button>`;
  }).join("");
}

function renderCalendar() {
  const year = displayedMonth.getFullYear();
  const month = displayedMonth.getMonth();
  const records = getRecords();
  const monthlyRecords = records.filter((record) => record.date.startsWith(`${year}-${String(month + 1).padStart(2, "0")}`));
  const yearlyRecords = records.filter((record) => record.date.startsWith(`${year}-`));
  const totalsByDay = {};
  monthlyRecords.forEach((record) => { (totalsByDay[record.date] ||= []).push(record); });
  const monthlyTotal = monthlyRecords.reduce((sum, record) => sum + balance(record), 0);
  const yearlyTotal = yearlyRecords.reduce((sum, record) => sum + balance(record), 0);
  const yearlyTotalsByDay = {};
  yearlyRecords.forEach((record) => { (yearlyTotalsByDay[record.date] ||= []).push(record); });
  const yearlyDailyTotals = Object.values(yearlyTotalsByDay).map((dayRecords) => dayRecords.reduce((sum, record) => sum + balance(record), 0));
  const yearlyPlayedDays = yearlyDailyTotals.length;
  const yearlyWins = yearlyDailyTotals.filter((amount) => amount > 0).length;
  const totalYearlyInvestment = yearlyRecords.reduce((sum, record) => sum + record.investment, 0);
  const totalYearlyReturn = yearlyRecords.reduce((sum, record) => sum + record.returnAmount, 0);
  const dailyTotals = Object.values(totalsByDay).map((dayRecords) => dayRecords.reduce((sum, record) => sum + balance(record), 0));
  const playedDays = dailyTotals.length;
  const wins = dailyTotals.filter((amount) => amount > 0).length;
  const totalInvestment = monthlyRecords.reduce((sum, record) => sum + record.investment, 0);
  const totalReturn = monthlyRecords.reduce((sum, record) => sum + record.returnAmount, 0);
  monthLabel.textContent = `${year}年${month + 1}月`;
  total.textContent = yen(monthlyTotal);
  total.className = monthlyTotal > 0 ? "positive" : monthlyTotal < 0 ? "negative" : "";
  yearlyTotalElement.textContent = yen(yearlyTotal);
  yearlyTotalElement.className = yearlyTotal > 0 ? "positive" : yearlyTotal < 0 ? "negative" : "";
  yearlyTitle.textContent = `${year}年の年間成績`;
  yearlyInvestment.textContent = money(totalYearlyInvestment);
  yearlyReturn.textContent = money(totalYearlyReturn);
  yearlyDays.textContent = `${yearlyPlayedDays}日`;
  yearlyWinRate.textContent = yearlyPlayedDays ? `${Math.round((yearlyWins / yearlyPlayedDays) * 100)}%` : "—";
  monthlyInvestment.textContent = money(totalInvestment);
  monthlyReturn.textContent = money(totalReturn);
  monthlyDays.textContent = `${playedDays}日`;
  monthlyWinRate.textContent = playedDays ? `${Math.round((wins / playedDays) * 100)}%` : "—";
  renderMonthlyChart(records, year);
  renderRanking(records, "shop", shopRanking, shopSort.value);
  renderRanking(records, "machine", machineRanking, machineSort.value);
  renderRanking(records, "rate", rateRanking, rateSort.value);
  calendar.innerHTML = "";
  for (let i = 0; i < new Date(year, month, 1).getDay(); i += 1) calendar.append(Object.assign(document.createElement("div"), { className: "day empty" }));
  const lastDay = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  for (let day = 1; day <= lastDay; day += 1) {
    const date = isoDate(year, month, day);
    const dayRecords = totalsByDay[date] || [];
    const dayTotal = dayRecords.reduce((sum, record) => sum + balance(record), 0);
    const button = document.createElement("button");
    const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
    button.className = `day${isToday ? " today" : ""}`;
    button.innerHTML = `<span class="date-number">${day}</span>${dayRecords.length ? `<span class="profit ${dayTotal >= 0 ? "positive" : "negative"}">${calendarAmount(dayTotal)}</span>` : ""}`;
    button.addEventListener("click", () => dayRecords.length ? openDetails(date) : openForm(date));
    calendar.append(button);
  }
}

function openForm(date = new Date().toISOString().slice(0, 10), record = null) {
  form.reset(); editingId = record?.id || null;
  form.date.value = record?.date || date;
  form.shop.value = record?.shop || ""; form.machine.value = record?.machine || "";
  form.machineNumber.value = record?.machineNumber || "";
  form.rate.value = record?.rate || "20スロ";
  form.investment.value = record ? record.investment : ""; form.returnAmount.value = record ? record.returnAmount : "";
  form.memo.value = record?.memo || "";
  renderNameTabs();
  document.querySelector("#record-dialog h2").textContent = record ? "収支を編集" : "収支を記録";
  recordDialog.showModal();
}

function openDetails(date) {
  selectedDate = date;
  document.querySelector("#details-title").textContent = `${date.replaceAll("-", "/")} の記録`;
  const records = getRecords().filter((record) => record.date === date);
  recordList.innerHTML = records.map((record) => {
    const amount = balance(record);
    return `<article class="record-card"><h3>${record.machine || "機種名：未入力"}</h3><p class="record-meta">${record.shop || "店名：未入力"} ・ ${record.rate}${record.machineNumber ? ` ・ 台番号 ${record.machineNumber}` : ""}<br>投資 ¥${record.investment.toLocaleString()} ／ 回収 ¥${record.returnAmount.toLocaleString()}</p>${record.memo ? `<p class="record-note">${escapeHTML(record.memo)}</p>` : ""}<div class="record-bottom"><span class="record-total ${amount >= 0 ? "positive" : "negative"}">${yen(amount)}</span><span><button class="text-button" data-edit="${record.id}">編集</button> <button class="text-button delete-button" data-delete="${record.id}">削除</button></span></div></article>`;
  }).join("");
  detailsDialog.showModal();
}

function showView(view) {
  dashboardView.hidden = view !== "calendar";
  analysisView.hidden = view !== "analysis";
  graphView.hidden = view !== "graph";
  settingsView.hidden = view !== "settings";
  bottomNavItems.forEach((item) => item.classList.toggle("active", item.dataset.view === view));
  window.scrollTo(0, 0);
}
document.querySelector("#open-form").addEventListener("click", () => openForm());
bottomNavItems.forEach((item) => item.addEventListener("click", () => showView(item.dataset.view)));
monthlyChart.addEventListener("click", (event) => {
  const column = event.target.closest(".chart-column");
  if (!column) return;
  const amount = Number(column.dataset.chartAmount);
  monthlyChartDetail.textContent = `${displayedMonth.getFullYear()}年${Number(column.dataset.chartMonth) + 1}月　${yen(amount)}`;
  monthlyChartDetail.className = amount > 0 ? "positive" : amount < 0 ? "negative" : "";
  monthlyChart.querySelectorAll(".chart-column").forEach((item) => item.classList.toggle("selected", item === column));
});
exportBackupButton.addEventListener("click", exportBackup);
importBackupInput.addEventListener("change", async () => {
  const file = importBackupInput.files[0];
  if (!file) return;
  try {
    const backup = JSON.parse(await file.text());
    if (!confirm("現在の記録と入力候補を、このバックアップの内容で置き換えます。よろしいですか？")) return;
    restoreBackup(backup);
    showView("calendar");
    alert("バックアップを読み込みました。");
  } catch {
    alert("バックアップファイルを読み込めませんでした。正しいファイルを選んでください。");
  } finally {
    importBackupInput.value = "";
  }
});
shopSort.addEventListener("change", renderCalendar);
machineSort.addEventListener("change", renderCalendar);
rateSort.addEventListener("change", renderCalendar);
document.querySelector("#close-form").addEventListener("click", () => recordDialog.close());
document.querySelector("#close-details").addEventListener("click", () => detailsDialog.close());
document.querySelector("#close-name-manager").addEventListener("click", () => nameManagerDialog.close());
document.querySelectorAll(".manage-names").forEach((button) => button.addEventListener("click", () => openNameManager(button.dataset.nameType)));
[shopTabs, machineTabs, rateTabs].forEach((tabs) => tabs.addEventListener("click", (event) => {
  const button = event.target.closest(".name-tab");
  if (!button) return;
  const field = nameConfigs[button.dataset.nameType].field;
  form.elements[field].value = field === "rate" ? button.dataset.name : form.elements[field].value === button.dataset.name ? "" : button.dataset.name;
  renderNameTabs();
}));
document.querySelector("#add-name").addEventListener("click", () => {
  if (!saveName(managingType, nameManagerInput.value)) { alert("名前を入力してください。"); return; }
  nameManagerInput.value = "";
  renderNameManager();
  renderNameTabs();
});
nameManagerList.addEventListener("click", (event) => {
  const name = event.target.dataset.removeName;
  if (!name) return;
  removeName(managingType, name);
  renderNameManager();
  renderNameTabs();
});
nameManagerList.addEventListener("pointerdown", (event) => {
  if (event.target.closest("button")) return;
  const item = event.target.closest(".managed-name");
  if (!item) return;
  draggedCandidate = item;
  item.classList.add("dragging");
  item.setPointerCapture(event.pointerId);
});
nameManagerList.addEventListener("pointermove", (event) => {
  moveDraggedCandidate(event.clientX, event.clientY);
});
nameManagerList.addEventListener("pointerup", (event) => {
  saveDraggedOrder();
});
nameManagerList.addEventListener("pointercancel", saveDraggedOrder);
document.querySelector("#add-record-on-date").addEventListener("click", () => { detailsDialog.close(); openForm(selectedDate); });
document.querySelector("#previous-month").addEventListener("click", () => { displayedMonth.setMonth(displayedMonth.getMonth() - 1); renderCalendar(); });
document.querySelector("#next-month").addEventListener("click", () => { displayedMonth.setMonth(displayedMonth.getMonth() + 1); renderCalendar(); });
recordList.addEventListener("click", (event) => {
  const id = event.target.dataset.edit || event.target.dataset.delete;
  if (!id) return;
  const records = getRecords();
  if (event.target.dataset.edit) { detailsDialog.close(); openForm(selectedDate, records.find((record) => record.id === id)); }
  if (event.target.dataset.delete && confirm("この記録を削除しますか？")) { saveRecords(records.filter((record) => record.id !== id)); openDetails(selectedDate); renderCalendar(); }
});
form.addEventListener("submit", (event) => {
  event.preventDefault();
  const values = Object.fromEntries(new FormData(form));
  values.shop = values.shop.trim();
  values.machine = values.machine.trim();
  values.machineNumber = values.machineNumber.trim();
  values.memo = values.memo.trim();
  const records = getRecords();
  const record = { ...values, id: editingId || crypto.randomUUID(), investment: Number(values.investment || 0), returnAmount: Number(values.returnAmount || 0) };
  saveRecords(editingId ? records.map((item) => item.id === editingId ? record : item) : [...records, record]);
  displayedMonth = new Date(`${values.date}T00:00:00`); displayedMonth.setDate(1);
  recordDialog.close(); renderCalendar();
});
renderNameTabs();
renderCalendar();

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./service-worker.js").catch(() => {});
}
