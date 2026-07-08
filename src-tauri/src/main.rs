// 预先阻止全局 Tauri API 注入，提升安全性
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    heima_jizhang_lib::run()
}
