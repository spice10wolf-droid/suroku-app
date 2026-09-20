const storageKey = "suroku-records";
const shopsKey = "suroku-shops";
const machinesKey = "suroku-machines";
let displayedMonth = new Date();
let selectedDate = "";
let editingId = null;
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
const shopOptions = document.querySelector("#shop-options");
const machineOptions = document.querySelector("#machine-options");
const shopRankingTitle = document.querySelector("#shop-ranking-title");
const machineRankingTitle = document.querySelector("#machine-ranking-title");
const shopRanking = document.querySelector("#shop-ranking");
const machineRanking = document.querySelector("#machine-ranking");
const shopSort = document.querySelector("#shop-sort");
const machineSort = document.querySelector("#machine-sort");
const rateSort = document.querySelector("#rate-sort");
const rateRanking = document.querySelector("#rate-ranking");
const dashboardView = document.querySelector("#dashboard-view");
const analysisView = document.querySelector("#analysis-view");

function getRecords() {
  return JSON.parse(localStorage.getItem(storageKey) || "[]").map((record, index) => ({ ...record, id: record.id || `old-record-${index}` }));
}
function saveRecords(records) { localStorage.setItem(storageKey, JSON.stringify(records)); }
function getNames(key, field) {
  const saved = JSON.parse(localStorage.getItem(key) || "[]");
  const fromRecords = getRecords().map((record) => record[field]).filter(Boolean);
  return [...new Set([...saved, ...fromRecords].map((name) => name.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, "ja"));
}
function saveName(key, name) {
  const trimmed = name.trim();
  if (!trimmed) return;
  const names = JSON.parse(localStorage.getItem(key) || "[]");
  if (!names.includes(trimmed)) localStorage.setItem(key, JSON.stringify([...names, trimmed]));
}
function renderNameOptions() {
  shopOptions.innerHTML = getNames(shopsKey, "shop").map((name) => `<option value="${name}"></option>`).join("");
  machineOptions.innerHTML = getNames(machinesKey, "machine").map((name) => `<option value="${name}"></option>`).join("");
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
  renderNameOptions();
  form.reset(); editingId = record?.id || null;
  form.date.value = record?.date || date;
  form.shop.value = record?.shop || ""; form.machine.value = record?.machine || "";
  form.machineNumber.value = record?.machineNumber || "";
  form.rate.value = record?.rate || "20スロ";
  form.investment.value = record?.investment ?? 0; form.returnAmount.value = record?.returnAmount ?? 0;
  form.memo.value = record?.memo || "";
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

document.querySelector("#open-form").addEventListener("click", () => openForm());
document.querySelector("#show-analysis").addEventListener("click", () => { dashboardView.hidden = true; analysisView.hidden = false; window.scrollTo(0, 0); });
document.querySelector("#show-dashboard").addEventListener("click", () => { analysisView.hidden = true; dashboardView.hidden = false; window.scrollTo(0, 0); });
shopSort.addEventListener("change", renderCalendar);
machineSort.addEventListener("change", renderCalendar);
rateSort.addEventListener("change", renderCalendar);
document.querySelector("#close-form").addEventListener("click", () => recordDialog.close());
document.querySelector("#close-details").addEventListener("click", () => detailsDialog.close());
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
  const record = { ...values, id: editingId || crypto.randomUUID(), investment: Number(values.investment), returnAmount: Number(values.returnAmount) };
  saveRecords(editingId ? records.map((item) => item.id === editingId ? record : item) : [...records, record]);
  saveName(shopsKey, values.shop);
  saveName(machinesKey, values.machine);
  displayedMonth = new Date(`${values.date}T00:00:00`); displayedMonth.setDate(1);
  recordDialog.close(); renderCalendar();
});
renderNameOptions();
renderCalendar();

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./service-worker.js").catch(() => {});
}
