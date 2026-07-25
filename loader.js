(function () {
  // 1. Inject Burgundy Glassmorphism CSS Styles
  const styles = `
    /* Full-screen Dark Burgundy Glassmorphism Overlay */
    #global-loader {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(26, 5, 10, 0.88);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      z-index: 999999;
      transition: opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1), visibility 0.3s ease;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }

    #global-loader.hidden {
      opacity: 0;
      visibility: hidden;
      pointer-events: none;
    }

    /* Modern Dual-Ring Glowing Burgundy Spinner */
    .loader-container {
      position: relative;
      width: 64px;
      height: 64px;
      margin: 0 auto 20px auto;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .loader-ring {
      position: absolute;
      width: 100%;
      height: 100%;
      border-radius: 50%;
      border: 3px solid transparent !important;
      border-top-color: #800020 !important;
      border-right-color: #800020 !important;
      animation: spin 1.2s cubic-bezier(0.5, 0, 0.5, 1) infinite;
      filter: drop-shadow(0 0 10px rgba(128, 0, 32, 0.8));
    }

    .loader-ring-inner {
      width: 70%;
      height: 70%;
      border: 3px solid transparent !important;
      border-top-color: #b01c3e !important;
      border-right-color: #b01c3e !important;
      animation-duration: 0.8s;
      animation-direction: reverse;
      filter: drop-shadow(0 0 8px rgba(176, 28, 62, 0.8));
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    /* Text & Badges */
    .loader-text {
      font-size: 15px;
      color: #f8fafc;
      font-weight: 500;
      letter-spacing: 0.5px;
      margin: 0;
    }

    /* Connection Error Glass Card */
    .network-error-box {
      display: none;
      text-align: center;
      padding: 32px 28px;
      max-width: 340px;
      background: rgba(45, 10, 18, 0.85);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 20px;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.6);
    }

    .error-icon {
      width: 48px;
      height: 48px;
      background: rgba(239, 68, 68, 0.15);
      color: #ef4444;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 16px auto;
      font-size: 20px;
    }

    .network-error-box h3 {
      margin: 0 0 8px 0;
      color: #ffffff;
      font-size: 18px;
      font-weight: 600;
    }

    .network-error-box p {
      margin: 0 0 20px 0;
      color: #d1d5db;
      font-size: 14px;
      line-height: 1.5;
    }

    .retry-btn {
      background: linear-gradient(135deg, #800020 0%, #4a0012 100%);
      color: #ffffff;
      border: none;
      padding: 12px 24px;
      border-radius: 12px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      width: 100%;
      box-shadow: 0 4px 12px rgba(74, 0, 18, 0.4);
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }

    .retry-btn:active {
      transform: scale(0.98);
    }
  `;

  const styleSheet = document.createElement("style");
  styleSheet.innerText = styles;
  document.head.appendChild(styleSheet);

  // Global Controller Methods
  window.AppLoader = {
    show: function (msg = "Loading...") {
      const loader = document.getElementById("global-loader");
      const loaderContent = document.getElementById("loader-content");
      const networkError = document.getElementById("network-error");
      const loaderText = document.querySelector(".loader-text");
      if (loaderText) loaderText.innerText = msg;
      if (loaderContent) loaderContent.style.display = "block";
      if (networkError) networkError.style.display = "none";
      if (loader) loader.classList.remove("hidden");
    },
    hide: function () {
      const loader = document.getElementById("global-loader");
      if (loader) loader.classList.add("hidden");
    },
    showError: function () {
      const loader = document.getElementById("global-loader");
      const loaderContent = document.getElementById("loader-content");
      const networkError = document.getElementById("network-error");
      if (loader) {
        loader.classList.remove("hidden");
        if (loaderContent) loaderContent.style.display = "none";
        if (networkError) networkError.style.display = "block";
      }
    }
  };

  // 2. DOM Injection & Auto-Interceptors
  document.addEventListener("DOMContentLoaded", () => {
    const loaderHTML = `
      <div id="global-loader">
        <div id="loader-content">
          <div class="loader-container">
            <div class="loader-ring"></div>
            <div class="loader-ring loader-ring-inner"></div>
          </div>
          <p class="loader-text">Loading...</p>
        </div>
        
        <div id="network-error" class="network-error-box">
          <div class="error-icon">⚡</div>
          <h3>No Internet Connection</h3>
          <p>Please check your network connection and try again.</p>
          <button class="retry-btn" onclick="window.location.reload()">Retry</button>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML("afterbegin", loaderHTML);

    // Network Check
    if (!navigator.onLine) {
      window.AppLoader.showError();
    } else {
      setTimeout(() => window.AppLoader.hide(), 300);
    }

    window.addEventListener("offline", () => window.AppLoader.showError());
    window.addEventListener("online", () => {
      window.AppLoader.show("Connected! Loading...");
      setTimeout(() => window.AppLoader.hide(), 500);
    });

    // Intercept buttons, links, and navigation items globally
    document.addEventListener("click", (e) => {
      const btnOrLink = e.target.closest("button, a, .nav-item, .fixed-invitation-level-bar");
      if (!btnOrLink) return;

      // Skip loader on specific actions
      if (btnOrLink.id === "popupConfirmBtn" || btnOrLink.classList.contains("retry-btn") || btnOrLink.id === "shareBtn") {
        return;
      }

      if (!navigator.onLine) {
        e.preventDefault();
        e.stopPropagation();
        window.AppLoader.showError();
        return;
      }

      window.AppLoader.show("Please wait...");
    }, true);
  });
})();
