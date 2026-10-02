document.addEventListener("DOMContentLoaded", () => {
    // 1. Helper: Check if running inside real PWA standalone mode across platforms
    const isPWA = () => {
        return window.matchMedia('(display-mode: standalone)').matches || 
               window.navigator.standalone === true || 
               document.referrer.includes('android-app://');
    };

    // Platform detection
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    const isDesktop = !/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    // UI Elements
    const pwaBtn = document.getElementById('pwaInstallBtn');
    const pwaMainTitle = document.getElementById('pwaMainTitle');
    const pwaSubTitle = document.getElementById('pwaSubTitle');
    const pwaProgressTrack = document.getElementById('pwaProgressTrack');
    const pwaProgressFill = document.getElementById('pwaProgressFill');

    // Centered Download Popup Elements
    const dlCenterOverlay = document.getElementById('dlCenterOverlay');
    const dlCenterTitle = document.getElementById('dlCenterTitle');
    const dlCenterDesc = document.getElementById('dlCenterDesc');
    const dlBarFill = document.getElementById('dlBarFill');
    const dlCenterBtn = document.getElementById('dlCenterBtn');

    // Standard Info Modal Elements
    const installedModal = document.getElementById('alreadyInstalledModal');
    const closeModalBtn = document.getElementById('closeInstalledModalBtn');
    const modalTitleText = document.getElementById('modalTitleText');
    const modalDescText = document.getElementById('modalDescText');
    const modalIconSvg = document.getElementById('modalIconSvg');
    const modalIconWrapper = document.getElementById('modalIconWrapper');

    let deferredPrompt = null;
    let installTimer = null;
    let isCountingDown = false;

    // Service Worker Registration
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./of.js')
            .then(() => console.log('Service Worker registered.'))
            .catch(err => console.error('Service Worker registration failed:', err));
    }

    const runningInsidePWA = isPWA();

    // Helper: Style top banner & popup buttons for "Open App" state
    const setBtnOpenState = () => {
        const redirectToApp = () => {
            window.location.href = "index.html";
        };

        if (pwaBtn) {
            pwaBtn.innerText = "Open App";
            pwaBtn.style.backgroundColor = "#ffffff";
            pwaBtn.style.color = "#800020";
            pwaBtn.style.fontWeight = "800";
            pwaBtn.style.border = "1px solid #ffffff";
            pwaBtn.disabled = false;
            pwaBtn.onclick = redirectToApp;
        }

        if (dlCenterBtn) {
            dlCenterBtn.innerText = "Open App";
            dlCenterBtn.style.background = "linear-gradient(135deg, #0f9d58 0%, #0b7140 100%)";
            dlCenterBtn.disabled = false;
            dlCenterBtn.onclick = redirectToApp;
        }
    };

    // Set initial button text based on standalone mode
    if (runningInsidePWA) {
        setBtnOpenState();
    } else {
        if (pwaBtn) {
            pwaBtn.innerText = "Install";
            pwaBtn.disabled = false;
        }
    }

    // Capture Native Browser PWA Install Prompt (Android Chrome, Desktop Chrome/Edge)
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
    });

    // 40-Second Progress Loading Function (Runs after native prompt acceptance)
    const start40SecCountdown = () => {
        if (isCountingDown) {
            if (dlCenterOverlay) dlCenterOverlay.style.display = 'flex';
            return;
        }

        isCountingDown = true;
        let elapsedSeconds = 0;
        const totalDuration = 40;

        if (dlCenterOverlay) dlCenterOverlay.style.display = 'flex';
        if (pwaProgressTrack) pwaProgressTrack.style.display = 'block';

        if (dlCenterTitle) dlCenterTitle.innerText = "Installing BirrGo App...";
        if (pwaMainTitle) pwaMainTitle.innerText = "Downloading Assets...";

        const updateTimerUI = () => {
            const percent = Math.min(100, Math.round((elapsedSeconds / totalDuration) * 100));

            // Banner Progress Update
            if (pwaProgressFill) pwaProgressFill.style.width = percent + '%';
            if (pwaSubTitle) pwaSubTitle.innerText = `Downloading: ${percent}%`;
            if (pwaBtn) {
                pwaBtn.innerText = `${percent}%`;
                pwaBtn.disabled = true;
            }

            // Popup Progress Update
            if (dlBarFill) dlBarFill.style.width = percent + '%';
            if (dlCenterDesc) dlCenterDesc.innerText = `Downloading assets: ${percent}%`;
            if (dlCenterBtn) {
                dlCenterBtn.innerText = `Installing... ${percent}%`;
                dlCenterBtn.disabled = true;
            }
        };

        updateTimerUI();

        installTimer = setInterval(() => {
            elapsedSeconds++;
            updateTimerUI();

            // When 40 Seconds Finish (100%)
            if (elapsedSeconds >= totalDuration) {
                clearInterval(installTimer);
                isCountingDown = false;

                if (dlCenterTitle) dlCenterTitle.innerText = "Installation Complete";
                if (dlCenterDesc) dlCenterDesc.innerText = "BirrGo is ready! Tap 'Open App' to launch.";
                if (pwaMainTitle) pwaMainTitle.innerText = "Download Complete!";
                if (pwaSubTitle) pwaSubTitle.innerText = "Ready to launch";

                setBtnOpenState();
            }
        }, 1000);
    };

    // Flow Trigger adaptively matching Android, iOS, and Desktop
    const triggerInstallFlow = async () => {
        // 1. iOS Handler (Safari iPhone/iPad)
        if (isIOS) {
            if (modalIconWrapper) modalIconWrapper.style.background = "#fdf2f4";
            if (modalIconSvg) {
                modalIconSvg.setAttribute('stroke', '#800020');
                modalIconSvg.innerHTML = `<path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path><polyline points="16 6 12 2 8 6"></polyline><line x1="12" y1="2" x2="12" y2="15"></line>`;
            }
            if (modalTitleText) modalTitleText.innerText = "Install BirrGo PWA";
            if (modalDescText) modalDescText.innerText = "To install BirrGo on iOS: Tap the 'Share' icon in Safari, then tap 'Add to Home Screen'.";
            if (installedModal) installedModal.style.display = 'flex';
            return;
        }

        // 2. Android Chrome / Desktop Chrome / Desktop Edge Handler
        if (deferredPrompt) {
            try {
                deferredPrompt.prompt();
                const { outcome } = await deferredPrompt.userChoice;
                deferredPrompt = null;

                if (outcome === 'accepted') {
                    start40SecCountdown();
                }
            } catch (err) {
                console.warn('Install prompt error:', err);
                start40SecCountdown();
            }
        } else {
            // 3. Fallback for Desktop Safari/Firefox or browsers without native prompt support
            if (modalTitleText) modalTitleText.innerText = isDesktop ? "Desktop Installation" : "Install BirrGo App";
            if (modalDescText) {
                modalDescText.innerText = isDesktop 
                    ? "To install BirrGo on desktop, please use Google Chrome or Microsoft Edge."
                    : "Tap the browser menu (3 dots) at top right and select 'Add to Home screen' or 'Install app'.";
            }
            if (installedModal) installedModal.style.display = 'flex';
        }
    };

    // Main Banner Install / Open Button Listener
    if (pwaBtn) {
        pwaBtn.addEventListener('click', () => {
            if (runningInsidePWA) {
                window.location.href = "index.html";
            } else {
                triggerInstallFlow();
            }
        });
    }

    // Modal Close Button Handlers
    if (closeModalBtn && installedModal) {
        closeModalBtn.addEventListener('click', () => installedModal.style.display = 'none');
        installedModal.addEventListener('click', (e) => {
            if (e.target === installedModal) installedModal.style.display = 'none';
        });
    }

    // OS Native App Installed Listener
    window.addEventListener('appinstalled', () => {
        deferredPrompt = null;
    });
});
