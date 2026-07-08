/**
 * 本地存储层 —— 使用 localStorage 模拟数据库操作
 * API 接口与原 Tauri invoke 保持一致，方便将来迁移到桌面版
 */

const STORAGE_KEY = 'heima-jizhang-expenses'
const ID_KEY = 'heima-jizhang-next-id'

// ===== 内部工具函数 =====

function loadAll() {
  const raw = localStorage.getItem(STORAGE_KEY)
  return raw ? JSON.parse(raw) : []
}

function saveAll(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
}

function getNextId() {
  const id = parseInt(localStorage.getItem(ID_KEY) || '0', 10) + 1
  localStorage.setItem(ID_KEY, String(id))
  return id
}

function nowStr() {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

// ===== 公开 API（与 Tauri invoke 接口一致） =====

/** 添加支出 */
export async function addExpense(data) {
  const list = loadAll()
  const now = nowStr()
  const expense = {
    id: getNextId(),
    amount: data.amount,
    category_l1: data.category_l1,
    category_l2: data.category_l2,
    date: data.date,
    note: data.note || '',
    created_at: now,
    updated_at: now
  }
  list.push(expense)
  saveAll(list)
  return expense.id
}

/** 更新支出 */
export async function updateExpense(data) {
  const list = loadAll()
  const idx = list.findIndex(e => e.id === data.id)
  if (idx >= 0) {
    list[idx].amount = data.amount
    list[idx].category_l1 = data.category_l1
    list[idx].category_l2 = data.category_l2
    list[idx].date = data.date
    list[idx].note = data.note || ''
    list[idx].updated_at = nowStr()
    saveAll(list)
  }
}

/** 删除支出 */
export async function deleteExpense(id) {
  const list = loadAll().filter(e => e.id !== id)
  saveAll(list)
}

/** 查询支出列表 */
export async function listExpenses(filters = {}) {
  let list = loadAll()

  if (filters.year_month) {
    list = list.filter(e => e.date.startsWith(filters.year_month))
  }
  if (filters.category_l1) {
    list = list.filter(e => e.category_l1 === filters.category_l1)
  }
  if (filters.date_from) {
    list = list.filter(e => e.date >= filters.date_from)
  }
  if (filters.date_to) {
    list = list.filter(e => e.date <= filters.date_to)
  }

  // 按日期 + ID 倒序
  list.sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id)
  return list
}

/** 搜索支出（按备注） */
export async function searchExpenses(keyword) {
  let list = loadAll().filter(e => e.note && e.note.includes(keyword))
  list.sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id)
  return list
}

/** 获取月度统计 */
export async function getStatistics(yearMonth) {
  const all = loadAll()
  const monthData = all.filter(e => e.date.startsWith(yearMonth))

  const total = monthData.reduce((s, e) => s + e.amount, 0)
  const count = monthData.length

  // 一级分类统计
  const l1Map = {}
  for (const e of monthData) {
    if (!l1Map[e.category_l1]) l1Map[e.category_l1] = { total: 0, count: 0 }
    l1Map[e.category_l1].total += e.amount
    l1Map[e.category_l1].count += 1
  }
  const byCategory = Object.entries(l1Map)
    .map(([k, v]) => ({ category_l1: k, ...v }))
    .sort((a, b) => b.total - a.total)

  // 二级分类统计
  const l2Map = {}
  for (const e of monthData) {
    const key = e.category_l1 + '||' + e.category_l2
    if (!l2Map[key]) l2Map[key] = { category_l1: e.category_l1, category_l2: e.category_l2, total: 0, count: 0 }
    l2Map[key].total += e.amount
    l2Map[key].count += 1
  }
  const bySubCategory = Object.values(l2Map).sort((a, b) => b.total - a.total)

  // 有记录的天数
  const days = new Set(monthData.map(e => e.date))
  const actualDays = days.size > 0 ? days.size : 1

  return {
    total,
    count,
    avg_per_day: (total / actualDays).toFixed(2),
    by_category: byCategory,
    by_sub_category: bySubCategory
  }
}

/** 导出 CSV */
export async function exportCSV(yearMonth) {
  let list = loadAll()
  if (yearMonth) {
    list = list.filter(e => e.date.startsWith(yearMonth))
  }
  list.sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id)

  let csv = '﻿ID,金额(元),一级分类,二级分类,日期,备注,创建时间\n'
  for (const e of list) {
    const note = (e.note || '').replace(/"/g, '""')
    csv += `${e.id},${e.amount.toFixed(2)},"${e.category_l1}","${e.category_l2}",${e.date},"${note}",${e.created_at}\n`
  }
  return csv
}

/** 获取月份列表 */
export async function getMonths() {
  const all = loadAll()
  const months = new Set()
  for (const e of all) {
    if (e.date.length >= 7) months.add(e.date.substring(0, 7))
  }
  return Array.from(months).sort().reverse()
}
