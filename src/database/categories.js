// 支出分类体系：一级分类 → 二级分类

export const categories = [
  { name: '餐饮', icon: '🍽️', children: ['早餐', '午餐', '晚餐', '零食饮料', '外卖', '聚餐请客'] },
  { name: '交通', icon: '🚗', children: ['公共交通', '出租车/网约车', '加油充电', '停车费', '火车高铁', '飞机票'] },
  { name: '购物', icon: '🛒', children: ['日用品', '数码产品', '家居用品', '书籍文具', '礼品'] },
  { name: '居住', icon: '🏠', children: ['房租', '物业费', '水电燃气', '维修维护', '家居家装'] },
  { name: '娱乐', icon: '🎮', children: ['电影演出', '游戏', '旅游度假', '运动健身', '宠物'] },
  { name: '教育', icon: '📚', children: ['培训课程', '书籍资料', '考试报名', '学费'] },
  { name: '医疗', icon: '🏥', children: ['挂号问诊', '药品', '体检', '住院'] },
  { name: '通讯', icon: '📱', children: ['话费', '宽带', '快递物流'] },
  { name: '服饰', icon: '👗', children: ['衣服', '鞋帽', '配饰', '美容美发'] },
  { name: '其他', icon: '📦', children: ['人情往来', '慈善捐款', '其他支出'] }
]

/** 获取所有一级分类名称列表 */
export function getCategoryL1List() {
  return categories.map(c => c.name)
}

/** 根据一级分类获取二级分类列表 */
export function getCategoryL2List(l1Name) {
  const category = categories.find(c => c.name === l1Name)
  return category ? category.children : []
}

/** 获取分类图标 */
export function getCategoryIcon(l1Name) {
  const category = categories.find(c => c.name === l1Name)
  return category ? category.icon : '📦'
}
