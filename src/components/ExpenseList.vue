<template>
  <div class="expense-list">
    <!-- 加载中 -->
    <div v-if="loading" class="loading-container">
      <el-skeleton :rows="8" animated />
    </div>

    <!-- 空状态 -->
    <el-empty v-else-if="!expenses || expenses.length === 0" description="还没有记录，快去记一笔吧！" :image-size="160" />

    <!-- 列表 -->
    <div v-else class="list-container">
      <div v-for="expense in expenses" :key="expense.id" class="expense-card">
        <div class="card-main">
          <div class="card-icon">{{ getCategoryIcon(expense.category_l1) }}</div>
          <div class="card-info">
            <div class="card-category">
              <span class="l2-name">{{ expense.category_l2 }}</span>
              <el-tag size="small" type="info" class="l1-tag">{{ expense.category_l1 }}</el-tag>
            </div>
            <div class="card-meta">
              <span class="card-date">{{ expense.date }}</span>
              <span v-if="expense.note" class="card-note">📝 {{ expense.note }}</span>
            </div>
          </div>
          <div class="card-amount">¥{{ expense.amount.toFixed(2) }}</div>
          <div class="card-actions">
            <el-button text type="primary" size="small" @click="$emit('edit', expense)">
              <el-icon><Edit /></el-icon>
            </el-button>
            <el-button text type="danger" size="small" @click="$emit('delete', expense)">
              <el-icon><Delete /></el-icon>
            </el-button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { Edit, Delete } from '@element-plus/icons-vue'
import { getCategoryIcon } from '../database/categories'

defineProps({
  expenses: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false }
})

defineEmits(['edit', 'delete'])
</script>

<style scoped>
.expense-list { min-height: 300px; }
.loading-container { padding: 20px; background: #fff; border-radius: 8px; }
.list-container { display: flex; flex-direction: column; gap: 8px; }

.expense-card {
  background: #fff;
  border-radius: 10px;
  padding: 16px 20px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.04);
  transition: box-shadow 0.2s, transform 0.2s;
}
.expense-card:hover {
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  transform: translateY(-1px);
}

.card-main { display: flex; align-items: center; gap: 14px; }
.card-icon { font-size: 32px; width: 44px; text-align: center; flex-shrink: 0; }
.card-info { flex: 1; min-width: 0; }
.card-category { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
.l2-name { font-size: 16px; font-weight: 600; color: #303133; }
.l1-tag { font-size: 11px; }
.card-meta { display: flex; align-items: center; gap: 12px; font-size: 13px; color: #909399; }
.card-note { color: #606266; max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.card-amount { font-size: 20px; font-weight: 700; color: #e6a23c; flex-shrink: 0; min-width: 100px; text-align: right; }
.card-actions { display: flex; gap: 4px; flex-shrink: 0; }

/* 手机端适配 */
@media (max-width: 768px) {
  .expense-card { padding: 12px 14px; }
  .card-icon { font-size: 26px; width: 36px; }
  .l2-name { font-size: 14px; }
  .card-amount { font-size: 17px; min-width: 80px; }
  .card-note { max-width: 150px; }
}
</style>
