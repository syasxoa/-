<template>
  <div class="statistics-page">
    <!-- 月份选择 -->
    <div class="stat-header">
      <el-select
        v-model="selectedMonth"
        placeholder="选择月份"
        style="width: 180px"
        @change="loadData"
      >
        <el-option
          v-for="m in store.months"
          :key="m"
          :label="m"
          :value="m"
        />
      </el-select>

      <el-button @click="loadData" :icon="Refresh" :loading="store.loading">
        刷新
      </el-button>
    </div>

    <!-- 概览卡片 -->
    <el-row :gutter="16" class="overview-cards">
      <el-col :span="8">
        <el-card shadow="hover">
          <div class="card-content">
            <div class="card-label">当月总支出</div>
            <div class="card-value amount">¥{{ statsData.total.toFixed(2) }}</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card shadow="hover">
          <div class="card-content">
            <div class="card-label">支出笔数</div>
            <div class="card-value count">{{ statsData.count }} 笔</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card shadow="hover">
          <div class="card-content">
            <div class="card-label">日均支出</div>
            <div class="card-value avg">¥{{ statsData.avgPerDay }}</div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 图表区 -->
    <el-row :gutter="16" class="chart-row">
      <el-col :span="12">
        <el-card shadow="hover">
          <template #header>
            <span class="chart-title">一级分类占比（饼图）</span>
          </template>
          <div class="chart-container">
            <v-chart
              v-if="pieChartOption"
              :option="pieChartOption"
              autoresize
              style="height: 360px"
            />
            <el-empty v-else description="暂无数据" />
          </div>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card shadow="hover">
          <template #header>
            <span class="chart-title">二级分类排行（柱状图）</span>
          </template>
          <div class="chart-container">
            <v-chart
              v-if="barChartOption"
              :option="barChartOption"
              autoresize
              style="height: 360px"
            />
            <el-empty v-else description="暂无数据" />
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { Refresh } from '@element-plus/icons-vue'
import { useExpenseStore } from '../stores/expense'
import { categories } from '../database/categories'
import VChart from 'vue-echarts'
import { use } from 'echarts/core'
import { PieChart, BarChart } from 'echarts/charts'
import { TitleComponent, TooltipComponent, LegendComponent, GridComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'

// 按需引入 ECharts 组件
use([
  PieChart,
  BarChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
  CanvasRenderer
])

const store = useExpenseStore()
const selectedMonth = ref(store.currentYearMonth)

const statsData = computed(() => {
  return store.statistics || { total: 0, count: 0, avgPerDay: '0.00', byCategory: [], bySubCategory: [] }
})

// 饼图配置：一级分类占比
const pieChartOption = computed(() => {
  const data = statsData.value.byCategory
  if (!data || data.length === 0) return null

  return {
    tooltip: {
      trigger: 'item',
      formatter: '{b}: ¥{c} ({d}%)'
    },
    legend: {
      orient: 'vertical',
      right: 10,
      top: 'center',
      textStyle: { fontSize: 12 }
    },
    series: [{
      type: 'pie',
      radius: ['45%', '75%'], // 环形图
      center: ['40%', '50%'],
      itemStyle: {
        borderRadius: 6,
        borderColor: '#fff',
        borderWidth: 2
      },
      label: {
        show: true,
        formatter: '{b}\n{d}%',
        fontSize: 11
      },
      data: data.map(item => ({
        name: item.category_l1,
        value: item.total
      }))
    }]
  }
})

// 柱状图配置：二级分类排行
const barChartOption = computed(() => {
  const data = statsData.value.bySubCategory
  if (!data || data.length === 0) return null

  // 取前15条，按金额升序（ECharts条形图从下往上）
  const topData = data.slice(0, 15).reverse()

  return {
    tooltip: {
      trigger: 'axis',
      formatter: '{b}: ¥{c}'
    },
    grid: {
      left: '3%',
      right: '10%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'value',
      axisLabel: {
        formatter: '¥{value}'
      }
    },
    yAxis: {
      type: 'category',
      data: topData.map(item => `${item.category_l2}`),
      axisLabel: {
        fontSize: 11
      }
    },
    series: [{
      type: 'bar',
      data: topData.map(item => item.total),
      itemStyle: {
        color: '#409eff',
        borderRadius: [0, 4, 4, 0]
      },
      label: {
        show: true,
        position: 'right',
        formatter: '¥{c}',
        fontSize: 11
      }
    }]
  }
})

onMounted(() => {
  store.loadMonths()
  loadData()
})

function loadData() {
  store.loadStatistics(selectedMonth.value)
}
</script>

<style scoped>
.statistics-page {
  max-width: 1000px;
  margin: 0 auto;
}

.stat-header {
  display: flex;
  gap: 10px;
  margin-bottom: 16px;
}

.overview-cards {
  margin-bottom: 16px;
}

.card-content {
  text-align: center;
  padding: 8px 0;
}

.card-label {
  font-size: 14px;
  color: #909399;
  margin-bottom: 8px;
}

.card-value {
  font-size: 24px;
  font-weight: 700;
}

.card-value.amount {
  color: #e6a23c;
}

.card-value.count {
  color: #409eff;
}

.card-value.avg {
  color: #67c23a;
}

.chart-row {
  margin-bottom: 16px;
}

.chart-title {
  font-weight: 600;
  font-size: 15px;
}

.chart-container {
  min-height: 360px;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
