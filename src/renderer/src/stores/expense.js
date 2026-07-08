import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useExpenseStore = defineStore('expense', () => {
  // ===== 状态 =====
  const expenses = ref([])
  const statistics = ref(null)
  const months = ref([])
  const loading = ref(false)

  // 当前筛选条件
  const currentYearMonth = ref(getCurrentYearMonth())
  const filterCategoryL1 = ref('')

  // ===== 计算属性 =====
  const totalAmount = computed(() => {
    return expenses.value.reduce((sum, e) => sum + e.amount, 0)
  })

  // ===== 方法 =====
  function getCurrentYearMonth() {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    return `${year}-${month}`
  }

  // 加载支出列表
  async function loadExpenses() {
    loading.value = true
    try {
      const filters = { yearMonth: currentYearMonth.value }
      if (filterCategoryL1.value) {
        filters.category_l1 = filterCategoryL1.value
      }
      expenses.value = await window.electronAPI.getExpenses(filters)
    } catch (err) {
      console.error('加载支出列表失败:', err)
      expenses.value = []
    } finally {
      loading.value = false
    }
  }

  // 添加支出
  async function addExpense(data) {
    await window.electronAPI.addExpense(data)
    await loadExpenses()
  }

  // 更新支出
  async function updateExpense(data) {
    await window.electronAPI.updateExpense(data)
    await loadExpenses()
  }

  // 删除支出
  async function deleteExpense(id) {
    await window.electronAPI.deleteExpense(id)
    await loadExpenses()
  }

  // 加载统计数据
  async function loadStatistics(yearMonth) {
    loading.value = true
    try {
      statistics.value = await window.electronAPI.getStatistics(yearMonth || currentYearMonth.value)
    } catch (err) {
      console.error('加载统计数据失败:', err)
      statistics.value = null
    } finally {
      loading.value = false
    }
  }

  // 加载有记录的月份列表
  async function loadMonths() {
    try {
      months.value = await window.electronAPI.getMonths()
    } catch (err) {
      console.error('加载月份列表失败:', err)
      months.value = []
    }
  }

  // 搜索记录
  async function searchExpenses(keyword) {
    loading.value = true
    try {
      expenses.value = await window.electronAPI.searchExpenses(keyword)
    } catch (err) {
      console.error('搜索失败:', err)
      expenses.value = []
    } finally {
      loading.value = false
    }
  }

  // 导出 CSV
  async function exportCSV(yearMonth) {
    try {
      return await window.electronAPI.exportCSV(yearMonth || currentYearMonth.value)
    } catch (err) {
      console.error('导出失败:', err)
      return null
    }
  }

  // 设置月份
  function setYearMonth(ym) {
    currentYearMonth.value = ym
    loadExpenses()
  }

  // 设置分类筛选
  function setFilterCategory(cat) {
    filterCategoryL1.value = cat
    loadExpenses()
  }

  return {
    expenses,
    statistics,
    months,
    loading,
    currentYearMonth,
    filterCategoryL1,
    totalAmount,
    loadExpenses,
    addExpense,
    updateExpense,
    deleteExpense,
    loadStatistics,
    loadMonths,
    searchExpenses,
    exportCSV,
    setYearMonth,
    setFilterCategory
  }
})
