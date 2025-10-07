const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const obfuscator = require("javascript-obfuscator");

// === Cấu hình ===
const projectRoot = __dirname;
const backupDir = path.join(projectRoot, ".backup_src");
const exclude = ["node_modules", "dist", "build", ".git", ".backup_src", "package-lock.json", "yarn.lock"];

// === Hàm phụ trợ ===
function readJSON(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function writeJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// === 1. Backup source ===
function backupSource() {
  if (fs.existsSync(backupDir)) fs.rmSync(backupDir, { recursive: true, force: true });
  fs.mkdirSync(backupDir);

  copyRecursiveSync(projectRoot, backupDir);
  console.log("✅ Đã backup source gốc vào", backupDir);
}

function copyRecursiveSync(src, dest) {
  if (!fs.existsSync(src)) return;

  const stats = fs.statSync(src);
  if (stats.isDirectory()) {
    if (exclude.includes(path.basename(src))) return;
    fs.mkdirSync(dest, { recursive: true });
    fs.readdirSync(src).forEach((file) => {
      copyRecursiveSync(path.join(src, file), path.join(dest, file));
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

// === 2. Obfuscate code JS ===
function obfuscateCode() {
  function processDir(dir) {
    fs.readdirSync(dir).forEach((file) => {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        if (exclude.includes(file)) return;
        processDir(fullPath);
      } else if (file.endsWith(".js") && file !== "build.js") {
        const code = fs.readFileSync(fullPath, "utf8");
        const result = obfuscator.obfuscate(code, {
          compact: true,
          controlFlowFlattening: true,
          deadCodeInjection: true,
          stringArray: true,
          stringArrayEncoding: ["rc4"],
          stringArrayThreshold: 0.75
        });
        fs.writeFileSync(fullPath, result.getObfuscatedCode());
        console.log("🔒 Đã obfuscate:", fullPath);
      }
    });
  }

  processDir(projectRoot);
  console.log("✅ Đã obfuscate toàn bộ file JS");
}

// === 3. Bump version trong package.json ===
function bumpVersion() {
  const pkgFile = path.join(projectRoot, "package.json");
  const pkg = readJSON(pkgFile);

  let [major, minor, patch] = pkg.version.split(".").map(Number);
  patch++;
  pkg.version = [major, minor, patch].join(".");

  writeJSON(pkgFile, pkg);
  console.log("📌 Tăng version:", pkg.version);
  return pkg.version;
}

// === 4. Build app bằng electron-builder ===
function buildApp(args) {
  try {
    console.log("⚡ Bắt đầu build app...");
    execSync(`npx electron-builder ${args.join(" ")}`, { stdio: "inherit" });
    console.log("✅ Build hoàn tất!");
  } catch (err) {
    console.error("❌ Lỗi khi build:", err);
  }
}

// === 5. Restore source ===
function restoreSource() {
  if (!fs.existsSync(backupDir)) return;

  copyRecursiveSync(backupDir, projectRoot);
  fs.rmSync(backupDir, { recursive: true, force: true });
  console.log("♻️ Đã khôi phục source gốc sau khi build");
}

// === Thực thi ===
(function main() {
  const args = process.argv.slice(2); // ví dụ: --win --publish=never
  backupSource();
  obfuscateCode();
  bumpVersion();
  buildApp(args);
  restoreSource();
})();
