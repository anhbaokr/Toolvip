// preload.js - ĐÃ SỬA VÀ BỔ SUNG QUÊN MẬT KHẨU
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  // User management
  listUsers: () => ipcRenderer.invoke("listUsers"),
  updateLicense: (payload) => ipcRenderer.invoke("updateLicense", payload),
  saveClientJson: (payload) => ipcRenderer.invoke("saveClientJson", payload),
  exportUsers: () => ipcRenderer.invoke("export-users"),
  
  // Auth functions
  login: (payload) => ipcRenderer.invoke("login", payload),
  register: (payload) => ipcRenderer.invoke("register", payload),
  verifyKey: (payload) => ipcRenderer.invoke("verifyKey", payload),
  
  // ========== THÊM MỚI: QUÊN MẬT KHẨU ==========
  forgotPassword: (payload) => ipcRenderer.invoke("forgotPassword", payload),
  resetPassword: (payload) => ipcRenderer.invoke("resetPassword", payload),
  
  // System info
  getMachineId: () => ipcRenderer.invoke("get-machine-id"),

  // Security functions
  verifySignature: (token, signature) =>
    ipcRenderer.invoke("verify-signature", token, signature),

  // App information
  getAppInfo: () => ipcRenderer.invoke("get-app-info"),

  // Event listeners
  on: (channel, callback) => ipcRenderer.on(channel, callback),
  off: (channel, callback) => ipcRenderer.removeListener(channel, callback),
});

console.log("🔒 Preload script loaded successfully");