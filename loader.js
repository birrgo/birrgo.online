(function () {
  // 1. Inject White Glassmorphism CSS Styles
  const styles = `
    /* Full-screen White Glassmorphism Overlay */
    #global-loader {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(255, 255, 255, 0.45); /* Semi-transparent white */
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);  /* Blur background content */
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

    /* Dual-Ring Burgundy Glowing Spinner */
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
      filter: drop-shadow(0 0 8px rgba(128, 0, 32, 0.4));
    }

    .loader-ring-inner {
      width: 70%;
      height: 70%;
      border: 3px solid transparent !important;
      border-top-color: #b01c3e !important;
      border-right-color: #b01c3e !important;
      animation-duration: 0.8s;
      animation-direction: reverse;
      filter: drop-shadow(0 0 6px rgba(176, 28, 62, 0.4));
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    /* Text & Badges */
    .loader-text {
      font-size: 15px;
      color: #1e293b;
      font-weight: 600;
      letter-spacing: 0.5px;
      margin: 0;
    }

    /* Connection Error White Glass Card */
    .network-error-box {
      display: none;
      text-align: center;
      padding: 32px 28px;
      max-width: 340px;
      background: rgba(255, 255, 255, 0.75);
      border: 1px solid rgba(255, 255, 255, 0.8);
      border-radius: 24px;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.08);
    }

    .error-icon {
      width: 48px;
      height: 48px;
      background: rgba(239, 68, 68, 0.12);
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
      color: #0f172a;
      font-size: 18px;
      font-weight: 600;
    }

    .network-error-box p {
      margin: 0 0 20px 0;
      color: #475569;
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
      box-shadow: 0 4px 12px rgba(128, 0, 32, 0.25);
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }

    .retry-btn:active {
      transform: scale(0.98);
    }
  `;

  const styleSheet = document.createElement("style");
  styleSheet.innerText = styles;
  document.head.appendChild(styleSheet);

  let activeRequests = 0;
  let safetyTimer = null;

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

      // Auto-hide after 8s safety timeout so page never stays frozen forever
      clearTimeout(safetyTimer);
      safetyTimer = setTimeout(() => {
        activeRequests = 0;
        this.hide();
      }, 8000);
    },

    hide: function () {
      const loader = document.getElementById("global-loader");
      if (loader) loader.classList.add("hidden");
      clearTimeout(safetyTimer);
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
      clearTimeout(safetyTimer);
    }
  };

  // Check Actual Ping / Internet Connection
  async function checkRealConnectivity() {
    if (!navigator.onLine) return false;
    try {
      await fetch(`https://www.google.com/generate_204?ts=${Date.now()}`, {
        method: "HEAD",
        mode: "no-cors",
        cache: "no-store"
      });
      return true;
    } catch {
      return false;
    }
  }

  // 2. Intercept Active Network Requests (Auto open/close on operations)
  function setupNetworkInterceptors() {
    const originalFetch = window.fetch;
    window.fetch = async function (...args) {
      activeRequests++;
      window.AppLoader.show("Loading...");
      try {
        const response = await originalFetch.apply(this, args);
        return response;
      } catch (err) {
        const isConnected = await checkRealConnectivity();
        if (!isConnected) window.AppLoader.showError();
        throw err;
      } finally {
        activeRequests = Math.max(0, activeRequests - 1);
        if (activeRequests === 0) window.AppLoader.hide();
      }
    };

    const originalXHR = window.XMLHttpRequest.prototype.open;
    window.XMLHttpRequest.prototype.open = function (...args) {
      this.addEventListener("loadstart", () => {
        activeRequests++;
        window.AppLoader.show("Loading...");
      });
      const handleEnd = async () => {
        activeRequests = Math.max(0, activeRequests - 1);
        if (this.status === 0) {
          const isConnected = await checkRealConnectivity();
          if (!isConnected) window.AppLoader.showError();
        }
        if (activeRequests === 0) window.AppLoader.hide();
      };
      this.addEventListener("loadend", handleEnd);
      return originalXHR.apply(this, args);
    };
  }

  // 3. Injection and Event Listeners
  document.addEventListener("DOMContentLoaded", () => {
    const loaderHTML = `
      <div id="global-loader" class="hidden">
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

    setupNetworkInterceptors();

    // Check actual internet health on initialization
    checkRealConnectivity().then((online) => {
      if (!online) window.AppLoader.showError();
    });

    window.addEventListener("offline", () => window.AppLoader.showError());
    window.addEventListener("online", async () => {
      const isOnline = await checkRealConnectivity();
      if (isOnline) {
        window.AppLoader.show("Connected!");
        setTimeout(() => window.AppLoader.hide(), 600);
      } else {
        window.AppLoader.showError();
      }
    });

    // Intercept Page Navigation Links (Only real external link navigation)
    document.addEventListener("click", async (e) => {
      const link = e.target.closest("a");
      if (!link) return;

      const href = link.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("javascript:") || link.target === "_blank") {
        return;
      }

      const isConnected = await checkRealConnectivity();
      if (!isConnected) {
        e.preventDefault();
        e.stopPropagation();
        window.AppLoader.showError();
        return;
      }

      window.AppLoader.show("Navigating...");
    }, true);
  });
})();
