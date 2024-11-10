const { app, BrowserWindow, ipcMain, Tray, Menu, dialog } = require("electron");
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
    rpcProcess.on("exit", (code) => {
        console.log("RPC process exited with code:", code);
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
}

// Fungsi untuk membuat tray icon
function createTray() {
    tray = new Tray(path.join(__dirname, "assets", "tray-icon.png"));
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

// Mengatur Auto Start saat login di Windows dengan argumen `--hidden`
function setAutoStart() {
    app.setLoginItemSettings({
        openAtLogin: true,
        path: process.execPath,
        args: ["--hidden"]
    });
}

app.whenReady().then(async () => {
    await initializeStore();
    const isFirstUse = !Store.get("hasRunBefore");

    const isHidden = app.commandLine.hasSwitch("hidden");

    createTray();
    createWindow();

    if (isFirstUse) {
        Store.set("hasRunBefore", true);
        mainWindow.show();
    } else if (isHidden) {
        mainWindow.hide();
    } else {
        mainWindow.show();
    }

    startRPCProcess();
    setAutoStart();

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
        Store.set("details", details);
        Store.set("state", state);
        rpcProcess.send({ details, state });
    } else {
        console.error("RPC process is not initialized");
    }
});

// Konfirmasi sebelum menutup aplikasi dari renderer
ipcMain.handle("confirm-close", async () => {
    const choice = await dialog.showMessageBox(mainWindow, {
        type: "question",
        buttons: ["Yes", "No"],
        title: "Confirm Exit",
        message: "Are you sure you want to quit?",
        defaultId: 1,
        cancelId: 1
    });
    return choice.response === 0; // "Yes" adalah 0, "No" adalah 1
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
