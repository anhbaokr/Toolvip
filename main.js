// main.js - phiên bản đã tối ưu và sửa lỗi khởi chạy
const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const { machineIdSync } = require("node-machine-id");
const fetch = require("node-fetch");
const crypto = require("crypto");
const fs = require("fs");

// Google Apps Script API URL
const SHEET_API = "https://script.google.com/macros/s/AKfycbw-DCk41TED43ITI8dYFUvXDZloweK_L-zr4_uZ-pin4LJmw1K4yno0upKg0rHIyIb1/exec";

// Load public key for signature verification
const PUBLIC_KEY_PATH = path.join(__dirname, "ed25519_public.pem");
let PUBLIC_KEY_PEM = null;

try {
  if (fs.existsSync(PUBLIC_KEY_PATH)) {
    PUBLIC_KEY_PEM = fs.readFileSync(PUBLIC_KEY_PATH, "utf8");
    console.log("🔑 Public key loaded successfully");
  } else {
    console.error("❌ Public key file not found:", PUBLIC_KEY_PATH);
  }
} catch (error) {
  console.error("❌ Failed to load public key:", error);
}

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    minWidth: 1000,
    minHeight: 700,
    show: false,
    icon: path.join(__dirname, 'assets', 'icon.png'),
    title: "SecureAuth Pro - Hệ thống xác thực bảo mật",
    webPreferences: {
      preload: fs.existsSync(path.join(__dirname, "preload.js"))
        ? path.join(__dirname, "preload.js")
        : undefined,
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true
    }
  });

  mainWindow.loadFile("index.html").catch(err => {
    console.error("❌ Không thể load index.html:", err);
  });

  // Hiển thị sau khi sẵn sàng
  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
    mainWindow.focus();
  });

  // Tắt menu
  mainWindow.removeMenu();

  // Bảo mật: chặn mở cửa sổ mới
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: "deny" }));

  mainWindow.on("closed", () => (mainWindow = null));
}

// ===== App Lifecycle =====
app.whenReady().then(() => {
  console.log("🚀 Starting SecureAuth Pro...");
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

// ===== IPC HANDLERS =====

// Get machine ID
ipcMain.handle("get-machine-id", async () => {
  try {
    const id = machineIdSync();
    console.log("🖥️ Machine ID:", id.substring(0, 8) + "...");
    return id;
  } catch (error) {
    console.error("❌ Machine ID error:", error);
    return "unknown-machine-id";
  }
});

// Login
ipcMain.handle("login", async (_event, payload) => {
  console.log("📥 Login request:", payload.user);
  try {
    const response = await fetch(SHEET_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "login", ...payload })
    });

    const result = await response.json();
    return result.success
      ? {
          success: true,
          message: result.message,
          mid: result.mid,
          exp: result.exp,
          blocked: result.blocked,
          token: result.token,
          signature: result.signature
        }
      : { success: false, message: result.message || "Đăng nhập thất bại" };
  } catch (err) {
    console.error("❌ Login error:", err);
    return { success: false, message: "Lỗi kết nối: " + err.message };
  }
});

// Register
ipcMain.handle("register", async (_event, payload) => {
  console.log("📥 Register request:", payload.user);
  try {
    const response = await fetch(SHEET_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "register", ...payload })
    });
    const result = await response.json();
    return result;
  } catch (err) {
    console.error("❌ Register error:", err);
    return { success: false, message: "Lỗi kết nối: " + err.message };
  }
});

// Verify Key
ipcMain.handle("verifyKey", async (_event, payload) => {
  console.log("🔐 VerifyKey request");
  try {
    const response = await fetch(SHEET_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "verifyKey", ...payload })
    });

    const result = await response.json();
    const ok = result.success || result.status === "ok";
    return ok
      ? {
          success: true,
          user: result.user,
          exp: result.exp,
          token: result.token,
          signature: result.signature,
          blocked: result.blocked
        }
      : { success: false, message: result.message || "License không hợp lệ" };
  } catch (err) {
    console.error("❌ VerifyKey error:", err);
    return { success: false, message: "Lỗi kết nối: " + err.message };
  }
});

// Forgot Password
ipcMain.handle("forgotPassword", async (_event, payload) => {
  console.log("📥 Forgot password:", payload.email);
  try {
    const response = await fetch(SHEET_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "forgotPassword", ...payload })
    });
    return await response.json();
  } catch (err) {
    console.error("❌ ForgotPassword error:", err);
    return { success: false, message: "Lỗi kết nối: " + err.message };
  }
});

// Reset Password
ipcMain.handle("resetPassword", async (_event, payload) => {
  console.log("📥 Reset password:", payload.email);
  try {
    const response = await fetch(SHEET_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "resetPassword", ...payload })
    });
    return await response.json();
  } catch (err) {
    console.error("❌ ResetPassword error:", err);
    return { success: false, message: "Lỗi kết nối: " + err.message };
  }
});

// Verify Signature
ipcMain.handle("verify-signature", async (_event, payloadStr, signatureBase64) => {
  try {
    if (!PUBLIC_KEY_PEM) return false;

    const signature = Buffer.from(signatureBase64, "base64");
    const publicKey = crypto.createPublicKey({
      key: PUBLIC_KEY_PEM,
      format: "pem",
      type: "spki"
    });
    const valid = crypto.verify(null, Buffer.from(payloadStr), publicKey, signature);
    console.log("🔐 Signature check:", valid ? "✅" : "❌");
    return valid;
  } catch (err) {
    console.error("❌ Signature verify error:", err);
    return false;
  }
});

// App Info
ipcMain.handle("get-app-info", () => ({
  name: app.getName(),
  version: app.getVersion(),
  platform: process.platform
}));

// Security
app.on("web-contents-created", (_e, contents) => {
  contents.on("will-navigate", (e, url) => {
    if (!url.startsWith("file://")) {
      e.preventDefault();
      console.warn("[SECURITY] Blocked:", url);
    }
  });
});

process.on("uncaughtException", err => console.error("💥 Uncaught:", err));
process.on("unhandledRejection", (r, p) => console.error("💥 Unhandled:", r, p));

console.log("🔧 Main process ready");
