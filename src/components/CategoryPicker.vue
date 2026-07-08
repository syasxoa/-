<template>
  <div class="category-picker">
    <!-- 一级分类 -->
    <el-select
      :model-value="l1"
      @update:model-value="handleL1Change"
      placeholder="一级分类"
      style="width: 100%; margin-bottom: 8px"
    >
      <el-option v-for="cat in categories" :key="cat.name" :label="cat.icon + ' ' + cat.name" :value="cat.name" />
    </el-select>

    <!-- 二级分类 -->
    <el-select
      v-if="l1"
      :model-value="l2"
      @update:model-value="handleL2Change"
      placeholder="二级分类"
      style="width: 100%"
    >
      <el-option v-for="item in subCategories" :key="item" :label="item" :value="item" />
    </el-select>

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
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { categories, getCategoryL2List } from '../database/categories'

const props = defineProps({
  l1: { type: String, default: '' },
  l2: { type: String, default: '' }
})

const emit = defineEmits(['update:l1', 'update:l2'])

const subCategories = computed(() => {
  return props.l1 ? getCategoryL2List(props.l1) : []
})

const quickCategories = computed(() => {
  const result = []
  for (const cat of categories) {
    for (const child of cat.children.slice(0, 2)) {
      result.push({ l1: cat.name, l2: child })
    }
  }
  return result
})

function handleL1Change(val) { emit('update:l1', val); emit('update:l2', '') }
function handleL2Change(val) { emit('update:l2', val) }
function handleQuickSelect(l1, l2) { emit('update:l1', l1); emit('update:l2', l2) }
</script>

<style scoped>
.category-picker { width: 100%; }
.quick-tags { margin-top: 8px; }
.quick-label { font-size: 12px; color: #909399; margin-right: 6px; }
.quick-tag { cursor: pointer; margin-right: 4px; margin-bottom: 4px; }
</style>
