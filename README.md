# 📒 轻松记账

一款简洁易用的个人记账应用，帮你轻松掌握每一笔收支。

---

## ✨ 功能特性

- **📝 记录支出** — 金额、分类（二级联动）、日期、备注，快速记录
- **📋 支出列表** — 按时间倒序展示，支持月份筛选、分类筛选
- **✏️ 编辑/删除** — 随时修改或删除已有的记账记录
- **📊 数据统计** — 月度饼图 + 柱状图，消费结构一目了然
- **🔍 关键词搜索** — 按备注内容快速查找记录
- **📥 CSV 导出** — 一键导出数据到 CSV 文件，方便用 Excel 打开
- **📂 分类管理** — 自定义支出分类，二级分类体系灵活调整
- **📱 多端支持** — 浏览器直接使用，可打包为 Windows 安装包和 Android APK

---

## 🏗️ 技术栈

| 类型 | 技术 |
|------|------|
| 前端框架 | Vue 3（组合式 API） |
| 构建工具 | Vite |
| UI 组件库 | Element Plus |
| 图表库 | ECharts（vue-echarts） |
| 状态管理 | Pinia |
| 数据存储 | localStorage（浏览器版） |
| 桌面打包 | Tauri v2（Windows .exe 安装包） |
| 移动端打包 | Capacitor（Android APK） |

---

## 🚀 快速开始

### 浏览器版（开发/使用）

```bash
# 1. 进入项目目录
cd d:\heima-jizhang

# 2. 安装依赖
npm install

# 3. 启动开发服务器
npx vite --port 3000

# 4. 浏览器打开
# http://localhost:3000
```

### 打包 Windows 安装包

```bash
# 需要先安装 Rust 和 Visual Studio（含 C++ 编译工具）
npm run tauri build
# 输出：src-tauri/target/release/bundle/nsis/轻松记账_1.0.0_x64-setup.exe
```

### 打包 Android APK

```bash
# 需要先安装 Android Studio
npx cap sync android
npx cap open android
# 在 Android Studio 中 Build → Build Bundle(s) / APK(s)
```

---

## 📁 项目结构

```
heima-jizhang/
├── src/                        # Vue 3 前端源码
│   ├── App.vue                 # 主组件（导航栏）
│   ├── main.js                 # Vue 入口
│   ├── components/             # UI 组件
│   │   ├── ExpenseFormDialog.vue   # 添加/编辑表单弹窗
│   │   ├── ExpenseList.vue         # 记录列表
│   │   └── CategoryPicker.vue      # 二级联动分类选择器
│   ├── views/                  # 页面
│   │   ├── Home.vue                # 首页（记录列表 + 筛选 + 搜索）
│   │   └── Statistics.vue          # 统计页面（饼图 + 柱状图）
│   ├── stores/                 # 状态管理（Pinia）
│   │   └── expense.js
│   ├── database/               # 数据层
│   │   ├── categories.js       # 分类体系定义
│   │   └── storage.js          # localStorage 存储 API
│   └── styles/                 # 全局样式
├── src-tauri/                  # Tauri Rust 后端（桌面版备用）
│   ├── src/
│   │   ├── main.rs             # Rust 入口
│   │   └── lib.rs              # Tauri 命令
│   ├── Cargo.toml
│   └── tauri.conf.json
├── index.html                  # HTML 入口
├── package.json
└── vite.config.js
```

---

## 🗂️ 支出分类

| 一级分类 | 二级分类 |
|---------|---------|
| 餐饮 | 早餐、午餐、晚餐、零食饮料、外卖、聚餐请客 |
| 交通 | 公共交通、出租车/网约车、加油充电、停车费、火车高铁、飞机票 |
| 购物 | 日用品、数码产品、家居用品、书籍文具、礼品 |
| 居住 | 房租、物业费、水电燃气、维修维护、家居家装 |
| 娱乐 | 电影演出、游戏、旅游度假、运动健身、宠物 |
| 教育 | 培训课程、书籍资料、考试报名、学费 |
| 医疗 | 挂号问诊、药品、体检、住院 |
| 通讯 | 话费、宽带、快递物流 |
| 服饰 | 衣服、鞋帽、配饰、美容美发 |
| 其他 | 人情往来、慈善捐款、其他支出 |

---

## 📄 License

MIT License
