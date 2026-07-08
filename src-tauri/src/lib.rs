use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::Manager;

// ===== 数据结构 =====

/// 支出记录
#[derive(Debug, Serialize, Deserialize, Clone)]
struct Expense {
    id: u64,
    amount: f64,
    category_l1: String,
    category_l2: String,
    date: String,
    note: String,
    created_at: String,
    updated_at: String,
}

/// 添加/更新时的请求数据
#[derive(Debug, Deserialize)]
struct ExpenseInput {
    id: Option<u64>,
    amount: f64,
    category_l1: String,
    category_l2: String,
    date: String,
    note: Option<String>,
}

/// 查询筛选条件
#[derive(Debug, Deserialize, Default)]
struct ExpenseFilter {
    year_month: Option<String>,
    category_l1: Option<String>,
    date_from: Option<String>,
    date_to: Option<String>,
}

/// 月度统计
#[derive(Debug, Serialize)]
struct Statistics {
    total: f64,
    count: i64,
    avg_per_day: String,
    by_category: Vec<CategoryStat>,
    by_sub_category: Vec<SubCategoryStat>,
}

#[derive(Debug, Serialize)]
struct CategoryStat {
    category_l1: String,
    total: f64,
    count: i64,
}

#[derive(Debug, Serialize)]
struct SubCategoryStat {
    category_l1: String,
    category_l2: String,
    total: f64,
    count: i64,
}

/// 应用状态（基于 JSON 文件存储）
struct AppState {
    data: Mutex<Vec<Expense>>,
    data_path: PathBuf,
    next_id: Mutex<u64>,
}

// ===== 辅助函数 =====

/// 获取当前时间的本地字符串
fn now_str() -> String {
    let now = chrono::Local::now();
    now.format("%Y-%m-%d %H:%M:%S").to_string()
}

/// 加载或创建数据文件
fn load_data(path: &PathBuf) -> Vec<Expense> {
    if path.exists() {
        let content = fs::read_to_string(path).unwrap_or_default();
        serde_json::from_str(&content).unwrap_or_default()
    } else {
        Vec::new()
    }
}

/// 保存数据到文件
fn save_data(path: &PathBuf, data: &Vec<Expense>) {
    if let Some(parent) = path.parent() {
        let _ = fs::create_dir_all(parent);
    }
    let json = serde_json::to_string_pretty(data).unwrap_or_default();
    let _ = fs::write(path, json);
}

/// 计算下一个 ID
fn calc_next_id(data: &[Expense]) -> u64 {
    data.iter().map(|e| e.id).max().unwrap_or(0) + 1
}

// ===== Tauri 命令 =====

#[tauri::command]
fn add_expense(state: tauri::State<AppState>, data: ExpenseInput) -> Result<u64, String> {
    let mut list = state.data.lock().map_err(|e| e.to_string())?;
    let mut next_id = state.next_id.lock().map_err(|e| e.to_string())?;

    let now = now_str();
    let id = *next_id;
    *next_id += 1;

    let expense = Expense {
        id,
        amount: data.amount,
        category_l1: data.category_l1,
        category_l2: data.category_l2,
        date: data.date,
        note: data.note.unwrap_or_default(),
        created_at: now.clone(),
        updated_at: now,
    };

    list.push(expense);
    save_data(&state.data_path, &list);
    Ok(id)
}

#[tauri::command]
fn update_expense(state: tauri::State<AppState>, data: ExpenseInput) -> Result<(), String> {
    let mut list = state.data.lock().map_err(|e| e.to_string())?;
    let id = data.id.ok_or("缺少ID")?;

    if let Some(expense) = list.iter_mut().find(|e| e.id == id) {
        expense.amount = data.amount;
        expense.category_l1 = data.category_l1;
        expense.category_l2 = data.category_l2;
        expense.date = data.date;
        expense.note = data.note.unwrap_or_default();
        expense.updated_at = now_str();
        save_data(&state.data_path, &list);
        Ok(())
    } else {
        Err("记录不存在".to_string())
    }
}

#[tauri::command]
fn delete_expense(state: tauri::State<AppState>, id: u64) -> Result<(), String> {
    let mut list = state.data.lock().map_err(|e| e.to_string())?;
    list.retain(|e| e.id != id);
    save_data(&state.data_path, &list);
    Ok(())
}

#[tauri::command]
fn list_expenses(state: tauri::State<AppState>, filters: Option<ExpenseFilter>) -> Result<Vec<Expense>, String> {
    let list = state.data.lock().map_err(|e| e.to_string())?;
    let filters = filters.unwrap_or_default();

    let mut result: Vec<Expense> = list.iter()
        .filter(|e| {
            if let Some(ref ym) = filters.year_month {
                if !e.date.starts_with(ym) { return false; }
            }
            if let Some(ref cat) = filters.category_l1 {
                if e.category_l1 != *cat { return false; }
            }
            if let Some(ref from) = filters.date_from {
                if e.date < *from { return false; }
            }
            if let Some(ref to) = filters.date_to {
                if e.date > *to { return false; }
            }
            true
        })
        .cloned()
        .collect();

    // 按日期 + ID 倒序排列
    result.sort_by(|a, b| b.date.cmp(&a.date).then(b.id.cmp(&a.id)));
    Ok(result)
}

#[tauri::command]
fn search_expenses(state: tauri::State<AppState>, keyword: String) -> Result<Vec<Expense>, String> {
    let list = state.data.lock().map_err(|e| e.to_string())?;
    let mut result: Vec<Expense> = list.iter()
        .filter(|e| e.note.contains(&keyword))
        .cloned()
        .collect();
    result.sort_by(|a, b| b.date.cmp(&a.date).then(b.id.cmp(&a.id)));
    Ok(result)
}

#[tauri::command]
fn get_statistics(state: tauri::State<AppState>, year_month: String) -> Result<Statistics, String> {
    let list = state.data.lock().map_err(|e| e.to_string())?;

    // 筛选当月记录
    let month_data: Vec<&Expense> = list.iter()
        .filter(|e| e.date.starts_with(&year_month))
        .collect();

    let total: f64 = month_data.iter().map(|e| e.amount).sum();
    let count = month_data.len() as i64;

    // 一级分类统计
    let mut l1_map: HashMap<String, (f64, i64)> = HashMap::new();
    for e in &month_data {
        let entry = l1_map.entry(e.category_l1.clone()).or_insert((0.0, 0));
        entry.0 += e.amount;
        entry.1 += 1;
    }

    let mut by_category: Vec<CategoryStat> = l1_map.into_iter()
        .map(|(k, (t, c))| CategoryStat { category_l1: k, total: t, count: c })
        .collect();
    by_category.sort_by(|a, b| b.total.partial_cmp(&a.total).unwrap_or(std::cmp::Ordering::Equal));

    // 二级分类统计
    let mut l2_map: HashMap<(String, String), (f64, i64)> = HashMap::new();
    for e in &month_data {
        let key = (e.category_l1.clone(), e.category_l2.clone());
        let entry = l2_map.entry(key).or_insert((0.0, 0));
        entry.0 += e.amount;
        entry.1 += 1;
    }

    let mut by_sub_category: Vec<SubCategoryStat> = l2_map.into_iter()
        .map(|((l1, l2), (t, c))| SubCategoryStat { category_l1: l1, category_l2: l2, total: t, count: c })
        .collect();
    by_sub_category.sort_by(|a, b| b.total.partial_cmp(&a.total).unwrap_or(std::cmp::Ordering::Equal));

    // 有记录的天数
    let mut days_set: std::collections::HashSet<String> = std::collections::HashSet::new();
    for e in &month_data {
        days_set.insert(e.date.clone());
    }
    let actual_days = if days_set.is_empty() { 1 } else { days_set.len() };

    Ok(Statistics {
        total,
        count,
        avg_per_day: format!("{:.2}", total / actual_days as f64),
        by_category,
        by_sub_category,
    })
}

#[tauri::command]
fn export_csv(state: tauri::State<AppState>, year_month: Option<String>) -> Result<String, String> {
    let list = state.data.lock().map_err(|e| e.to_string())?;

    let filtered: Vec<&Expense> = if let Some(ref ym) = year_month {
        list.iter().filter(|e| e.date.starts_with(ym)).collect()
    } else {
        list.iter().collect()
    };

    let mut csv = String::from("\u{feff}ID,金额(元),一级分类,二级分类,日期,备注,创建时间\n");
    for e in &filtered {
        let note = e.note.replace('"', "\"\"");
        csv.push_str(&format!(
            "{},{:.2},\"{}\",\"{}\",{},\"{}\",{}\n",
            e.id, e.amount, e.category_l1, e.category_l2, e.date, note, e.created_at
        ));
    }
    Ok(csv)
}

#[tauri::command]
fn get_months(state: tauri::State<AppState>) -> Result<Vec<String>, String> {
    let list = state.data.lock().map_err(|e| e.to_string())?;
    let mut months: std::collections::BTreeSet<String> = std::collections::BTreeSet::new();

    for e in list.iter() {
        if e.date.len() >= 7 {
            months.insert(e.date[..7].to_string());
        }
    }

    // 倒序排列
    let mut result: Vec<String> = months.into_iter().collect();
    result.reverse();
    Ok(result)
}

/// 保存CSV到下载文件夹（桌面版直接写入，无需弹窗）
#[tauri::command]
fn save_file(app_handle: tauri::AppHandle, content: String, default_name: String) -> Result<String, String> {
    use std::fs::write;

    // 获取用户下载目录
    let download_dir = dirs_next::download_dir()
        .unwrap_or_else(|| std::path::PathBuf::from("."));

    let file_path = download_dir.join(&default_name);
    write(&file_path, content).map_err(|e| e.to_string())?;
    Ok(file_path.to_string_lossy().to_string())
}

// ===== 应用入口 =====

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            // 数据文件路径（用户数据目录下）
            let app_data_dir = app.path().app_data_dir().expect("无法获取应用数据目录");
            fs::create_dir_all(&app_data_dir).expect("无法创建应用数据目录");
            let data_path = app_data_dir.join("expenses.json");

            // 加载已有数据
            let data = load_data(&data_path);
            let next_id = calc_next_id(&data);

            println!("数据文件: {:?}, 已有记录: {} 条", data_path, data.len());

            app.manage(AppState {
                data: Mutex::new(data),
                data_path,
                next_id: Mutex::new(next_id),
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            add_expense,
            update_expense,
            delete_expense,
            list_expenses,
            search_expenses,
            get_statistics,
            export_csv,
            get_months,
            save_file,
        ])
        .build(tauri::generate_context!())
        .expect("启动应用失败")
        .run(|_app_handle, _event| {});
}
