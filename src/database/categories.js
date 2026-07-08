// 支出分类体系：一级分类 → 二级分类
// 分为【预设分类】（代码写死，不可修改）和【用户自定义分类】（localStorage 存储，可增删改）

// ===== 预设分类（代码写死，用户不可修改/删除）=====
export const presetCategories = [
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

// ===== 用户自定义分类存储（localStorage）=====
const USER_CAT_KEY = 'heima-jizhang-user-categories'
const USER_CAT_ID_KEY = 'heima-jizhang-user-category-next-id'

/** 从 localStorage 加载用户分类 */
function loadUserCategories() {
  try {
    const raw = localStorage.getItem(USER_CAT_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

/** 保存用户分类到 localStorage */
function saveUserCategories(list) {
  try { localStorage.setItem(USER_CAT_KEY, JSON.stringify(list)) } catch {}
}

/** 生成自增 ID */
function getNextUserCatId() {
  const id = parseInt(localStorage.getItem(USER_CAT_ID_KEY) || '0', 10) + 1
  localStorage.setItem(USER_CAT_ID_KEY, String(id))
  return id
}

/** 当前时间字符串 */
function nowStr() {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

// ===== 获取合并后的完整分类列表 =====

/**
 * 获取完整分类列表（预设 + 用户自定义）
 * 每次调用都会重新读取 localStorage，确保数据最新
 * 返回格式：[{ name, icon, children, isPreset?, isUser?, userId? }]
 */
export function getAllCategories() {
  const userCats = loadUserCategories()

  // 深拷贝预设分类（避免后续操作污染原始数据）
  const merged = presetCategories.map(c => ({
    name: c.name,
    icon: c.icon,
    children: [...c.children],
    isPreset: true
  }))

  // 1. 添加用户创建的一级分类
  for (const uc of userCats.filter(c => c.type === 'l1')) {
    merged.push({
      name: uc.name,
      icon: uc.icon,
      children: [...uc.children],
      isUser: true,
      userId: uc.id
    })
  }

  // 2. 把用户添加的二级子分类合并到对应的一级分类下
  for (const uc of userCats.filter(c => c.type === 'l2')) {
    const parent = merged.find(c => c.name === uc.l1_name)
    if (parent && !parent.children.includes(uc.l2_name)) {
      parent.children.push(uc.l2_name)
    }
  }

  return merged
}

// ===== 用户分类 CRUD 操作 =====

/** 获取用户自定义分类原始数据（供管理页面使用） */
export function getUserCategories() {
  return loadUserCategories()
}

/**
 * 新增一级分类
 * @param {string} name - 分类名称
 * @param {string} icon - 图标（emoji）
 * @param {string[]} children - 二级分类名称列表（可选）
 */
export function addUserL1Category(name, icon, children = []) {
  const all = getAllCategories()
  if (all.some(c => c.name === name)) {
    throw new Error(`一级分类"${name}"已存在`)
  }
  const list = loadUserCategories()
  list.push({
    id: getNextUserCatId(),
    type: 'l1',
    name,
    icon,
    children,
    created_at: nowStr()
  })
  saveUserCategories(list)
}

/**
 * 新增二级分类（添加到指定一级分类下）
 * @param {string} l1Name - 所属一级分类名称
 * @param {string} l2Name - 二级分类名称
 */
export function addUserL2Category(l1Name, l2Name) {
  const all = getAllCategories()
  const parent = all.find(c => c.name === l1Name)
  if (!parent) {
    throw new Error(`一级分类"${l1Name}"不存在`)
  }
  if (parent.children.includes(l2Name)) {
    throw new Error(`二级分类"${l2Name}"已在"${l1Name}"下存在`)
  }

  const list = loadUserCategories()

  // BUG修复：如果父级是用户自建的一级分类，直接更新该L1记录的children数组
  // 这样分类管理页面才能正确显示子分类数量
  const parentL1 = list.find(c => c.type === 'l1' && c.name === l1Name)
  if (parentL1) {
    parentL1.children.push(l2Name)
  } else {
    // 父级是预设分类，创建独立的L2记录
    list.push({
      id: getNextUserCatId(),
      type: 'l2',
      l1_name: l1Name,
      l2_name: l2Name,
      created_at: nowStr()
    })
  }

  saveUserCategories(list)
}

/**
 * 修改一级分类（仅限用户创建的）
 * @param {number} id - 分类ID
 * @param {object} updates - { name?, icon?, children? }
 */
export function updateUserL1Category(id, updates) {
  const list = loadUserCategories()
  const item = list.find(c => c.id === id && c.type === 'l1')
  if (!item) {
    throw new Error('该分类不存在或不可修改（预设分类受保护）')
  }

  // 新名称冲突检查
  if (updates.name && updates.name !== item.name) {
    const all = getAllCategories()
    if (all.some(c => c.name === updates.name)) {
      throw new Error(`一级分类"${updates.name}"已存在`)
    }
    // 同步更新依赖此一级分类的二级子分类引用
    for (const uc of list) {
      if (uc.type === 'l2' && uc.l1_name === item.name) {
        uc.l1_name = updates.name
      }
    }
  }

  if (updates.name !== undefined) item.name = updates.name
  if (updates.icon !== undefined) item.icon = updates.icon
  if (updates.children !== undefined) {
    item.children = updates.children
    // 清理该L1下所有旧的独立L2记录（统一由L1的children数组管理）
    // 这样可以兼容之前的旧数据
    const childrenSet = new Set(updates.children)
    for (let i = list.length - 1; i >= 0; i--) {
      if (list[i].type === 'l2' && list[i].l1_name === item.name && !childrenSet.has(list[i].l2_name)) {
        list.splice(i, 1)
      }
    }
  }

  saveUserCategories(list)
}

/**
 * 修改二级分类名称（仅限用户创建的）
 * @param {number} id - 分类ID
 * @param {string} newL2Name - 新名称
 */
export function updateUserL2Category(id, newL2Name) {
  const list = loadUserCategories()
  const item = list.find(c => c.id === id && c.type === 'l2')
  if (!item) {
    throw new Error('该分类不存在或不可修改（预设分类受保护）')
  }

  // 检查同一父分类下是否有重名
  const all = getAllCategories()
  const parent = all.find(c => c.name === item.l1_name)
  if (parent && parent.children.includes(newL2Name) && newL2Name !== item.l2_name) {
    throw new Error(`二级分类"${newL2Name}"已在"${item.l1_name}"下存在`)
  }

  item.l2_name = newL2Name
  saveUserCategories(list)
}

/**
 * 删除一级分类（仅限用户创建的，同时删除其下的二级子分类）
 * 注意：已使用该分类的历史记账记录不受影响（记录存的是名称字符串）
 */
export function deleteUserL1Category(id) {
  const list = loadUserCategories()
  const item = list.find(c => c.id === id && c.type === 'l1')
  if (!item) {
    throw new Error('该分类不存在或不可删除（预设分类受保护）')
  }
  // 删除一级分类 + 所有引用该名称的二级子分类
  saveUserCategories(list.filter(c => !(c.id === id || (c.type === 'l2' && c.l1_name === item.name))))
}

/**
 * 删除二级分类（仅限用户创建的）
 * 注意：已使用该分类的历史记账记录不受影响
 */
export function deleteUserL2Category(id) {
  const list = loadUserCategories()
  const item = list.find(c => c.id === id && c.type === 'l2')
  if (!item) {
    throw new Error('该分类不存在或不可删除（预设分类受保护）')
  }
  saveUserCategories(list.filter(c => c.id !== id))
}

// ===== 查询辅助函数（自动包含用户分类）=====

/** 获取所有一级分类名称列表 */
export function getCategoryL1List() {
  return getAllCategories().map(c => c.name)
}

/** 根据一级分类获取二级分类列表 */
export function getCategoryL2List(l1Name) {
  const category = getAllCategories().find(c => c.name === l1Name)
  return category ? category.children : []
}

/** 获取分类图标 */
export function getCategoryIcon(l1Name) {
  const category = getAllCategories().find(c => c.name === l1Name)
  return category ? category.icon : '📦'
}
