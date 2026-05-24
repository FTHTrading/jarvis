// Prevents additional console window on Windows in release.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            commands::call_agent,
            commands::get_daemon_health,
            commands::open_url,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Unykorn Desktop");
}
