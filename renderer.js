const { ipcRenderer, shell  } = require("electron");

const githubLink = document.getElementById("githubLink");



// Fungsi untuk memperbarui aktivitas Discord
document.getElementById("updateBtn").addEventListener("click", () => {
    const details = document.getElementById("details").value;
    const state = document.getElementById("state").value;
    ipcRenderer.send("update-discord-activity", { details, state });
});

githubLink.addEventListener("click", (event) => {
    event.preventDefault(); // Mencegah link terbuka di dalam aplikasi
    shell.openExternal("https://github.com/BayuAriyadi"); // Ganti dengan URL GitHub Anda
});

// Tombol Minimize, Close, dan Maximize
document.getElementById("minimizeBtn").addEventListener("click", () => {
    ipcRenderer.send("window-control", "minimize");
});

document.getElementById("closeBtn").addEventListener("click", () => {
    ipcRenderer.send("window-control", "close");
});

document.getElementById("maximizeBtn").addEventListener("click", () => {
    ipcRenderer.send("window-control", "maximize");
});

// Fungsi untuk mendeteksi dan mengatur tema
function applyTheme() {
    if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
        document.body.classList.add("dark");
    } else {
        document.body.classList.remove("dark");
    }
}

// Listener untuk perubahan tema sistem
window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", applyTheme);

// Panggil fungsi `applyTheme` saat aplikasi pertama kali dijalankan
applyTheme();
