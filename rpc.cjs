const RPC = require("discord-rpc");
const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");

const client = new RPC.Client({ transport: "ipc" });
const client_id = "882530321948635196";
RPC.register(client_id);

let isCspRunning = false;
let updateInterval;

// File path untuk menyimpan data
const dataFilePath = path.join(__dirname, "rpcData.json");

// Fungsi untuk menyimpan `details` dan `state` ke file JSON
function saveData(details, state) {
    const data = { details, state };
    fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2));
    console.log("Data saved:", data);
}

// Fungsi untuk memuat `details` dan `state` dari file JSON
function loadData() {
    if (fs.existsSync(dataFilePath)) {
        const data = JSON.parse(fs.readFileSync(dataFilePath));
        console.log("Data loaded:", data);
        return { details: data.details, state: data.state };
    }
    return { details: "🎨 Sedang Memasak..", state: "Twitter : @Fuujinnn_" };
}

// Ambil nilai `details` dan `state` dari file JSON atau gunakan default
let { details: currentDetails, state: currentState } = loadData();

// Fungsi untuk mengatur aktivitas Discord
function setActivity(details = currentDetails, state = currentState) {
    if (isCspRunning) {
        console.log("Setting Discord activity:", details, state);
        client.setActivity({
            details,
            state,
            startTimestamp: Date.now(),
            largeImageKey: "large_logo",
            largeImageText: "Clip Studio Paint",
            buttons: [
                { label: "Twitter", url: "https://twitter.com/Fuujinnn_" },
            ],
            instance: true,
        }).then(() => console.log("Activity updated:", details, state)).catch((error) => console.error("Activity update error:", error));
    } else {
        console.log("CSP is not running. Skipping setActivity.");
    }
}

// Fungsi untuk menghapus aktivitas Discord dengan pasti
async function forceClearActivity() {
    try {
        await client.clearActivity();
        console.log("RPC activity cleared successfully");
    } catch (error) {
        console.error("Failed to clear RPC activity:", error);
        setTimeout(forceClearActivity, 1000); // Coba lagi setelah 1 detik
    }
}

// Fungsi untuk memeriksa proses CSP secara berkala sebagai alternatif
function checkCspProcess() {
    exec("tasklist", (err, stdout) => {
        if (stdout.includes("CLIPStudioPaint.exe")) {
            if (!isCspRunning) {
                console.log("CSP opened - Setting Discord activity");
                isCspRunning = true;
                setActivity();
            }
        } else {
            if (isCspRunning) {
                console.log("CSP closed - Clearing Discord activity");
                isCspRunning = false;
                forceClearActivity(); // Panggil `forceClearActivity()` untuk memastikan RPC dihapus
            }
        }
    });
}

// Inisialisasi client Discord RPC
client.on("ready", async () => {
    console.log("Discord client ready");

    try {
        const { subscribe } = await import("wql-process-monitor");

        const monitor = await subscribe({
            creation: true,
            deletion: true,
            bin: {
                filter: ["CLIPStudioPaint.exe"],
                whitelist: true,
            },
        });

        // Ketika CSP dibuka
        monitor.on("creation", () => {
            console.log("CSP opened - Setting Discord activity via monitor");
            isCspRunning = true;
            setActivity();

            if (updateInterval) clearInterval(updateInterval);
        });

        // Ketika CSP ditutup
        monitor.on("deletion", () => {
            console.log("CSP closed - Clearing Discord activity via monitor");
            isCspRunning = false;
            forceClearActivity();

            if (!updateInterval) updateInterval = setInterval(checkCspProcess, 5000);
        });
    } catch (error) {
        console.error("wql-process-monitor failed, using interval check instead:", error);

        // Jika `wql-process-monitor` gagal, gunakan interval untuk mengecek proses
        updateInterval = setInterval(checkCspProcess, 5000);
    }
});

// Menerima pesan dari proses utama untuk memperbarui aktivitas dan menyimpan data
process.on("message", (data) => {
    const { details, state } = data;
    currentDetails = details || currentDetails;
    currentState = state || currentState;

    // Simpan `details` dan `state` ke file JSON
    saveData(currentDetails, currentState);

    // Update aktivitas dengan nilai terbaru hanya jika CSP berjalan
    setActivity(currentDetails, currentState);
});

// Login ke Discord RPC
client.login({ clientId: client_id })
    .then(() => console.log("Logged in to Discord"))
    .catch(console.error);
