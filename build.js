// build.js
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const obfuscator = require("javascript-obfuscator");

const root = __dirname;
const backupDir = path.join(root, `../backup_src_${new Date().toISOString().split("T")[0]}`);
const exclude = [
  "node_modules",
  "dist",
  "build",
  ".git",
  "backup_src",
  "Admin",              // 🧩 Thêm dòng này
  "package-lock.json",
  "yarn.lock"
];

// ===== Tiện ích =====
function copyRecursive(src, dest) {
  if (!fs.existsSync(src)) return;
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    if (exclude.includes(path.basename(src))) return;
    fs.mkdirSync(dest, { recursive: true });
    fs.readdirSync(src).forEach(f => copyRecursive(path.join(src, f), path.join(dest, f)));
  } else fs.copyFileSync(src, dest);
}

function backupSource() {
  fs.rmSync(backupDir, { recursive: true, force: true });
  fs.mkdirSync(backupDir, { recursive: true });
  copyRecursive(root, backupDir);
  console.log("✅ Đã backup source vào:", backupDir);
}

function obfuscate(dir = root) {
  fs.readdirSync(dir).forEach(file => {
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      if (!exclude.includes(file)) obfuscate(full);
    } else if (file.endsWith(".js") && file !== "build.js") {
      const code = fs.readFileSync(full, "utf8");
      const result = obfuscator.obfuscate(code, {
        compact: true,
        controlFlowFlattening: true,
        deadCodeInjection: true,
        stringArray: true,
        stringArrayEncoding: ["rc4"],
        stringArrayThreshold: 0.75
      });
      fs.writeFileSync(full, result.getObfuscatedCode());
      console.log("🔒 Obfuscate:", file);
    }
  });
}

function bumpVersion() {
  const pkgFile = path.join(root, "package.json");
  const pkg = JSON.parse(fs.readFileSync(pkgFile, "utf8"));
  let [major, minor, patch] = pkg.version.split(".").map(Number);
  patch++;
  pkg.version = [major, minor, patch].join(".");
  fs.writeFileSync(pkgFile, JSON.stringify(pkg, null, 2));
  console.log("📌 Tăng version:", pkg.version);
  return pkg.version;
}

function buildAndPush() {
  try {
    console.log("⚡ Đang build app...");
    execSync("npx electron-builder --win --publish always", { stdio: "inherit" });

    console.log("📦 Commit + Push lên GitHub...");
    execSync("git add .");
    execSync(`git commit -m "auto release build" || echo No changes`);
    execSync("git push");

    console.log("✅ Hoàn tất build + upload!");
  } catch (e) {
    console.error("❌ Lỗi:", e.message);
  }
}

function restore() {
  if (!fs.existsSync(backupDir)) return;
  copyRecursive(backupDir, root);
  console.log("♻️ Đã khôi phục source gốc.");
}

(function main() {
  console.log("==============================================");
  console.log("   ⚙️  Electron Auto Release Builder");
  console.log("==============================================");

  backupSource();
  obfuscate();
  bumpVersion();
  buildAndPush();
  restore();

  console.log("✨ Hoàn tất release patch!");
  console.log("==============================================");
})();
