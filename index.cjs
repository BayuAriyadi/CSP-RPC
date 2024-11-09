const { app, BrowserWindow, ipcMain, Tray, Menu } = require("electron");
const { fork } = require("child_process");
const path = require("path");

let mainWindow;
let tray;
let rpcProcess;
let Store;

// Inisialisasi `electron-store` secara dinamis
async function initializeStore() {
    const { default: ElectronStore } = await import("electron-store");
    Store = new ElectronStore();
}

// Fungsi untuk memulai proses RPC sebagai child process
function startRPCProcess() {
    rpcProcess = fork(path.join(__dirname, "rpc.cjs"));
    rpcProcess.on("error", (err) => {
        console.error("RPC process error:", err);
    });
}

// Fungsi untuk membuat jendela utama
function createWindow() {
    mainWindow = new BrowserWindow({
        width: 500,
        height: 500,
        frame: false,
        resizable: false,
        fullscreenable: false,
        icon: path.join(__dirname, "assets", "icon.png"),
        webPreferences: {
            preload: path.join(__dirname, "renderer.js"),
            contextIsolation: false,
            enableRemoteModule: false,
            nodeIntegration: true,
        },
    });
    mainWindow.loadFile("index.html");

    mainWindow.on("minimize", (event) => {
        event.preventDefault();
        mainWindow.hide();
    });

    mainWindow.on("close", (event) => {
        if (!app.isQuiting) {
            event.preventDefault();
            mainWindow.hide();
        }
    });

    // Muat status terakhir dan kirim ke renderer process
    const lastDetails = Store.get("details") || "🎨 Sedang Memasak..";
    const lastState = Store.get("state") || "Twitter : @Fuujinnn_";
    mainWindow.webContents.on("did-finish-load", () => {
        mainWindow.webContents.send("load-status", { details: lastDetails, state: lastState });
    });
}

// Fungsi untuk membuat tray icon
function createTray() {
    tray = new Tray(path.join(__dirname, "assets", "tray-icon.png")); // Path ikon
    const contextMenu = Menu.buildFromTemplate([
        { label: "Show App", click: () => mainWindow.show() },
        { label: "Quit", click: () => {
            app.isQuiting = true;
            app.quit();
        }},
    ]);
    tray.setToolTip("Discord Rich Presence Configurator");
    tray.setContextMenu(contextMenu);

    tray.on("click", () => {
        mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show();
    });
}

// Mengatur Auto Start saat login di Windows
function setAutoStart() {
    app.setLoginItemSettings({
        openAtLogin: true,
        path: process.execPath,
    });
}

app.whenReady().then(async () => {
    // Inisialisasi electron-store dan atur status penggunaan pertama kali
    await initializeStore();
    const isFirstUse = !Store.get("hasRunBefore");

    if (isFirstUse) {
        Store.set("hasRunBefore", true); // Tandai bahwa aplikasi telah digunakan
        createWindow();
        mainWindow.show(); // Tampilkan jendela pada penggunaan pertama kali
    } else {
        createWindow();
        mainWindow.hide(); // Sembunyikan jendela dan mulai di system tray
    }

    createTray();
    startRPCProcess(); // Mulai proses RPC
    setAutoStart(); // Set aplikasi untuk auto start pada login

    app.on("activate", () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
});

// Menerima pesan dari renderer process untuk memperbarui aktivitas Discord dan menyimpan data
ipcMain.on("update-discord-activity", (event, { details, state }) => {
    if (rpcProcess) {
        // Simpan status details dan state ke electron-store
        Store.set("details", details);
        Store.set("state", state);

        // Kirim data ke child process
        rpcProcess.send({ details, state });
    } else {
        console.error("RPC process is not initialized");
    }
});

// Mengatur minimize, close, dan maximize
ipcMain.on("window-control", (event, action) => {
    if (action === "minimize" && mainWindow) {
        mainWindow.minimize();
    } else if (action === "close" && mainWindow) {
        app.isQuiting = true;
        mainWindow.close();
    } else if (action === "maximize" && mainWindow) {
        if (mainWindow.isMaximized()) {
            mainWindow.unmaximize();
        } else {
            mainWindow.maximize();
        }
    }
});
