<template>
  <div class="category-manage-page">
    <!-- 顶部标题栏 -->
    <div class="page-header">
      <h2 class="page-title">分类管理</h2>
      <el-button type="primary" @click="openAddL1Dialog" :icon="Plus">新增一级分类</el-button>
    </div>

    <!-- 预设分类（只读展示） -->
    <div class="section">
      <div class="section-header">
        <span class="section-title">📦 预设分类</span>
        <el-tag size="small" type="info">系统内置，不可修改</el-tag>
      </div>
      <div class="category-cards">
        <div v-for="cat in presetCategories" :key="cat.name" class="cat-card preset-card">
          <div class="card-body">
            <span class="cat-icon">{{ cat.icon }}</span>
            <span class="cat-name">{{ cat.name }}</span>
            <span class="cat-count">({{ cat.children.length }}个子类)</span>
          </div>
          <div class="card-children">
            <el-tag v-for="child in cat.children" :key="child" size="small" class="child-tag">{{ child }}</el-tag>
            <!-- 添加子分类按钮 -->
            <el-button size="small" :icon="Plus" circle @click="openAddL2Dialog(cat.name)" class="add-l2-btn" />
          </div>
        </div>
      </div>
    </div>

    <!-- 用户自定义分类（可编辑删除） -->
    <div class="section" v-if="userL1List.length > 0 || userL2List.length > 0">
      <div class="section-header">
        <span class="section-title">✏️ 我的分类</span>
        <el-tag size="small" type="success">可自由修改</el-tag>
      </div>

      <!-- 用户自建的一级分类 -->
      <div v-if="userL1List.length > 0" class="category-cards">
        <div v-for="cat in userL1List" :key="cat.id" class="cat-card user-card">
          <div class="card-body">
            <span class="cat-icon">{{ cat.icon }}</span>
            <span class="cat-name">{{ cat.name }}</span>
            <span class="cat-count">({{ cat.children.length }}个子类)</span>
            <div class="card-actions">
              <el-button size="small" :icon="Edit" circle @click="openEditL1Dialog(cat)" title="编辑" />
              <el-button size="small" :icon="Delete" circle type="danger" @click="handleDeleteL1(cat)" title="删除" />
            </div>
          </div>
          <div class="card-children">
            <el-tag v-for="child in cat.children" :key="child" size="small" class="child-tag user-child-tag" closable @close="handleDeleteL2Child(cat, child)">{{ child }}</el-tag>
            <el-button size="small" :icon="Plus" circle @click="openAddL2Dialog(cat.name)" class="add-l2-btn" />
          </div>
        </div>
      </div>

      <!-- 用户为预设分类补充的二级子分类 -->
      <div v-if="userL2List.length > 0" class="sub-section">
        <div class="sub-title">补充的子分类（添加在预设分类下）</div>
        <div class="l2-list">
          <div v-for="item in userL2List" :key="item.id" class="l2-item">
            <span class="l2-path">
              <span class="l2-l1">{{ item.l1_name }}</span>
              <el-icon><ArrowRight /></el-icon>
              <span class="l2-name">{{ item.l2_name }}</span>
            </span>
            <div class="l2-actions">
              <el-button size="small" :icon="Edit" circle @click="openEditL2Dialog(item)" title="编辑" />
              <el-button size="small" :icon="Delete" circle type="danger" @click="handleDeleteL2(item)" title="删除" />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <el-empty v-if="userL1List.length === 0 && userL2List.length === 0" description="还没有自定义分类，点击上方按钮新增" />

    <!-- ===== 对话框：新增/编辑一级分类 ===== -->
    <el-dialog
      v-model="l1DialogVisible"
      :title="editingL1 ? '编辑一级分类' : '新增一级分类'"
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

    <!-- ===== 对话框：新增/编辑二级分类 ===== -->
    <el-dialog
      v-model="l2DialogVisible"
      :title="editingL2 ? '编辑二级分类' : '添加二级分类'"
      width="90%"
      :close-on-click-modal="false"
      destroy-on-close
    >
      <el-form ref="l2FormRef" :model="l2Form" :rules="l2Rules" label-width="70px">
        <el-form-item v-if="!editingL2" label="所属分类">
          <el-input :model-value="l2Form.l1_name" disabled />
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
import { ref, computed, onMounted } from 'vue'
import { Plus, Edit, Delete, ArrowRight } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  presetCategories,
  getAllCategories,
  getUserCategories,
  addUserL1Category,
  addUserL2Category,
  updateUserL1Category,
  updateUserL2Category,
  deleteUserL1Category,
  deleteUserL2Category
} from '../database/categories'

// ===== 可选图标列表 =====
const emojiOptions = ['🍽️', '🚗', '🛒', '🏠', '🎮', '📚', '🏥', '📱', '👗', '📦', '💰', '💼', '🎓', '🎵', '🐱', '✈️', '🎁', '💊', '🏃', '🎬', '💻', '☕', '🎂', '💡', '🌱', '💪', '🎨', '✂️', '📷', '🎧']

// ===== 数据 =====
const userCats = ref([])
const saving = ref(false)

// 用户自建的一级分类
const userL1List = computed(() => userCats.value.filter(c => c.type === 'l1'))

// 用户为预设分类补充的二级子分类
const userL2List = computed(() => userCats.value.filter(c => c.type === 'l2'))

function refreshData() {
  userCats.value = getUserCategories()
}

onMounted(() => {
  refreshData()
})

// ===== 一级分类对话框 =====
const l1DialogVisible = ref(false)
const editingL1 = ref(null)
const l1FormRef = ref(null)
const l1Form = ref({ name: '', icon: '📦', children: [] })

const l1Rules = {
  name: [{ required: true, message: '请输入分类名称', trigger: 'blur' }]
}

function openAddL1Dialog() {
  editingL1.value = null
  l1Form.value = { name: '', icon: '📦', children: [] }
  l1DialogVisible.value = true
}

function openEditL1Dialog(cat) {
  editingL1.value = cat
  l1Form.value = {
    name: cat.name,
    icon: cat.icon,
    children: [...cat.children]
  }
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
    if (editingL1.value) {
      await updateUserL1Category(editingL1.value.id, {
        name: l1Form.value.name.trim(),
        icon: l1Form.value.icon,
        children
      })
      ElMessage.success('分类已修改！')
    } else {
      await addUserL1Category(l1Form.value.name.trim(), l1Form.value.icon, children)
      ElMessage.success('新分类已添加！')
    }
    l1DialogVisible.value = false
    refreshData()
  } catch (err) {
    ElMessage.error(err.message || '操作失败')
  } finally {
    saving.value = false
  }
}

async function handleDeleteL1(cat) {
  try {
    await ElMessageBox.confirm(
      `确定删除"${cat.name}"及其所有子分类吗？已使用该分类的历史记录不受影响。`,
      '确认删除',
      { confirmButtonText: '删除', cancelButtonText: '取消', type: 'warning' }
    )
    await deleteUserL1Category(cat.id)
    ElMessage.success('已删除！')
    refreshData()
  } catch { /* 用户取消 */ }
}

// ===== 二级分类对话框 =====
const l2DialogVisible = ref(false)
const editingL2 = ref(null)
const l2FormRef = ref(null)
const l2Form = ref({ l1_name: '', l2_name: '' })

const l2Rules = {
  l2_name: [{ required: true, message: '请输入子分类名称', trigger: 'blur' }]
}

function openAddL2Dialog(l1Name) {
  editingL2.value = null
  l2Form.value = { l1_name: l1Name, l2_name: '' }
  l2DialogVisible.value = true
}

function openEditL2Dialog(item) {
  editingL2.value = item
  l2Form.value = { l1_name: item.l1_name, l2_name: item.l2_name }
  l2DialogVisible.value = true
}

async function handleSaveL2() {
  if (!l2FormRef.value) return
  try { await l2FormRef.value.validate() } catch { return }

  saving.value = true
  try {
    if (editingL2.value) {
      await updateUserL2Category(editingL2.value.id, l2Form.value.l2_name.trim())
      ElMessage.success('子分类已修改！')
    } else {
      await addUserL2Category(l2Form.value.l1_name, l2Form.value.l2_name.trim())
      ElMessage.success('子分类已添加！')
    }
    l2DialogVisible.value = false
    refreshData()
  } catch (err) {
    ElMessage.error(err.message || '操作失败')
  } finally {
    saving.value = false
  }
}

async function handleDeleteL2(item) {
  try {
    await ElMessageBox.confirm(
      `确定删除"${item.l1_name} › ${item.l2_name}"吗？已使用该分类的历史记录不受影响。`,
      '确认删除',
      { confirmButtonText: '删除', cancelButtonText: '取消', type: 'warning' }
    )
    await deleteUserL2Category(item.id)
    ElMessage.success('已删除！')
    refreshData()
  } catch { /* 用户取消 */ }
}

// 删除用户自建L1的某个子分类
async function handleDeleteL2Child(cat, childName) {
  try {
    await ElMessageBox.confirm(
      `确定删除子分类"${childName}"吗？`,
      '确认删除',
      { confirmButtonText: '删除', cancelButtonText: '取消', type: 'warning' }
    )
    // 将去掉该子分类后的列表更新
    const newChildren = cat.children.filter(c => c !== childName)
    await updateUserL1Category(cat.id, { children: newChildren })
    ElMessage.success('已删除！')
    refreshData()
  } catch { /* 用户取消 */ }
}
</script>

<style scoped>
.category-manage-page {
  max-width: 800px;
  margin: 0 auto;
  padding-bottom: 40px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.page-title {
  font-size: 22px;
  font-weight: 700;
  color: #303133;
  margin: 0;
}

/* 分区 */
.section {
  margin-bottom: 24px;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.sub-section {
  margin-top: 16px;
}

.sub-title {
  font-size: 13px;
  color: #909399;
  margin-bottom: 8px;
}

/* 分类卡片 */
.category-cards {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.cat-card {
  background: #fff;
  border-radius: 8px;
  padding: 14px 16px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
}

.card-body {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.cat-icon {
  font-size: 22px;
}

.cat-name {
  font-size: 15px;
  font-weight: 600;
  color: #303133;
}

.cat-count {
  font-size: 12px;
  color: #909399;
}

.card-actions {
  margin-left: auto;
  display: flex;
  gap: 4px;
}

.card-children {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  padding-left: 30px;
}

.child-tag {
  cursor: default;
}

.user-child-tag {
  /* Element Plus el-tag closable 自带样式 */
}

.add-l2-btn {
  width: 22px;
  height: 22px;
  font-size: 12px;
}

/* 二级分类列表 */
.l2-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.l2-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #fff;
  border-radius: 8px;
  padding: 10px 16px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
}

.l2-path {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
}

.l2-l1 {
  color: #909399;
}

.l2-name {
  color: #303133;
  font-weight: 500;
}

.l2-actions {
  display: flex;
  gap: 4px;
}

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

/* 手机端适配 */
@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    gap: 12px;
    align-items: flex-start;
  }

  .cat-card {
    padding: 12px;
  }

  .card-body {
    flex-wrap: wrap;
  }

  .card-children {
    padding-left: 0;
  }

  .emoji-option {
    width: 32px;
    height: 32px;
    font-size: 18px;
  }
}
</style>
