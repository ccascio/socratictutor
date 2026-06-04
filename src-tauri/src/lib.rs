use tauri::{
    menu::{AboutMetadata, Menu, MenuItem, PredefinedMenuItem, Submenu},
    AppHandle, Manager, Wry,
};

#[cfg(not(debug_assertions))]
use std::{
    net::TcpStream,
    process::{Child, Command},
    sync::Mutex,
    time::{Duration, Instant},
};

#[cfg_attr(debug_assertions, allow(dead_code))]
const PORT: u16 = 41235;

const MENU_SETTINGS: &str = "open-settings";
const MENU_HOME: &str = "go-home";
const MENU_GOALS: &str = "go-goals";
const MENU_SESSIONS: &str = "go-sessions";
const MENU_REVIEW: &str = "go-review";
const MENU_PROFILE: &str = "go-profile";
const MENU_ZOOM_IN: &str = "zoom-in";
const MENU_ZOOM_OUT: &str = "zoom-out";
const MENU_ZOOM_RESET: &str = "zoom-reset";

#[cfg(not(debug_assertions))]
struct ServerProcess(Mutex<Option<Child>>);

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default();

    #[cfg(not(debug_assertions))]
    let builder = builder.manage(ServerProcess(Mutex::new(None)));

    builder
        .setup(|app| {
            app.set_menu(build_menu(app.handle())?)?;

            #[cfg(not(debug_assertions))]
            {
                let data_dir = app
                    .path()
                    .app_data_dir()
                    .expect("failed to resolve app data dir");
                std::fs::create_dir_all(&data_dir).ok();

                let resource_dir = app
                    .path()
                    .resource_dir()
                    .expect("failed to resolve resource dir");

                let node_bin = resource_dir.join("binaries").join(node_binary_name());
                let server_js = resource_dir.join("standalone").join("server.js");
                let standalone_dir = resource_dir.join("standalone");

                let mut cmd = Command::new(&node_bin);
                cmd.arg(&server_js)
                    .current_dir(&standalone_dir)
                    .env("PORT", PORT.to_string())
                    .env("HOSTNAME", "127.0.0.1")
                    .env("NODE_ENV", "production")
                    .env("SOCRATIC_DATA_DIR", &data_dir);

                // Restore persisted env vars (e.g., OPENAI_API_KEY) from data dir
                if let Ok(content) = std::fs::read_to_string(data_dir.join(".env")) {
                    for line in content.lines() {
                        let line = line.trim();
                        if line.is_empty() || line.starts_with('#') {
                            continue;
                        }
                        if let Some((k, v)) = line.split_once('=') {
                            let v = v.trim_matches('"');
                            cmd.env(k.trim(), v);
                        }
                    }
                }

                let child = cmd.spawn().expect("failed to start Next.js server");

                *app.state::<ServerProcess>().0.lock().unwrap() = Some(child);

                wait_for_server(PORT, Duration::from_secs(30))
                    .expect("Next.js server did not become ready");

                let url = format!("http://127.0.0.1:{}", PORT)
                    .parse::<tauri::Url>()
                    .unwrap();
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.navigate(url);
                }
            }

            Ok(())
        })
        .on_menu_event(|app, event| match event.id().as_ref() {
            MENU_SETTINGS => navigate(app, "/settings"),
            MENU_HOME => navigate(app, "/"),
            MENU_GOALS => navigate(app, "/goal"),
            MENU_SESSIONS => navigate(app, "/session"),
            MENU_REVIEW => navigate(app, "/review"),
            MENU_PROFILE => navigate(app, "/profile"),
            MENU_ZOOM_IN => eval_main_window(
                app,
                "document.body.style.zoom = String((Number(document.body.style.zoom || 1) + 0.1).toFixed(2));",
            ),
            MENU_ZOOM_OUT => eval_main_window(
                app,
                "document.body.style.zoom = String(Math.max(0.5, Number(document.body.style.zoom || 1) - 0.1).toFixed(2));",
            ),
            MENU_ZOOM_RESET => eval_main_window(app, "document.body.style.zoom = '1';"),
            _ => {}
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::Destroyed = event {
                kill_server(window.app_handle());
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running SocraticTutor");
}

fn build_menu(app: &AppHandle) -> tauri::Result<Menu<Wry>> {
    let about = PredefinedMenuItem::about(
        app,
        Some("About SocraticTutor"),
        Some(AboutMetadata {
            name: Some("SocraticTutor".to_string()),
            version: Some(env!("CARGO_PKG_VERSION").to_string()),
            copyright: Some("Copyright SocraticTutor".to_string()),
            ..Default::default()
        }),
    )?;
    let settings = MenuItem::with_id(
        app,
        MENU_SETTINGS,
        "Settings...",
        true,
        Some("CmdOrCtrl+,"),
    )?;

    let app_menu = Submenu::with_items(
        app,
        "SocraticTutor",
        true,
        &[
            &about,
            &PredefinedMenuItem::separator(app)?,
            &settings,
            &PredefinedMenuItem::separator(app)?,
            &PredefinedMenuItem::services(app, None)?,
            &PredefinedMenuItem::separator(app)?,
            &PredefinedMenuItem::hide(app, None)?,
            &PredefinedMenuItem::hide_others(app, None)?,
            &PredefinedMenuItem::show_all(app, None)?,
            &PredefinedMenuItem::separator(app)?,
            &PredefinedMenuItem::quit(app, None)?,
        ],
    )?;

    let edit_menu = Submenu::with_items(
        app,
        "Edit",
        true,
        &[
            &PredefinedMenuItem::undo(app, None)?,
            &PredefinedMenuItem::redo(app, None)?,
            &PredefinedMenuItem::separator(app)?,
            &PredefinedMenuItem::cut(app, None)?,
            &PredefinedMenuItem::copy(app, None)?,
            &PredefinedMenuItem::paste(app, None)?,
            &PredefinedMenuItem::select_all(app, None)?,
        ],
    )?;

    let nav_menu = Submenu::with_items(
        app,
        "Navigate",
        true,
        &[
            &MenuItem::with_id(app, MENU_HOME, "Home", true, Some("CmdOrCtrl+1"))?,
            &MenuItem::with_id(app, MENU_GOALS, "Learning Goals", true, Some("CmdOrCtrl+2"))?,
            &MenuItem::with_id(
                app,
                MENU_SESSIONS,
                "Sessions",
                true,
                Some("CmdOrCtrl+3"),
            )?,
            &MenuItem::with_id(app, MENU_REVIEW, "Review", true, Some("CmdOrCtrl+4"))?,
            &PredefinedMenuItem::separator(app)?,
            &MenuItem::with_id(app, MENU_PROFILE, "Profile", true, Some("CmdOrCtrl+5"))?,
        ],
    )?;

    let view_menu = Submenu::with_items(
        app,
        "View",
        true,
        &[
            &MenuItem::with_id(app, MENU_ZOOM_IN, "Zoom In", true, Some("CmdOrCtrl+="))?,
            &MenuItem::with_id(app, MENU_ZOOM_OUT, "Zoom Out", true, Some("CmdOrCtrl+-"))?,
            &MenuItem::with_id(
                app,
                MENU_ZOOM_RESET,
                "Actual Size",
                true,
                Some("CmdOrCtrl+0"),
            )?,
            &PredefinedMenuItem::separator(app)?,
            &PredefinedMenuItem::fullscreen(app, None)?,
        ],
    )?;

    let window_menu = Submenu::with_id_and_items(
        app,
        tauri::menu::WINDOW_SUBMENU_ID,
        "Window",
        true,
        &[
            &PredefinedMenuItem::minimize(app, None)?,
            &PredefinedMenuItem::maximize(app, None)?,
        ],
    )?;

    let help_menu = Submenu::with_id_and_items(
        app,
        tauri::menu::HELP_SUBMENU_ID,
        "Help",
        true,
        &[],
    )?;

    Menu::with_items(
        app,
        &[
            &app_menu,
            &edit_menu,
            &nav_menu,
            &view_menu,
            &window_menu,
            &help_menu,
        ],
    )
}

fn main_window(app: &AppHandle) -> Option<tauri::WebviewWindow> {
    app.get_webview_window("main")
}

fn eval_main_window(app: &AppHandle, script: &str) {
    if let Some(window) = main_window(app) {
        let _ = window.eval(script);
        let _ = window.set_focus();
    }
}

fn navigate(app: &AppHandle, path: &str) {
    eval_main_window(
        app,
        &format!(
            "window.history.pushState(null, '', '{}'); window.dispatchEvent(new PopStateEvent('popstate'));",
            path
        ),
    );
}

fn kill_server(_app: &AppHandle) {
    #[cfg(not(debug_assertions))]
    if let Some(mut child) = _app.state::<ServerProcess>().0.lock().unwrap().take() {
        let _ = child.kill();
    }
}

#[cfg(not(debug_assertions))]
fn node_binary_name() -> &'static str {
    #[cfg(target_arch = "aarch64")]
    return "node-aarch64-apple-darwin";
    #[cfg(target_arch = "x86_64")]
    return "node-x86_64-apple-darwin";
    #[cfg(not(any(target_arch = "aarch64", target_arch = "x86_64")))]
    compile_error!("unsupported architecture for SocraticTutor desktop");
}

#[cfg(not(debug_assertions))]
fn wait_for_server(port: u16, timeout: Duration) -> Result<(), String> {
    let start = Instant::now();
    loop {
        if TcpStream::connect(format!("127.0.0.1:{}", port)).is_ok() {
            return Ok(());
        }
        if start.elapsed() > timeout {
            return Err(format!(
                "server on port {} did not start within {:?}",
                port, timeout
            ));
        }
        std::thread::sleep(Duration::from_millis(200));
    }
}
