import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

// ===== 直接使用 localStorage 存储（Tauri/Capacitor/浏览器 通用） =====
// Tauri 桌面版的 Rust 后端备用，当前统一用本地存储

const STORAGE_KEY = 'heima-jizhang-expenses'
const ID_KEY = 'heima-jizhang-next-id'

function loadAll() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

function saveAll(list) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)) } catch {}
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

// ===== 存储 API =====
const api = {
  async addExpense(data) {
    const list = loadAll()
    const now = nowStr()
    list.push({
      id: getNextId(),
      amount: data.amount,
      category_l1: data.category_l1,
      category_l2: data.category_l2,
      date: data.date,
      note: data.note || '',
      created_at: now,
      updated_at: now
    })
    saveAll(list)
  },

  async updateExpense(data) {
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
  },

  async deleteExpense(id) {
    saveAll(loadAll().filter(e => e.id !== id))
  },

  async listExpenses(filters = {}) {
    let list = loadAll()
    if (filters.year_month) list = list.filter(e => e.date.startsWith(filters.year_month))
    if (filters.category_l1) list = list.filter(e => e.category_l1 === filters.category_l1)
    if (filters.date_from) list = list.filter(e => e.date >= filters.date_from)
    if (filters.date_to) list = list.filter(e => e.date <= filters.date_to)
    list.sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id)
    return list
  },

  async searchExpenses(keyword) {
    let list = loadAll().filter(e => e.note && e.note.includes(keyword))
    list.sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id)
    return list
  },

  async getStatistics(yearMonth) {
    const monthData = loadAll().filter(e => e.date.startsWith(yearMonth))
    const total = monthData.reduce((s, e) => s + e.amount, 0)
    const count = monthData.length

    const l1Map = {}
    for (const e of monthData) {
      if (!l1Map[e.category_l1]) l1Map[e.category_l1] = { total: 0, count: 0 }
      l1Map[e.category_l1].total += e.amount
      l1Map[e.category_l1].count += 1
    }
    const byCategory = Object.entries(l1Map)
      .map(([k, v]) => ({ category_l1: k, ...v }))
      .sort((a, b) => b.total - a.total)

    const l2Map = {}
    for (const e of monthData) {
      const key = e.category_l1 + '||' + e.category_l2
      if (!l2Map[key]) l2Map[key] = { category_l1: e.category_l1, category_l2: e.category_l2, total: 0, count: 0 }
      l2Map[key].total += e.amount
      l2Map[key].count += 1
    }
    const bySubCategory = Object.values(l2Map).sort((a, b) => b.total - a.total)

    const days = new Set(monthData.map(e => e.date))
    const actualDays = days.size > 0 ? days.size : 1

    return {
      total, count,
      avg_per_day: (total / actualDays).toFixed(2),
      by_category: byCategory,
      by_sub_category: bySubCategory
    }
  },

  async exportCSV(yearMonth) {
    let list = loadAll()
    if (yearMonth) list = list.filter(e => e.date.startsWith(yearMonth))
    list.sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id)
    let csv = '﻿ID,金额(元),一级分类,二级分类,日期,备注,创建时间\n'
    for (const e of list) {
      const note = (e.note || '').replace(/"/g, '""')
      csv += `${e.id},${e.amount.toFixed(2)},"${e.category_l1}","${e.category_l2}",${e.date},"${note}",${e.created_at}\n`
    }
    return csv
  },

  async getMonths() {
    const months = new Set()
    for (const e of loadAll()) {
      if (e.date.length >= 7) months.add(e.date.substring(0, 7))
    }
    return Array.from(months).sort().reverse()
  }
}

// ===== Store =====
export const useExpenseStore = defineStore('expense', () => {
  const expenses = ref([])
  const statistics = ref(null)
  const months = ref([])
  const loading = ref(false)
  const currentYearMonth = ref(getCurrentYearMonth())
  const filterCategoryL1 = ref('')

  const totalAmount = computed(() => expenses.value.reduce((sum, e) => sum + e.amount, 0))

  function getCurrentYearMonth() {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  }

  async function loadExpenses() {
    loading.value = true
    try {
      const filters = { year_month: currentYearMonth.value }
      if (filterCategoryL1.value) filters.category_l1 = filterCategoryL1.value
      expenses.value = await api.listExpenses(filters)
    } catch (err) {
      console.error('加载失败:', err)
      expenses.value = []
    } finally {
      loading.value = false
    }
  }

  async function addExpense(data) {
    await api.addExpense(data)
    await Promise.all([loadExpenses(), loadMonths()])
  }

  async function updateExpense(data) {
    await api.updateExpense(data)
    await loadExpenses()
  }

  async function deleteExpense(id) {
    await api.deleteExpense(id)
    await Promise.all([loadExpenses(), loadMonths()])
  }

  async function searchExpenses(keyword) {
    loading.value = true
    try { expenses.value = await api.searchExpenses(keyword) }
    catch (err) { expenses.value = [] }
    finally { loading.value = false }
  }

  async function loadStatistics(yearMonth) {
    loading.value = true
    try { statistics.value = await api.getStatistics(yearMonth || currentYearMonth.value) }
    catch (err) { statistics.value = null }
    finally { loading.value = false }
  }

  async function loadMonths() {
    try { months.value = await api.getMonths() }
    catch (err) { months.value = [] }
  }

  async function exportCSV(yearMonth) {
    return await api.exportCSV(yearMonth || currentYearMonth.value)
  }

  function setYearMonth(ym) { currentYearMonth.value = ym; loadExpenses() }
  function setFilterCategory(cat) { filterCategoryL1.value = cat; loadExpenses() }

  return {
    expenses, statistics, months, loading,
    currentYearMonth, filterCategoryL1, totalAmount,
    loadExpenses, addExpense, updateExpense, deleteExpense,
    searchExpenses, loadStatistics, loadMonths, exportCSV,
    setYearMonth, setFilterCategory
  }
})
