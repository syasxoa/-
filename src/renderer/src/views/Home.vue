<template>
  <div class="home-page">
    <!-- 顶部操作栏 -->
    <div class="toolbar">
      <div class="toolbar-left">
        <!-- 月份选择 -->
        <el-select
          v-model="selectedMonth"
          placeholder="选择月份"
          style="width: 180px"
          @change="handleMonthChange"
        >
          <el-option
            v-for="m in store.months"
            :key="m"
            :label="m"
            :value="m"
          />
        </el-select>

        <!-- 分类筛选 -->
        <el-select
          v-model="selectedCategory"
          placeholder="全部分类"
          style="width: 140px"
          clearable
          @change="handleCategoryChange"
        >
          <el-option
            v-for="cat in categories"
            :key="cat.name"
            :label="cat.icon + ' ' + cat.name"
            :value="cat.name"
          />
        </el-select>

        <!-- 搜索框 -->
        <el-input
          v-model="searchKeyword"
          placeholder="搜索备注..."
          style="width: 200px"
          clearable
          @keyup.enter="handleSearch"
          @clear="handleSearch"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
      </div>

      <div class="toolbar-right">
        <!-- 本月合计 -->
        <span class="total-info">
          本月合计：<strong>¥{{ store.totalAmount.toFixed(2) }}</strong>
        </span>

        <!-- 导出按钮 -->
        <el-button @click="handleExport" :icon="Download" type="default" size="default">
          导出CSV
        </el-button>

        <!-- 添加按钮 -->
        <el-button type="primary" size="default" @click="openAddDialog" :icon="Plus">
          记一笔
        </el-button>
      </div>
    </div>

    <!-- 支出列表 -->
    <ExpenseList
      :expenses="store.expenses"
      :loading="store.loading"
      @edit="openEditDialog"
      @delete="handleDelete"
    />

    <!-- 添加/编辑弹窗 -->
    <ExpenseFormDialog
      v-model:visible="dialogVisible"
      :editing-expense="editingExpense"
      @save="handleSave"
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { Plus, Search, Download } from '@element-plus/icons-vue'
import { useExpenseStore } from '../stores/expense'
import { categories } from '../database/categories'
import ExpenseList from '../components/ExpenseList.vue'
import ExpenseFormDialog from '../components/ExpenseFormDialog.vue'
import { ElMessage, ElMessageBox } from 'element-plus'

const store = useExpenseStore()

const selectedMonth = ref(store.currentYearMonth)
const selectedCategory = ref('')
const searchKeyword = ref('')
const dialogVisible = ref(false)
const editingExpense = ref(null)

onMounted(() => {
  store.loadMonths()
  store.loadExpenses()
})

function handleMonthChange(val) {
  store.setYearMonth(val)
}

function handleCategoryChange(val) {
  store.setFilterCategory(val || '')
}

function handleSearch() {
  if (searchKeyword.value.trim()) {
    store.searchExpenses(searchKeyword.value.trim())
  } else {
    store.loadExpenses()
  }
}

function openAddDialog() {
  editingExpense.value = null
  dialogVisible.value = true
}

function openEditDialog(expense) {
  editingExpense.value = { ...expense }
  dialogVisible.value = true
}

async function handleSave(formData) {
  try {
    if (editingExpense.value && editingExpense.value.id) {
      // 编辑模式
      await store.updateExpense({ ...formData, id: editingExpense.value.id })
      ElMessage.success('修改成功！')
    } else {
      // 添加模式
      await store.addExpense(formData)
      ElMessage.success('记录成功！')
    }
    dialogVisible.value = false
  } catch (err) {
    ElMessage.error('操作失败，请重试')
  }
}

async function handleDelete(expense) {
  try {
    await ElMessageBox.confirm(
      `确定要删除这条 ¥${expense.amount.toFixed(2)} 的记录吗？`,
      '确认删除',
      { confirmButtonText: '删除', cancelButtonText: '取消', type: 'warning' }
    )
    await store.deleteExpense(expense.id)
    ElMessage.success('删除成功！')
  } catch (err) {
    if (err !== 'cancel') {
      ElMessage.error('删除失败')
    }
  }
}

async function handleExport() {
  try {
    const result = await store.exportCSV(selectedMonth.value)
    if (result && result.success) {
      // 创建 Blob 并触发下载
      const blob = new Blob([result.csv], { type: 'text/csv;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `轻松记账_${selectedMonth.value}.csv`
      a.click()
      URL.revokeObjectURL(url)
      ElMessage.success('导出成功！')
    }
  } catch (err) {
    ElMessage.error('导出失败')
  }
}
</script>

<style scoped>
.home-page {
  max-width: 1000px;
  margin: 0 auto;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 16px;
  padding: 16px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.total-info {
  font-size: 15px;
  color: #606266;
  margin-right: 8px;
}

.total-info strong {
  color: #e6a23c;
  font-size: 18px;
}
</style>
