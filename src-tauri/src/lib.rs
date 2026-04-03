use std::process::Command;
use std::sync::{Arc, Mutex};
use tauri::Manager;

struct ServerProcess(Arc<Mutex<Option<std::process::Child>>>);

#[tauri::command]
fn get_server_status(state: tauri::State<ServerProcess>) -> bool {
    let guard = state.0.lock().unwrap();
    guard.is_some()
}

#[tauri::command]
async fn check_worker(url: String) -> bool {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(3))
        .build()
        .unwrap_or_default();
    match client.get(&url).send().await {
        Ok(res) => {
            if let Ok(data) = res.json::<serde_json::Value>().await {
                let models = data.get("registeredModels")
                    .and_then(|v| v.as_array())
                    .map(|a| a.len())
                    .unwrap_or(0);
                return models > 0;
            }
            false
        }
        Err(_) => false,
    }
}

#[tauri::command]
async fn fetch_text(url: String) -> Result<String, String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(3))
        .build()
        .map_err(|e| e.to_string())?;
    let res = client.get(&url).send().await.map_err(|e| e.to_string())?;
    let text = res.text().await.map_err(|e| e.to_string())?;
    Ok(text)
}

#[tauri::command]
async fn generate_image_request(url: String, body: String) -> Result<String, String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(240))
        .build()
        .map_err(|e| e.to_string())?;
    let res = client
        .post(&url)
        .header("Content-Type", "application/json")
        .body(body)
        .send()
        .await
        .map_err(|e| e.to_string())?;
    let text = res.text().await.map_err(|e| e.to_string())?;
    Ok(text)
}

#[tauri::command]
async fn download_image(url: String, filename: String, save_dir: Option<String>) -> Result<String, String> {
    println!("[AI Studio] Downloading image from: {}", url);
    println!("[AI Studio] Save directory: {:?}", save_dir);

    let client = reqwest::Client::builder()
        .user_agent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
        .build()
        .map_err(|e| e.to_string())?;

    let response = client.get(&url).send().await.map_err(|e| {
        let err = format!("Failed to send request: {}", e);
        eprintln!("[AI Studio] {}", err);
        err
    })?;

    if !response.status().is_success() {
        let err = format!("Server returned status: {}", response.status());
        eprintln!("[AI Studio] {}", err);
        return Err(err);
    }

    let bytes = response.bytes().await.map_err(|e| {
        let err = format!("Failed to read bytes: {}", e);
        eprintln!("[AI Studio] {}", err);
        err
    })?;

    let download_path = if let Some(dir) = save_dir {
        if dir.is_empty() {
            get_default_download_dir()?
        } else {
            std::path::PathBuf::from(dir)
        }
    } else {
        get_default_download_dir()?
    };

    println!("[AI Studio] Final download path: {:?}", download_path);

    // Ensure directory exists
    if !download_path.exists() {
        std::fs::create_dir_all(&download_path).map_err(|e| {
            let err = format!("Failed to create directory: {}", e);
            eprintln!("[AI Studio] {}", err);
            err
        })?;
    }

    let file_path = download_path.join(filename);
    std::fs::write(&file_path, bytes).map_err(|e| {
        let err = format!("Failed to write file: {}", e);
        eprintln!("[AI Studio] {}", err);
        err
    })?;

    println!("[AI Studio] Download successful: {:?}", file_path);
    Ok(file_path.to_string_lossy().to_string())
}

#[tauri::command]
async fn save_history_image(app: tauri::AppHandle, url: String, id: String, save_dir: Option<String>) -> Result<String, String> {
    println!("[AI Studio] Saving history image: {} ({}) to {:?}", id, url, save_dir);
    
    let client = reqwest::Client::builder()
        .user_agent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
        .build()
        .map_err(|e| e.to_string())?;

    let response = client.get(&url).send().await.map_err(|e| e.to_string())?;
    let bytes = response.bytes().await.map_err(|e| e.to_string())?;

    let history_dir = if let Some(dir) = save_dir {
        if dir.is_empty() {
            let data_dir = app.path().app_local_data_dir().map_err(|e: tauri::Error| e.to_string())?;
            data_dir.join("history")
        } else {
            std::path::PathBuf::from(dir)
        }
    } else {
        let data_dir = app.path().app_local_data_dir().map_err(|e: tauri::Error| e.to_string())?;
        data_dir.join("history")
    };

    if !history_dir.exists() {
        std::fs::create_dir_all(&history_dir).map_err(|e| e.to_string())?;
    }

    let file_path = history_dir.join(format!("{}.png", id));
    std::fs::write(&file_path, bytes).map_err(|e| e.to_string())?;

    Ok(file_path.to_string_lossy().to_string())
}

#[tauri::command]
fn delete_file(path: String) -> Result<(), String> {
    let p = std::path::Path::new(&path);
    if p.exists() {
        std::fs::remove_file(p).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
fn clear_history_images(app: tauri::AppHandle, save_dir: Option<String>) -> Result<(), String> {
    let history_dir = if let Some(dir) = save_dir {
        if dir.is_empty() {
            let data_dir = app.path().app_local_data_dir().map_err(|e: tauri::Error| e.to_string())?;
            data_dir.join("history")
        } else {
            std::path::PathBuf::from(dir)
        }
    } else {
        let data_dir = app.path().app_local_data_dir().map_err(|e: tauri::Error| e.to_string())?;
        data_dir.join("history")
    };

    if history_dir.exists() {
        std::fs::remove_dir_all(&history_dir).map_err(|e| e.to_string())?;
        std::fs::create_dir_all(&history_dir).map_err(|e| e.to_string())?;
    }
    Ok(())
}

fn get_default_download_dir() -> Result<std::path::PathBuf, String> {
    #[cfg(target_os = "macos")]
    {
        let home = std::env::var("HOME").map_err(|_| "Could not find HOME directory".to_string())?;
        Ok(std::path::PathBuf::from(home).join("Downloads"))
    }
    #[cfg(target_os = "windows")]
    {
        let home = std::env::var("USERPROFILE").map_err(|_| "Could not find USERPROFILE directory".to_string())?;
        Ok(std::path::PathBuf::from(home).join("Downloads"))
    }
    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    {
        std::env::current_dir().map_err(|e| e.to_string())
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Find node executable
    let node_path = which_node();
    let server_dir = find_server_dir();

    println!("[AI Studio] node_path = {:?}", node_path);
    println!("[AI Studio] server_dir = {:?}", server_dir);

    // If port 8081 is already in use, skip starting the server
    let port_in_use = std::net::TcpStream::connect("127.0.0.1:8081").is_ok();

    let child = if port_in_use {
        println!("[AI Studio] Port 8081 already in use, skipping server start");
        None
    } else if let (Some(node), Some(dir)) = (node_path, server_dir) {
        let dir_path = std::path::PathBuf::from(&dir);
        let script_path = dir_path.join("src").join("app.js");
        println!("[AI Studio] Starting server: {} {:?}", node, script_path);
        match Command::new(&node)
            .arg(&script_path)
            .current_dir(&dir_path)
            .env("PORT", "8081")
            .spawn()
        {
            Ok(c) => {
                println!("[AI Studio] Express server started (pid: {})", c.id());
                Some(c)
            }
            Err(e) => {
                eprintln!("[AI Studio] Failed to start server: {}", e);
                None
            }
        }
    } else {
        eprintln!("[AI Studio] Node.js or server directory not found, server will not start");
        None
    };

    let server_state = ServerProcess(Arc::new(Mutex::new(child)));
    let state_clone = server_state.0.clone();

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_http::init())
        .manage(server_state)
        .invoke_handler(tauri::generate_handler![
            get_server_status, 
            check_worker, 
            fetch_text,
            generate_image_request, 
            download_image,
            save_history_image,
            delete_file,
            clear_history_images
        ])
        .on_window_event(move |_window, event| {
            if let tauri::WindowEvent::Destroyed = event {
                let mut guard = state_clone.lock().unwrap();
                if let Some(mut child) = guard.take() {
                    let _ = child.kill();
                    println!("[AI Studio] Express server stopped");
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

/// Find node executable — covers macOS (Homebrew + nvm), Windows, and PATH fallback
fn which_node() -> Option<String> {
    // macOS: common Homebrew / nvm / system paths
    #[cfg(target_os = "macos")]
    let candidates = vec![
        "/opt/homebrew/bin/node".to_string(),          // Homebrew Apple Silicon
        "/usr/local/bin/node".to_string(),              // Homebrew Intel
        "/usr/local/opt/node@22/bin/node".to_string(),  // Homebrew pinned
        "/usr/local/opt/node@20/bin/node".to_string(),
        "/usr/local/opt/node@18/bin/node".to_string(),
        // nvm default locations
        format!("{}/.nvm/versions/node/v22.0.0/bin/node", std::env::var("HOME").unwrap_or_default()),
        "node".to_string(),
    ];

    #[cfg(target_os = "windows")]
    let candidates = vec![
        r"C:\Program Files\nodejs\node.exe".to_string(),
        r"C:\Program Files (x86)\nodejs\node.exe".to_string(),
        "node.exe".to_string(),
        "node".to_string(),
    ];

    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    let candidates = vec![
        "/usr/local/bin/node".to_string(),
        "/usr/bin/node".to_string(),
        "node".to_string(),
    ];

    for candidate in &candidates {
        // For bare "node" / "node.exe", try to resolve via PATH using `which`/`where`
        if candidate == "node" || candidate == "node.exe" {
            #[cfg(target_os = "windows")]
            let check = Command::new("where").arg("node").output();
            #[cfg(not(target_os = "windows"))]
            let check = Command::new("which").arg("node").output();

            if let Ok(out) = check {
                if out.status.success() {
                    let path = String::from_utf8_lossy(&out.stdout).trim().lines().next()
                        .unwrap_or("").to_string();
                    if !path.is_empty() {
                        println!("[AI Studio] Found node via PATH: {}", path);
                        return Some(path);
                    }
                }
            }
        } else if std::path::Path::new(candidate).exists() {
            println!("[AI Studio] Found node at: {}", candidate);
            return Some(candidate.clone());
        }
    }

    // Last resort: nvm — scan ~/.nvm/versions/node/*/bin/node
    #[cfg(target_os = "macos")]
    if let Ok(home) = std::env::var("HOME") {
        let nvm_dir = std::path::PathBuf::from(&home).join(".nvm/versions/node");
        if nvm_dir.exists() {
            if let Ok(mut entries) = std::fs::read_dir(&nvm_dir) {
                // Collect and sort descending to prefer latest version
                let mut versions: Vec<_> = entries
                    .flatten()
                    .filter(|e| e.path().is_dir())
                    .collect();
                versions.sort_by(|a, b| b.file_name().cmp(&a.file_name()));
                for entry in versions {
                    let node_bin = entry.path().join("bin/node");
                    if node_bin.exists() {
                        println!("[AI Studio] Found node via nvm: {:?}", node_bin);
                        return Some(node_bin.to_string_lossy().to_string());
                    }
                }
            }
        }
    }

    None
}

/// Find the bundled server directory — robust across macOS app bundle, Windows installer, and dev mode
fn find_server_dir() -> Option<String> {
    let exe = std::env::current_exe().ok()?;
    let exe_dir = exe.parent()?;

    let mut candidates: Vec<std::path::PathBuf> = Vec::new();

    // macOS app bundle: <app>/Contents/MacOS/../Resources/server
    //   exe_dir = .../doubao-assistant.app/Contents/MacOS
    #[cfg(target_os = "macos")]
    {
        if let Some(macos_dir) = exe_dir.parent() {           // Contents/
            candidates.push(macos_dir.join("Resources/server"));
        }
        // Also try two levels up (universal binary may nest differently)
        if let Some(contents) = exe_dir.parent() {
            if let Some(app) = contents.parent() {
                candidates.push(app.join("Contents/Resources/server"));
            }
        }
    }

    // Windows NSIS/MSI installer: server is next to the .exe
    #[cfg(target_os = "windows")]
    {
        candidates.push(exe_dir.join("server"));
        candidates.push(exe_dir.join("resources/server"));
        candidates.push(exe_dir.join("../server"));
    }

    // Generic: relative to executable
    candidates.push(exe_dir.join("server"));
    candidates.push(exe_dir.join("../Resources/server"));
    candidates.push(exe_dir.join("../../server"));

    // Dev mode fallback
    if let Ok(cwd) = std::env::current_dir() {
        candidates.push(cwd.join("server"));
        candidates.push(cwd.join("../server"));
    }

    for path in &candidates {
        // Canonicalize resolves ".." and symlinks
        let resolved = path.canonicalize().unwrap_or_else(|_| path.clone());
        let check = resolved.join("src/app.js");
        println!("[AI Studio] Checking server path: {:?} => exists={}", check, check.exists());
        if check.exists() {
            return Some(resolved.to_string_lossy().to_string());
        }
    }

    None
}
