// renderer.js - PHIÊN BẢN MỚI HOÀN TOÀN VỚI HIỆU ỨNG NÚT VÀ TOAST
class AuthApp {
  constructor() {
    this.currentScreen = "welcomeScreen";
    this.licenseInterval = null;
    this.countdownInterval = null;
    this.currentUser = null;
    this.userLicenseInfo = null;
    this.resetToken = null;
    this.init();
  }

  // === PHƯƠNG THỨC MỚI CHO HIỆU ỨNG ===
  showToast(message, type = "info", duration = 5000) {
    const toastContainer = document.getElementById("toastContainer");
    if (!toastContainer) return;

    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    
    const icons = {
      success: "fas fa-check-circle",
      error: "fas fa-exclamation-circle",
      warning: "fas fa-exclamation-triangle",
      info: "fas fa-info-circle",
      loading: "fas fa-spinner fa-spin"
    };

    toast.innerHTML = `
      <i class="${icons[type] || icons.info}"></i>
      <span>${message}</span>
    `;

    toastContainer.appendChild(toast);

    // Tự động xóa toast sau duration
    if (type !== 'loading') {
      setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => {
          if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
          }
        }, 300);
      }, duration);
    }

    return toast;
  }

  removeToast(toast) {
    if (toast && toast.parentNode) {
      toast.classList.add('fade-out');
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 300);
    }
  }

  // Hàm thêm hiệu ứng loading cho nút
  setButtonLoading(button, isLoading) {
    if (!button) return;
    
    if (isLoading) {
      button.classList.add('btn-loading');
      button.disabled = true;
    } else {
      button.classList.remove('btn-loading');
      button.disabled = false;
    }
  }

  async init() {
    console.log("[SYSTEM] Đang khởi tạo ứng dụng...");
    await this.loadAppInfo();
    this.setupEventListeners();
    this.showScreen("welcomeScreen");
    this.showToast("Hệ thống đã sẵn sàng", "success");
  }

  async loadAppInfo() {
    try {
      const appInfo = await window.electronAPI.getAppInfo();
      console.log("[SYSTEM] Thông tin ứng dụng:", appInfo);
      document.getElementById("appInfo").innerHTML = `
        <i class="fas fa-desktop"></i>
        <span>${appInfo.name} v${appInfo.version} - ${this.getPlatformName(appInfo.platform)}</span>
      `;
    } catch (error) {
      console.error("Lỗi khi tải thông tin ứng dụng:", error);
      document.getElementById("appInfo").innerHTML = `
        <i class="fas fa-exclamation-triangle"></i>
        <span>Không thể tải thông tin hệ thống</span>
      `;
    }
  }

  getPlatformName(platform) {
    const platforms = { 
      win32: "Windows", 
      darwin: "macOS", 
      linux: "Linux" 
    };
    return platforms[platform] || platform;
  }

  setupEventListeners() {
    console.log("[SYSTEM] Đang thiết lập sự kiện...");
    
    // Welcome screen
    document.getElementById("getStartedBtn")?.addEventListener("click", () => {
      this.showScreen("loginForm");
      this.showToast("Chuyển đến trang đăng nhập", "info");
    });
    
    // Navigation
    document.getElementById("showRegister")?.addEventListener("click", e => { 
      e.preventDefault(); 
      this.showScreen("registerForm"); 
      this.showToast("Chuyển đến trang đăng ký", "info");
    });
    
    document.getElementById("showLogin")?.addEventListener("click", e => { 
      e.preventDefault(); 
      this.showScreen("loginForm"); 
      this.showToast("Chuyển đến trang đăng nhập", "info");
    });

    // Forgot Password Navigation
    document.getElementById("showForgotPassword")?.addEventListener("click", e => {
      e.preventDefault();
      this.showScreen("forgotPasswordScreen");
      this.showToast("Trang quên mật khẩu", "info");
    });

    document.getElementById("showLoginFromForgot")?.addEventListener("click", e => {
      e.preventDefault();
      this.showScreen("loginForm");
      this.showToast("Quay lại đăng nhập", "info");
    });

    document.getElementById("showForgotFromReset")?.addEventListener("click", e => {
      e.preventDefault();
      this.showScreen("forgotPasswordScreen");
      this.showToast("Gửi lại mã xác thực", "info");
    });
    
    document.getElementById("logoutBtn")?.addEventListener("click", () => this.handleLogout());

    // Forms
    document.getElementById("loginFormElement")?.addEventListener("submit", e => { 
      e.preventDefault(); 
      this.handleLogin(); 
    });
    
    document.getElementById("registerFormElement")?.addEventListener("submit", e => { 
      e.preventDefault(); 
      this.handleRegister(); 
    });

    // Forgot Password Forms
    document.getElementById("forgotPasswordForm")?.addEventListener("submit", e => {
      e.preventDefault();
      this.handleForgotPassword();
    });

    document.getElementById("resetPasswordForm")?.addEventListener("submit", e => {
      e.preventDefault();
      this.handleResetPassword();
    });

    // License verification
    document.getElementById("btnVerify")?.addEventListener("click", () => this.handleVerifyKey());
    document.getElementById("licenseKey")?.addEventListener("keypress", e => { 
      if (e.key === "Enter") this.handleVerifyKey(); 
    });

    // Contact admin buttons
    document.getElementById("btnContactAdmin")?.addEventListener("click", () => this.showContactModal());
    document.getElementById("contactZalo")?.addEventListener("click", () => this.contactAdminZalo());
    document.getElementById("contactClose")?.addEventListener("click", () => this.hideContactModal());

    // Back to login from license screen
    document.getElementById("btnBackToLogin")?.addEventListener("click", () => {
      this.showScreen("loginForm");
      this.showToast("Quay lại trang đăng nhập", "info");
    });

    // Modal close events
    document.querySelector(".modal-close")?.addEventListener("click", () => this.hideContactModal());
    
    // Close modal when clicking outside
    document.getElementById("contactModal")?.addEventListener("click", (e) => {
      if (e.target.id === "contactModal") {
        this.hideContactModal();
      }
    });
  }

  // ========== QUÊN MẬT KHẨU ==========
  async handleForgotPassword() {
    const email = document.getElementById("forgotEmail").value.trim();
    const submitBtn = this.getSubmitButton(document.getElementById("forgotPasswordForm"));
    
    if (!email) {
      this.showToast("❌ Vui lòng nhập email đăng ký", "error");
      return;
    }

    if (!this.isValidEmail(email)) {
      this.showToast("❌ Địa chỉ email không hợp lệ", "error");
      return;
    }

    this.setButtonLoading(submitBtn, true);
    const loadingToast = this.showToast("📧 Đang gửi yêu cầu reset mật khẩu...", "loading");

    try {
      const result = await window.electronAPI.forgotPassword({ email });
      
      if (result && result.success) {
        this.removeToast(loadingToast);
        this.showToast("✅ Đã gửi email hướng dẫn reset mật khẩu", "success");
        
        // Lưu email để sử dụng trong reset password
        this.resetEmail = email;
        
        // Chuyển đến màn hình reset password sau 2 giây
        setTimeout(() => {
          this.showScreen("resetPasswordScreen");
          this.showToast("Vui lòng kiểm tra email và nhập mã xác thực", "info");
        }, 2000);
        
      } else {
        this.removeToast(loadingToast);
        this.showToast(`❌ ${result?.message || "Email không tồn tại trong hệ thống"}`, "error");
      }
    } catch (error) {
      console.error("[FORGOT PASSWORD] Error:", error);
      this.removeToast(loadingToast);
      this.showToast("❌ Lỗi kết nối server, vui lòng thử lại", "error");
    } finally {
      this.setButtonLoading(submitBtn, false);
    }
  }

  async handleResetPassword() {
    const resetToken = document.getElementById("resetToken").value.trim();
    const newPassword = document.getElementById("newPassword").value.trim();
    const confirmPassword = document.getElementById("confirmPassword").value.trim();
    const submitBtn = this.getSubmitButton(document.getElementById("resetPasswordForm"));

    // Validation
    if (!resetToken || !newPassword || !confirmPassword) {
      this.showToast("❌ Vui lòng nhập đầy đủ thông tin", "error");
      return;
    }

    if (newPassword.length < 8) {
      this.showToast("❌ Mật khẩu phải có ít nhất 8 ký tự", "error");
      return;
    }

    if (newPassword !== confirmPassword) {
      this.showToast("❌ Mật khẩu xác nhận không khớp", "error");
      return;
    }

    this.setButtonLoading(submitBtn, true);
    const loadingToast = this.showToast("🔐 Đang đặt lại mật khẩu...", "loading");

    try {
      const result = await window.electronAPI.resetPassword({
        email: this.resetEmail,
        resetToken: resetToken,
        newPassword: newPassword
      });

      if (result && result.success) {
        this.removeToast(loadingToast);
        this.showToast("✅ Đặt lại mật khẩu thành công!", "success");
        
        // Reset form
        document.getElementById("resetToken").value = "";
        document.getElementById("newPassword").value = "";
        document.getElementById("confirmPassword").value = "";
        
        // Chuyển về màn hình đăng nhập sau 2 giây
        setTimeout(() => {
          this.showScreen("loginForm");
          this.showToast("Vui lòng đăng nhập với mật khẩu mới", "success");
        }, 2000);
        
      } else {
        this.removeToast(loadingToast);
        this.showToast(`❌ ${result?.message || "Mã xác thực không hợp lệ hoặc đã hết hạn"}`, "error");
      }
    } catch (error) {
      console.error("[RESET PASSWORD] Error:", error);
      this.removeToast(loadingToast);
      this.showToast("❌ Lỗi kết nối server, vui lòng thử lại", "error");
    } finally {
      this.setButtonLoading(submitBtn, false);
    }
  }

  // Hàm helper để lấy nút submit từ form
  getSubmitButton(form) {
    return form?.querySelector('button[type="submit"]') || form?.querySelector('.btn-primary');
  }

  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  showContactModal() {
    const modal = document.getElementById("contactModal");
    modal.style.display = "block";
    this.showToast("Đang mở thông tin liên hệ Admin", "info");
  }

  hideContactModal() {
    const modal = document.getElementById("contactModal");
    modal.style.display = "none";
  }

  contactAdminZalo() {
    const phoneNumber = "0365798789";
    const message = "Xin chào Admin, tôi cần được hỗ trợ về License Key cho tài khoản SecureAuth Pro.";
    const zaloUrl = `https://zalo.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
    
    window.open(zaloUrl, '_blank');
    this.showToast("📞 Đang mở Zalo liên hệ Admin...", "info");
    this.hideContactModal();
    
    // Auto close after 3 seconds
    setTimeout(() => {
      this.showToast("Đã mở Zalo thành công", "success");
    }, 3000);
  }

  handleLogout() {
    console.log("[SYSTEM] Đang đăng xuất...");
    
    // Clear intervals
    if (this.licenseInterval) {
      clearInterval(this.licenseInterval);
      this.licenseInterval = null;
    }
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
    
    // Reset user data
    this.currentUser = null;
    this.userLicenseInfo = null;
    this.resetToken = null;
    this.resetEmail = null;
    
    // Show logout message
    this.showToast("✅ Đã đăng xuất thành công", "success");
    
    // Clear form fields
    document.getElementById("loginUser").value = "";
    document.getElementById("loginPass").value = "";
    document.getElementById("licenseKey").value = "";
    document.getElementById("forgotEmail").value = "";
    document.getElementById("resetToken").value = "";
    document.getElementById("newPassword").value = "";
    document.getElementById("confirmPassword").value = "";
    
    // Return to login screen after delay
    setTimeout(() => {
      this.showScreen("loginForm");
    }, 1500);
  }

  showScreen(screenName) {
    console.log("[NAVIGATION] Chuyển đến màn hình:", screenName);
    
    // Ẩn tất cả màn hình
    const screens = document.querySelectorAll(".screen");
    screens.forEach(screen => {
      screen.classList.remove("active");
    });
    
    // Hiển thị màn hình đích
    const targetScreen = document.getElementById(screenName);
    if (targetScreen) {
      targetScreen.classList.add("active");
      this.currentScreen = screenName;
    }
  }

  async handleLogin() {
    const username = document.getElementById("loginUser").value.trim();
    const password = document.getElementById("loginPass").value.trim();
    const loginBtn = document.getElementById("loginBtn");
    
    // Validation
    if (!username || !password) {
      this.showToast("❌ Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu", "error");
      return;
    }

    // Thêm hiệu ứng loading
    this.setButtonLoading(loginBtn, true);
    const loadingToast = this.showToast("🔐 Đang xác thực thông tin đăng nhập...", "loading");

    try {
      // Lấy IP thực tế
      let ip = "unknown";
      try {
        const ipResponse = await fetch("https://api.ipify.org?format=json", { timeout: 5000 });
        if (ipResponse.ok) {
          const ipData = await ipResponse.json();
          ip = ipData.ip;
        }
      } catch (ipError) {
        console.warn("Không thể lấy địa chỉ IP:", ipError);
      }

      const machineId = await window.electronAPI.getMachineId();
      console.log("[LOGIN] Gửi dữ liệu đăng nhập:", { username, machineId, ip });

      const result = await window.electronAPI.login({ 
        user: username, 
        pass: password, 
        mid: machineId, 
        ip: ip 
      });
      
      console.log("[LOGIN] Kết quả đăng nhập:", result);

      if (!result || !result.success) {
        const errorMessage = result?.message || "Đăng nhập thất bại do lỗi server";
        this.removeToast(loadingToast);
        this.showToast(`❌ ${errorMessage}`, "error");
        return;
      }

      // Kiểm tra nếu tài khoản chưa có license
      if (result.success && !result.token) {
        this.removeToast(loadingToast);
        this.showToast("⚠️ Tài khoản chưa được kích hoạt License", "warning");
        
        // Hiển thị modal thông báo
        setTimeout(() => {
          this.showScreen("licenseCard");
          this.showToast("Vui lòng nhập License Key để kích hoạt tài khoản", "warning");
        }, 2000);
        
        return;
      }

      // Xác thực chữ ký số
      if (!result.signature) {
        this.removeToast(loadingToast);
        this.showToast("❌ Lỗi bảo mật: Không có chữ ký xác thực", "error");
        return;
      }

      console.log("[SECURITY] Đang xác thực chữ ký số...");
      const signatureVerified = await window.electronAPI.verifySignature(result.token, result.signature);
      console.log("[SECURITY] Kết quả xác thực chữ ký:", signatureVerified);
      
      if (!signatureVerified) {
        this.removeToast(loadingToast);
        this.showToast("❌ Lỗi bảo mật: Chữ ký không hợp lệ", "error");
        return;
      }

      // Kiểm tra trạng thái tài khoản
      const currentTime = Math.floor(Date.now() / 1000);
      
      if (result.blocked) {
        this.removeToast(loadingToast);
        this.showToast("⛔ Tài khoản đã bị khóa, vui lòng liên hệ Admin", "error");
        return;
      }

      if (currentTime >= Number(result.exp)) {
        this.removeToast(loadingToast);
        this.showToast("⏰ License đã hết hạn, vui lòng gia hạn", "warning");
        setTimeout(() => this.showScreen("licenseCard"), 2000);
        return;
      }

      // Đăng nhập thành công
      this.currentUser = username;
      this.userLicenseInfo = {
        exp: Number(result.exp),
        token: result.token,
        signature: result.signature,
        blocked: result.blocked
      };

      this.removeToast(loadingToast);
      this.showToast("✅ Đăng nhập thành công! Đang chuyển hướng...", "success");

      // Bắt đầu giám sát license
      this.startLicenseMonitor(this.userLicenseInfo, machineId, username);
      
      // Bắt đầu đếm ngược thời gian
      this.startCountdown(Number(result.exp), result.blocked);
      
      // Cập nhật tên người dùng trên dashboard
      document.getElementById("welcomeUserName").textContent = username;

      // Chuyển đến dashboard sau 2 giây
      setTimeout(() => {
        this.showScreen("mainApp");
        this.showToast(`Chào mừng ${username} đến với SecureAuth Pro!`, "success");
      }, 2000);
      
    } catch (error) {
      console.error("[LOGIN] Lỗi đăng nhập:", error);
      this.removeToast(loadingToast);
      this.showToast("❌ Lỗi kết nối máy chủ, vui lòng thử lại", "error");
    } finally {
      // Tắt hiệu ứng loading
      this.setButtonLoading(loginBtn, false);
    }
  }

  async handleRegister() {
    const username = document.getElementById("regUser").value.trim();
    const password = document.getElementById("regPass").value.trim();
    const email = document.getElementById("regEmail").value.trim();
    const phone = document.getElementById("regPhone").value.trim();
    const country = document.getElementById("regCountry").value;
    const registerBtn = document.getElementById("registerBtn");

    // Validation
    if (!username || !password || !email) {
      this.showToast("❌ Vui lòng nhập đầy đủ các trường bắt buộc", "error");
      return;
    }

    if (username.length < 6) {
      this.showToast("❌ Tên đăng nhập phải có ít nhất 6 ký tự", "error");
      return;
    }

    if (password.length < 8) {
      this.showToast("❌ Mật khẩu phải có ít nhất 8 ký tự", "error");
      return;
    }

    if (!this.isValidEmail(email)) {
      this.showToast("❌ Địa chỉ email không hợp lệ", "error");
      return;
    }

    this.setButtonLoading(registerBtn, true);
    const loadingToast = this.showToast("📝 Đang xử lý đăng ký tài khoản...", "loading");

    try {
      const machineId = await window.electronAPI.getMachineId();
      const result = await window.electronAPI.register({ 
        user: username, 
        pass: password, 
        email: email, 
        phone: phone, 
        country: country, 
        mid: machineId 
      });
      
      console.log("[REGISTER] Kết quả đăng ký:", result);

      if (result && result.success) {
        this.removeToast(loadingToast);
        this.showToast("✅ Đăng ký thành công! Vui lòng kiểm tra email để nhận License Key", "success");
        
        // Tự động điền username và chuyển đến màn hình license
        setTimeout(() => {
          this.showScreen("licenseCard");
          document.getElementById("loginUser").value = username;
          this.showToast("Vui lòng nhập License Key được gửi qua email", "info");
        }, 3000);
        
      } else {
        const errorMessage = result?.message || "Đăng ký thất bại, vui lòng thử lại";
        this.removeToast(loadingToast);
        this.showToast(`❌ ${errorMessage}`, "error");
      }
    } catch (error) {
      console.error("[REGISTER] Lỗi đăng ký:", error);
      this.removeToast(loadingToast);
      this.showToast("❌ Lỗi kết nối máy chủ, vui lòng thử lại", "error");
    } finally {
      this.setButtonLoading(registerBtn, false);
    }
  }

  async handleVerifyKey() {
  const keyInput = document.getElementById("licenseKey");
  const keyStatus = document.getElementById("licenseStatus");
  const verifyBtn = document.getElementById("btnVerify");
  
  if (!keyInput || !keyStatus) {
    console.error("Không tìm thấy phần tử license key");
    return;
  }
  
  const licenseKey = keyInput.value.trim();
  
  if (!licenseKey) {
    keyStatus.innerHTML = '<div class="status-message error">❌ Vui lòng nhập License Key</div>';
    return;
  }

  if (licenseKey.length < 50) {
    keyStatus.innerHTML = '<div class="status-message error">❌ License Key không đúng định dạng</div>';
    return;
  }

  this.setButtonLoading(verifyBtn, true);
  keyStatus.innerHTML = '<div class="status-message"><i class="fas fa-spinner fa-spin"></i> 🔐 Đang xác thực License Key...</div>';

  try {
    const machineId = await window.electronAPI.getMachineId();
    const result = await window.electronAPI.verifyKey({ 
      key: licenseKey, 
      mid: machineId 
    });
    
    console.log("[LICENSE] Kết quả xác thực:", result);

    if (result && result.success) {
      this.currentUser = result.user || "Người dùng";

      // Kiểm tra chữ ký số
      if (!result.signature) {
        keyStatus.innerHTML = '<div class="status-message error">❌ License không có chữ ký bảo mật</div>';
        return;
      }

      // Xác thực chữ ký
      const signatureVerified = await window.electronAPI.verifySignature(result.token, result.signature);
      console.log("[SECURITY] Kết quả xác thực chữ ký license:", signatureVerified);
      
      if (!signatureVerified) {
        keyStatus.innerHTML = '<div class="status-message error">❌ Cảnh báo bảo mật: License giả mạo!</div>';
        return;
      }

      // Kiểm tra trạng thái license
      const currentTime = Math.floor(Date.now() / 1000);
      
      if (result.blocked) {
        keyStatus.innerHTML = '<div class="status-message error">⛔ License đã bị khóa</div>';
        return;
      }

      if (currentTime >= Number(result.exp)) {
        keyStatus.innerHTML = '<div class="status-message error">⏰ License đã hết hạn</div>';
        return;
      }

      // ✅ License hợp lệ
      this.userLicenseInfo = {
        exp: Number(result.exp),
        token: result.token,
        signature: result.signature,
        blocked: result.blocked
      };

      // 🔑 Bắt đầu giám sát và đếm ngược giống login
      this.startLicenseMonitor(this.userLicenseInfo, machineId, this.currentUser);
      this.startCountdown(Number(result.exp), result.blocked);

      // Cập nhật tên user
      document.getElementById("welcomeUserName").textContent = this.currentUser;

      keyStatus.innerHTML = '<div class="status-message success">✅ 🎉 Kích hoạt License thành công!</div>';
      this.showToast("✅ License đã được kích hoạt thành công", "success");

      // Chuyển đến dashboard sau 2 giây
      setTimeout(() => { 
        this.showScreen("mainApp"); 
        keyStatus.innerHTML = ""; 
        this.showToast(`Chào mừng ${this.currentUser} đến với SecureAuth Pro!`, "success");
      }, 2000);
      
    } else {
      const errorMessage = result?.message || "License Key không hợp lệ hoặc đã được sử dụng";
      keyStatus.innerHTML = `<div class="status-message error">❌ ${errorMessage}</div>`;
      setTimeout(() => (keyStatus.innerHTML = ""), 5000);
    }
  } catch (error) {
    console.error("[LICENSE] Lỗi xác thực:", error);
    keyStatus.innerHTML = '<div class="status-message error">❌ Lỗi kết nối máy chủ xác thực</div>';
  } finally {
    this.setButtonLoading(verifyBtn, false);
  }
}


  startCountdown(expirationTime, isBlocked) {
    // Dừng bộ đếm ngược cũ nếu có
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }
    
    const licenseInfoElement = document.getElementById("licenseInfo");
    if (!licenseInfoElement) {
      console.error("Không tìm thấy phần tử hiển thị thông tin license");
      return;
    }

    const updateCountdown = () => {
      const currentTime = Math.floor(Date.now() / 1000);
      const timeRemaining = expirationTime - currentTime;
      
      if (timeRemaining <= 0 || isBlocked) {
        licenseInfoElement.innerHTML = `
          <div class="license-info-expired">
            <p><strong>📛 Trạng thái:</strong> ⛔ Đã hết hạn hoặc bị khóa</p>
            <p><strong>🕒 Thời gian:</strong> License không còn hiệu lực</p>
            <p><strong>💡 Hướng dẫn:</strong> Vui lòng liên hệ Admin để gia hạn</p>
          </div>
        `;
        
        if (this.countdownInterval) {
          clearInterval(this.countdownInterval);
          this.countdownInterval = null;
        }
        return;
      }
      
      // Tính toán thời gian còn lại
      const days = Math.floor(timeRemaining / 86400);
      const hours = Math.floor((timeRemaining % 86400) / 3600);
      const minutes = Math.floor((timeRemaining % 3600) / 60);
      const seconds = timeRemaining % 60;
      
      licenseInfoElement.innerHTML = `
        <div class="license-info-active">
          <p><strong>✅ Trạng thái:</strong> Đang hoạt động</p>
          <p><strong>⏰ Thời gian còn lại:</strong> ${days} ngày ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}</p>
          <p><strong>🔒 Bảo mật:</strong> Đã xác thực chữ ký số</p>
        </div>
      `;
    };
    
    // Cập nhật ngay lập tức và thiết lập interval
    updateCountdown();
    this.countdownInterval = setInterval(updateCountdown, 1000);
  }

  async startLicenseMonitor(licenseInfo, machineId, username) {
    // Dừng giám sát cũ nếu có
    if (this.licenseInterval) {
      clearInterval(this.licenseInterval);
    }
    
    const monitorUrl = "https://script.google.com/macros/s/AKfycbw-DCk41TED43ITI8dYFUvXDZloweK_L-zr4_uZ-pin4LJmw1K4yno0upKg0rHIyIb1/exec";

    this.licenseInterval = setInterval(async () => {
      try {
        console.log("[MONITOR] Đang kiểm tra trạng thái license...");
        
        const response = await fetch(monitorUrl, {
          method: "POST",
          body: JSON.stringify({
            action: "verifyKey",
            user: username,
            mid: machineId,
            key: licenseInfo.token,
          }),
          headers: { "Content-Type": "application/json" },
        });

        const licenseData = await response.json();
        console.log("[MONITOR] Kết quả kiểm tra:", licenseData);

        const currentTime = Math.floor(Date.now() / 1000);

        // Kiểm tra phản hồi từ server
        if (!licenseData || licenseData.status !== "ok") {
          this.showToast("⚠️ Cảnh báo: License không hợp lệ", "warning");
          setTimeout(() => this.handleLogout(), 5000);
          return;
        }

        // Kiểm tra chữ ký số
        if (!licenseData.signature) {
          this.showToast("❌ Lỗi xác thực bảo mật", "error");
          setTimeout(() => this.handleLogout(), 3000);
          return;
        }

        // Xác thực chữ ký
        const signatureVerified = await window.electronAPI.verifySignature(licenseData.token, licenseData.signature);
        if (!signatureVerified) {
          this.showToast("❌ Cảnh báo: Phát hiện License giả mạo!", "error");
          setTimeout(() => this.handleLogout(), 3000);
          return;
        }

        // Kiểm tra trạng thái khóa
        if (licenseData.blocked) {
          this.showToast("⛔ Tài khoản đã bị khóa bởi Admin", "error");
          setTimeout(() => this.handleLogout(), 3000);
          return;
        }

        // Kiểm tra thời hạn
        if (licenseData.exp && Number(licenseData.exp) <= currentTime) {
          this.showToast("⏰ License đã hết hạn sử dụng", "warning");
          setTimeout(() => this.handleLogout(), 3000);
          return;
        }

        // Cập nhật thời gian đếm ngược nếu có thay đổi
        if (licenseData.exp) {
          this.startCountdown(Number(licenseData.exp), licenseData.blocked);
        }
        
        console.log("[MONITOR] License hợp lệ - Tiếp tục hoạt động");
        
      } catch (error) {
        console.error("[MONITOR] Lỗi giám sát:", error);
        // Không đăng xuất khi mất kết nối, chỉ cảnh báo
        this.showToast("⚠️ Mất kết nối máy chủ - Đang thử lại...", "warning");
      }
    }, 30000); // Kiểm tra mỗi 30 giây
  }

  // Giữ lại showStatus cho tương thích ngược (nếu có code còn sử dụng)
  showStatus(message, type = "info") {
    this.showToast(message, type);
  }

  hideStatus() {
    // Không cần implement vì đã dùng toast
  }
}

// Thêm CSS cho các hiệu ứng bổ sung
const additionalStyles = document.createElement('style');
additionalStyles.textContent = `
  .status-bar .fas.fa-spinner {
    margin-right: 8px;
  }
  
  .security-badge, .uptime-status {
    font-size: 0.875rem;
  }
  
  .user-welcome {
    animation: pulse 2s infinite;
  }
  
  @keyframes pulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.05); }
  }
  
  .license-info-active, .license-info-expired {
    transition: all 0.3s ease;
  }
  
  .license-info-active:hover, .license-info-expired:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }

  /* Forgot Password specific styles */
  .forgot-password-info {
    background: rgba(59, 130, 246, 0.1);
    padding: 1rem;
    border-radius: var(--border-radius);
    border: 1px solid rgba(59, 130, 246, 0.2);
    margin-bottom: 1.5rem;
    text-align: center;
  }

  .forgot-password-info i {
    color: #3b82f6;
    font-size: 1.5rem;
    margin-bottom: 0.5rem;
  }

  .forgot-password-info p {
    margin: 0;
    color: var(--gray);
    font-size: 0.875rem;
  }

  /* Enhanced Button Press Effects */
  .btn:active {
    transform: translateY(0) scale(0.98);
    transition: transform 0.1s ease;
  }

  .btn-primary:active {
    box-shadow: 0 2px 8px rgba(37, 99, 235, 0.4);
    background: var(--primary-dark);
  }

  .btn-success:active {
    box-shadow: 0 2px 8px rgba(16, 185, 129, 0.4);
    background: #059669;
  }

  .btn-outline:active {
    background: rgba(255, 255, 255, 0.1);
    box-shadow: 0 2px 8px rgba(255, 255, 255, 0.1);
  }

  /* Ripple Effect for Buttons */
  .btn {
    position: relative;
    overflow: hidden;
  }

  .btn::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 0;
    height: 0;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.3);
    transform: translate(-50%, -50%);
    transition: width 0.3s, height 0.3s;
  }

  .btn:active::after {
    width: 100%;
    height: 100%;
  }

  /* Loading state for buttons */
  .btn-loading {
    position: relative;
    color: transparent !important;
  }

  .btn-loading::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 20px;
    height: 20px;
    margin: -10px 0 0 -10px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top: 2px solid white;
    border-radius: 50%;
    animation: button-spin 0.8s linear infinite;
  }

  @keyframes button-spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  /* Toast notification animations */
  .toast-container {
    position: fixed;
    top: 80px;
    right: 20px;
    z-index: 10000;
    max-width: 400px;
  }

  .toast {
    background: var(--dark);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: var(--border-radius);
    padding: var(--spacing-md) var(--spacing-lg);
    margin-bottom: var(--spacing-sm);
    box-shadow: var(--shadow-lg);
    animation: toastSlideIn 0.3s ease-out;
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
  }

  .toast.success {
    border-left: 4px solid var(--success);
  }

  .toast.error {
    border-left: 4px solid var(--danger);
  }

  .toast.warning {
    border-left: 4px solid var(--warning);
  }

  .toast.info {
    border-left: 4px solid var(--primary);
  }

  .toast.loading {
    border-left: 4px solid var(--primary);
  }

  @keyframes toastSlideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }

  .toast.fade-out {
    animation: toastSlideOut 0.3s ease-in forwards;
  }

  @keyframes toastSlideOut {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(100%);
      opacity: 0;
    }
  }

  /* Enhanced focus states for accessibility */
  .btn:focus-visible {
    outline: 2px solid var(--primary);
    outline-offset: 2px;
  }

  .input-group input:focus-visible,
  .input-group select:focus-visible {
    outline: 2px solid var(--primary);
    outline-offset: 2px;
  }

  /* Pulse animation for important buttons */
  .btn-pulse {
    animation: pulse-glow 2s infinite;
  }

  @keyframes pulse-glow {
    0% {
      box-shadow: 0 0 0 0 rgba(37, 99, 235, 0.4);
    }
    70% {
      box-shadow: 0 0 0 10px rgba(37, 99, 235, 0);
    }
    100% {
      box-shadow: 0 0 0 0 rgba(37, 99, 235, 0);
    }
  }
`;
document.head.appendChild(additionalStyles);

// Khởi tạo ứng dụng khi DOM đã sẵn sàng
document.addEventListener("DOMContentLoaded", () => { 
  if (window.electronAPI) {
    console.log("🚀 Đang khởi chạy SecureAuth Pro...");
    window.authApp = new AuthApp();
  } else {
    console.error("❌ Electron API không khả dụng");
    document.body.innerHTML = `
      <div class="error-container">
        <div class="error-content">
          <i class="fas fa-exclamation-triangle"></i>
          <h2>Lỗi Khởi Tạo Ứng Dụng</h2>
          <p>Không thể kết nối với Electron API. Vui lòng:</p>
          <ul>
            <li>Khởi động lại ứng dụng</li>
            <li>Kiểm tra phiên bản Electron</li>
            <li>Liên hệ kỹ thuật nếu lỗi vẫn tiếp diễn</li>
          </ul>
          <button onclick="window.location.reload()" class="btn btn-primary">
            <i class="fas fa-redo"></i>
            Thử Lại
          </button>
        </div>
      </div>
    `;
    
    // Thêm CSS cho màn hình lỗi
    const errorStyle = document.createElement('style');
    errorStyle.textContent = `
      .error-container {
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 100vh;
        background: linear-gradient(135deg, var(--darker) 0%, var(--dark) 100%);
        padding: 2rem;
      }
      .error-content {
        text-align: center;
        background: rgba(255, 255, 255, 0.08);
        padding: 3rem;
        border-radius: 20px;
        border: 1px solid rgba(255, 255, 255, 0.12);
        max-width: 500px;
        backdrop-filter: blur(10px);
      }
      .error-content i {
        font-size: 4rem;
        color: #ef4444;
        margin-bottom: 1.5rem;
      }
      .error-content h2 {
        color: #f8fafc;
        margin-bottom: 1rem;
      }
      .error-content p {
        color: #94a3b8;
        margin-bottom: 1.5rem;
      }
      .error-content ul {
        text-align: left;
        color: #94a3b8;
        margin-bottom: 2rem;
      }
      .error-content li {
        margin-bottom: 0.5rem;
      }
    `;
    document.head.appendChild(errorStyle);
  }
});

// Xử lý lỗi toàn cục
window.addEventListener("error", (event) => { 
  console.error("💥 Lỗi toàn cục:", event.error);
  if (window.authApp) {
    window.authApp.showToast("⚠️ Đã xảy ra lỗi ứng dụng, vui lòng thử lại", "error");
  }
});