<template>
  <div class="category-picker">
    <!-- 一级分类 -->
    <div class="picker-row">
      <el-select
        :model-value="l1"
        @update:model-value="handleL1Change"
        placeholder="一级分类"
        style="flex: 1"
      >
        <el-option v-for="cat in categories" :key="cat.name" :label="cat.icon + ' ' + cat.name" :value="cat.name" />
      </el-select>
      <el-button class="add-btn" :icon="Plus" circle size="small" @click="openAddL1Dialog" title="新增一级分类" />
    </div>

    <!-- 二级分类 -->
    <div v-if="l1" class="picker-row" style="margin-top: 8px">
      <el-select
        :model-value="l2"
        @update:model-value="handleL2Change"
        placeholder="二级分类"
        style="flex: 1"
      >
        <el-option v-for="item in subCategories" :key="item" :label="item" :value="item" />
      </el-select>
      <el-button class="add-btn" :icon="Plus" circle size="small" @click="openAddL2Dialog" title="新增二级分类" />
    </div>

    <!-- 快捷选择 -->
    <div v-if="!l1" class="quick-tags">
      <span class="quick-label">快捷分类：</span>
      <el-tag
        v-for="item in quickCategories" :key="item.l1 + item.l2"
        class="quick-tag" type="info"
        @click="handleQuickSelect(item.l1, item.l2)"
      >
        {{ item.l2 }}
      </el-tag>
    </div>

    <!-- ===== 对话框：新增一级分类 ===== -->
    <el-dialog
      v-model="l1DialogVisible"
      title="新增一级分类"
      width="90%"
      :close-on-click-modal="false"
      destroy-on-close
    >
      <el-form ref="l1FormRef" :model="l1Form" :rules="l1Rules" label-width="70px">
        <el-form-item label="名称" prop="name">
          <el-input v-model="l1Form.name" placeholder="分类名称（如：投资、人情）" maxlength="10" show-word-limit />
        </el-form-item>

        <el-form-item label="图标" prop="icon">
          <div class="emoji-picker">
            <span
              v-for="emoji in emojiOptions" :key="emoji"
              :class="['emoji-option', { active: l1Form.icon === emoji }]"
              @click="l1Form.icon = emoji"
            >{{ emoji }}</span>
          </div>
        </el-form-item>

        <el-form-item label="子分类">
          <div class="children-editor">
            <div v-for="(child, idx) in l1Form.children" :key="idx" class="child-row">
              <el-input v-model="l1Form.children[idx]" placeholder="子分类名称" maxlength="10" style="flex:1" />
              <el-button :icon="Delete" circle size="small" @click="l1Form.children.splice(idx, 1)" />
            </div>
            <el-button size="small" :icon="Plus" @click="l1Form.children.push('')" :disabled="l1Form.children.length >= 12">
              添加子分类
            </el-button>
          </div>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="l1DialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSaveL1" :loading="saving">保存</el-button>
      </template>
    </el-dialog>

    <!-- ===== 对话框：新增二级分类 ===== -->
    <el-dialog
      v-model="l2DialogVisible"
      title="添加二级分类"
      width="90%"
      :close-on-click-modal="false"
      destroy-on-close
    >
      <el-form ref="l2FormRef" :model="l2Form" :rules="l2Rules" label-width="70px">
        <el-form-item label="所属分类">
          <el-input :model-value="l1" disabled />
        </el-form-item>
        <el-form-item label="名称" prop="l2_name">
          <el-input v-model="l2Form.l2_name" placeholder="子分类名称（如：宵夜、快递）" maxlength="10" show-word-limit />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="l2DialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSaveL2" :loading="saving">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { Plus, Delete } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import {
  getAllCategories,
  getCategoryL2List,
  addUserL1Category,
  addUserL2Category
} from '../database/categories'

const props = defineProps({
  l1: { type: String, default: '' },
  l2: { type: String, default: '' }
})

const emit = defineEmits(['update:l1', 'update:l2'])

// 可选图标列表
const emojiOptions = ['🍽️', '🚗', '🛒', '🏠', '🎮', '📚', '🏥', '📱', '👗', '📦', '💰', '💼', '🎓', '🎵', '🐱', '✈️', '🎁', '💊', '🏃', '🎬', '💻', '☕', '🎂', '💡', '🌱', '💪', '🎨', '✂️', '📷', '🎧']

// 分类数据（用 ref 保证可刷新）
const categories = ref(getAllCategories())

const subCategories = computed(() => {
  return props.l1 ? getCategoryL2List(props.l1) : []
})

const quickCategories = computed(() => {
  const result = []
  for (const cat of categories.value) {
    for (const child of cat.children.slice(0, 2)) {
      result.push({ l1: cat.name, l2: child })
    }
  }
  return result
})

/** 刷新分类数据（新增后调用） */
function refreshCategories() {
  categories.value = getAllCategories()
}

function handleL1Change(val) { emit('update:l1', val); emit('update:l2', '') }
function handleL2Change(val) { emit('update:l2', val) }
function handleQuickSelect(l1, l2) { emit('update:l1', l1); emit('update:l2', l2) }

// ===== 一级分类新增弹窗 =====
const l1DialogVisible = ref(false)
const l1FormRef = ref(null)
const l1Form = ref({ name: '', icon: '📦', children: [] })
const saving = ref(false)

const l1Rules = {
  name: [{ required: true, message: '请输入分类名称', trigger: 'blur' }]
}

function openAddL1Dialog() {
  l1Form.value = { name: '', icon: '📦', children: [] }
  l1DialogVisible.value = true
}

async function handleSaveL1() {
  if (!l1FormRef.value) return
  try { await l1FormRef.value.validate() } catch { return }

  // 过滤空的子分类
  const children = l1Form.value.children.filter(c => c.trim() !== '')

  // 检查子分类是否有重名
  const unique = new Set(children)
  if (unique.size !== children.length) {
    ElMessage.warning('子分类名称不能重复')
    return
  }

  saving.value = true
  try {
    await addUserL1Category(l1Form.value.name.trim(), l1Form.value.icon, children)
    ElMessage.success('新分类已添加！')
    l1DialogVisible.value = false
    refreshCategories()
    // 自动选中新添加的分类
    emit('update:l1', l1Form.value.name.trim())
    emit('update:l2', '')
  } catch (err) {
    ElMessage.error(err.message || '添加失败')
  } finally {
    saving.value = false
  }
}

// ===== 二级分类新增弹窗 =====
const l2DialogVisible = ref(false)
const l2FormRef = ref(null)
const l2Form = ref({ l2_name: '' })

const l2Rules = {
  l2_name: [{ required: true, message: '请输入子分类名称', trigger: 'blur' }]
}

function openAddL2Dialog() {
  l2Form.value = { l2_name: '' }
  l2DialogVisible.value = true
}

async function handleSaveL2() {
  if (!l2FormRef.value) return
  try { await l2FormRef.value.validate() } catch { return }

  saving.value = true
  try {
    await addUserL2Category(props.l1, l2Form.value.l2_name.trim())
    ElMessage.success('子分类已添加！')
    l2DialogVisible.value = false
    refreshCategories()
    // 自动选中新添加的子分类
    emit('update:l2', l2Form.value.l2_name.trim())
  } catch (err) {
    ElMessage.error(err.message || '添加失败')
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.category-picker { width: 100%; }

/* 选择器 + 加号按钮的行 */
.picker-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.add-btn {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  font-size: 13px;
  color: #409eff;
  border-color: #409eff;
}

.add-btn:hover {
  background: #ecf5ff;
}

/* 快捷选择 */
.quick-tags { margin-top: 8px; }
.quick-label { font-size: 12px; color: #909399; margin-right: 6px; }
.quick-tag { cursor: pointer; margin-right: 4px; margin-bottom: 4px; }

/* 图标选择器 */
.emoji-picker {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.emoji-option {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  border: 2px solid transparent;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.emoji-option:hover {
  background: #f0f2f5;
}

.emoji-option.active {
  border-color: #409eff;
  background: #ecf5ff;
}

/* 子分类编辑器 */
.children-editor {
  width: 100%;
}

.child-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
}

/* 弹窗最大宽度限制 */
:deep(.el-dialog) { max-width: 420px; border-radius: 12px !important; }

/* 手机端适配 */
@media (max-width: 400px) {
  .emoji-option {
    width: 30px;
    height: 30px;
    font-size: 18px;
  }
}
</style>
