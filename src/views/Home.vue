<template>
  <div class="home-page">
    <!-- 顶部操作栏 -->
    <div class="toolbar">
      <div class="toolbar-left">
        <!-- 月份选择 -->
        <el-select v-model="selectedMonth" placeholder="选择月份" style="width: 180px" @change="handleMonthChange">
          <el-option v-for="m in store.months" :key="m" :label="m" :value="m" />
        </el-select>

        <!-- 分类筛选 -->
        <el-select v-model="selectedCategory" placeholder="全部分类" style="width: 140px" clearable @change="handleCategoryChange">
          <el-option v-for="cat in categories" :key="cat.name" :label="cat.icon + ' ' + cat.name" :value="cat.name" />
        </el-select>

        <!-- 搜索框 -->
        <el-input v-model="searchKeyword" placeholder="搜索备注..." style="width: 200px" clearable @keyup.enter="handleSearch" @clear="handleSearch">
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
      </div>

      <div class="toolbar-right">
        <span class="total-info">本月合计：<strong>¥{{ store.totalAmount.toFixed(2) }}</strong></span>
        <el-button @click="handleExport" :icon="Download" type="default">导出CSV</el-button>
        <el-button type="primary" @click="openAddDialog" :icon="Plus">记一笔</el-button>
      </div>
    </div>

    <!-- 支出列表 -->
    <ExpenseList :expenses="store.expenses" :loading="store.loading" @edit="openEditDialog" @delete="handleDelete" />

    <!-- 添加/编辑弹窗 -->
    <ExpenseFormDialog v-model:visible="dialogVisible" :editing-expense="editingExpense" @save="handleSave" />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { Plus, Search, Download } from '@element-plus/icons-vue'
import { useExpenseStore } from '../stores/expense'
import { getAllCategories } from '../database/categories'
import ExpenseList from '../components/ExpenseList.vue'
import ExpenseFormDialog from '../components/ExpenseFormDialog.vue'
import { ElMessage, ElMessageBox } from 'element-plus'

const store = useExpenseStore()
const categories = getAllCategories() // 完整分类列表（含用户自定义）
const selectedMonth = ref(store.currentYearMonth)
const selectedCategory = ref('')
const searchKeyword = ref('')
const dialogVisible = ref(false)
const editingExpense = ref(null)

onMounted(() => {
  store.loadMonths()
  store.loadExpenses()
})

function handleMonthChange(val) { store.setYearMonth(val) }
function handleCategoryChange(val) { store.setFilterCategory(val || '') }

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
    if (editingExpense.value?.id) {
      await store.updateExpense({ ...formData, id: editingExpense.value.id })
      ElMessage.success('修改成功！')
    } else {
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
  } catch {
    // 用户取消
  }
}

async function handleExport() {
  try {
    const csv = await store.exportCSV(selectedMonth.value)
    const filename = `轻松记账_${selectedMonth.value}.csv`

    // 桌面版（Tauri）：保存到下载文件夹，显示路径
    if (window.__TAURI_INTERNALS__) {
      const { invoke } = await import('@tauri-apps/api/core')
      const savedPath = await invoke('save_file', { content: csv, defaultName: filename })
      if (savedPath) {
        await ElMessageBox.alert(
          `文件已保存到：\n${savedPath}`,
          '导出成功',
          {
            confirmButtonText: '打开文件夹',
            type: 'success',
            callback: () => {
              // 用系统文件管理器打开文件夹
              window.open(`file:///${savedPath.replace(/\\/g, '/').replace(/\/[^/]+$/, '')}`)
            }
          }
        )
      }
    } else if (window.Capacitor) {
      // 手机版（Capacitor）：用原生分享面板
      try {
        const { Share } = await import('@capacitor/share')
        const { Filesystem, Directory } = await import('@capacitor/filesystem')
        const result = await Filesystem.writeFile({
          path: filename,
          data: csv,
          directory: Directory.Cache
        })
        await Share.share({
          title: '轻松记账 数据导出',
          text: '记账数据CSV文件',
          url: result.uri,
          dialogTitle: '分享记账数据'
        })
      } catch (shareErr) {
        // 分享失败则降级为下载
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        a.click()
        URL.revokeObjectURL(url)
        ElMessage.success('文件已下载，请在浏览器下载列表查看')
      }
    } else {
      // 浏览器：触发下载
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
      ElMessage.success('导出成功！请查看浏览器下载列表')
    }
  } catch (err) {
    if (err !== '用户取消') {
      ElMessage.error('导出失败')
    }
  }
}
</script>

<style scoped>
.home-page { max-width: 1000px; margin: 0 auto; }

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 16px;
  padding: 12px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
}

.toolbar-left { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; flex: 1; min-width: 0; }
.toolbar-right { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }

.total-info { font-size: 14px; color: #606266; white-space: nowrap; }
.total-info strong { color: #e6a23c; font-size: 16px; }

/* 手机端适配 */
@media (max-width: 768px) {
  .toolbar { flex-direction: column; align-items: stretch; padding: 10px; }
  .toolbar-left { flex-wrap: wrap; gap: 6px; }
  .toolbar-left .el-select,
  .toolbar-left .el-input { width: calc(50% - 3px) !important; min-width: 0 !important; }
  .toolbar-right { justify-content: space-between; width: 100%; }
  .total-info { font-size: 13px; }
  .total-info strong { font-size: 16px; }
}
</style>
