<template>
  <el-dialog
    :model-value="visible"
    @update:model-value="$emit('update:visible', $event)"
    :title="isEditing ? '编辑记录' : '记一笔'"
    width="90%"
    :close-on-click-modal="false"
    destroy-on-close
  >
    <el-form ref="formRef" :model="form" :rules="rules" label-width="80px" label-position="left">
      <!-- 金额 -->
      <el-form-item label="金额" prop="amount">
        <el-input-number
          v-model="form.amount"
          :min="0.01" :max="999999.99" :precision="2" :step="1"
          placeholder="请输入金额" style="width: 100%"
        >
          <template #prefix>¥</template>
        </el-input-number>
      </el-form-item>

      <!-- 分类 -->
      <el-form-item label="分类" prop="category_l1">
        <CategoryPicker v-model:l1="form.category_l1" v-model:l2="form.category_l2" />
      </el-form-item>

      <!-- 日期 -->
      <el-form-item label="日期" prop="date">
        <el-date-picker
          v-model="form.date" type="date" placeholder="选择日期"
          format="YYYY-MM-DD" value-format="YYYY-MM-DD" style="width: 100%"
        />
      </el-form-item>

      <!-- 备注 -->
      <el-form-item label="备注" prop="note">
        <el-input v-model="form.note" type="textarea" :rows="2" placeholder="可选：写点备注..." maxlength="200" show-word-limit />
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="$emit('update:visible', false)">取消</el-button>
      <el-button type="primary" @click="handleSubmit" :loading="submitting">
        {{ isEditing ? '保存修改' : '确认记录' }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, watch, computed } from 'vue'
import CategoryPicker from './CategoryPicker.vue'

const props = defineProps({
  visible: Boolean,
  editingExpense: { type: Object, default: null }
})

const emit = defineEmits(['update:visible', 'save'])

const isEditing = computed(() => !!props.editingExpense?.id)

const formRef = ref(null)
const submitting = ref(false)

// 表单默认值
function getDefaultForm() {
  const today = new Date()
  const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  return { amount: null, category_l1: '', category_l2: '', date: dateStr, note: '' }
}

const form = reactive(getDefaultForm())

const rules = {
  amount: [
    { required: true, message: '请输入金额', trigger: 'blur' },
    { type: 'number', min: 0.01, message: '金额必须大于0', trigger: 'blur' }
  ],
  category_l1: [{ required: true, message: '请选择分类', trigger: 'change' }],
  date: [{ required: true, message: '请选择日期', trigger: 'change' }]
}

// 编辑模式回填
watch(() => props.editingExpense, (val) => {
  if (val) {
    form.amount = val.amount
    form.category_l1 = val.category_l1
    form.category_l2 = val.category_l2
    form.date = val.date
    form.note = val.note || ''
  }
})

// 关闭时重置
watch(() => props.visible, (val) => {
  if (val && !props.editingExpense) {
    Object.assign(form, getDefaultForm())
  }
})

async function handleSubmit() {
  if (!formRef.value) return
  try { await formRef.value.validate() } catch { return }
  submitting.value = true
  try { emit('save', { ...form }) } finally { submitting.value = false }
}
</script>

<style scoped>
/* 弹窗最大宽度限制 */
:deep(.el-dialog) { max-width: 420px; border-radius: 12px !important; }

/* 手机端标签换行 */
@media (max-width: 400px) {
  :deep(.el-form-item) { display: block !important; }
  :deep(.el-form-item__label) { width: auto !important; text-align: left !important; padding-bottom: 4px; }
  :deep(.el-form-item__content) { margin-left: 0 !important; }
}
</style>
