document.addEventListener("DOMContentLoaded", () => {
    // 1. Helper: Check if running strictly inside the standalone PWA app
    const isPWA = () => {
        return window.matchMedia('(display-mode: standalone)').matches || 
               window.navigator.standalone === true || 
               document.referrer.includes('android-app://');
    };

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

    // STRICT CHECK: Returns true ONLY inside actual PWA window mode
    const runningInsidePWA = isPWA();

    // Setup initial UI states
    if (runningInsidePWA) {
        // User opened app from home screen -> Normal app functionality
        if (pwaBtn) {
            pwaBtn.innerText = "Open App";
            pwaBtn.style.backgroundColor = "#ffffff";
            pwaBtn.style.color = "#800020";
            pwaBtn.style.fontWeight = "800";
            pwaBtn.style.border = "1px solid #ffffff";
            pwaBtn.onclick = () => window.location.href = "index.html";
        }
    } else {
        // User is browsing inside Chrome -> Strict Install Mode
        if (pwaBtn) {
            pwaBtn.innerText = "Install";
            pwaBtn.disabled = false;
        }
    }

    // Capture Native Browser PWA Install Prompt
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
    });

    // 40-Second Progress Loading Function
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
                if (dlCenterDesc) dlCenterDesc.innerText = "BirrGo PWA is installed. Check your home screen to open the app!";
                if (pwaMainTitle) pwaMainTitle.innerText = "Download Complete!";
                if (pwaSubTitle) pwaSubTitle.innerText = "Open from Home Screen";

                if (dlCenterBtn) {
                    dlCenterBtn.innerText = "Open App";
                    dlCenterBtn.style.background = "linear-gradient(135deg, #0f9d58 0%, #0b7140 100%)";
                    dlCenterBtn.disabled = false;
                    dlCenterBtn.onclick = () => window.location.href = "index.html";
                }

                if (pwaBtn) {
                    pwaBtn.innerText = "Open App";
                    pwaBtn.style.backgroundColor = "#ffffff";
                    pwaBtn.style.color = "#800020";
                    pwaBtn.style.fontWeight = "800";
                    pwaBtn.style.border = "1px solid #ffffff";
                    pwaBtn.disabled = false;
                    pwaBtn.onclick = () => window.location.href = "index.html";
                }
            }
        }, 1000);
    };

    // Flow Trigger: Forces Chrome Prompt First
    const triggerInstallFlow = async () => {
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

        if (isIOS) {
            if (modalIconWrapper) modalIconWrapper.style.background = "#fdf2f4";
            if (modalIconSvg) {
                modalIconSvg.setAttribute('stroke', '#800020');
                modalIconSvg.innerHTML = `<path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path><polyline points="16 6 12 2 8 6"></polyline><line x1="12" y1="2" x2="12" y2="15"></line>`;
            }
            if (modalTitleText) modalTitleText.innerText = "Install BirrGo PWA";
            if (modalDescText) modalDescText.innerText = "To install BirrGo: Tap the 'Share' icon in Safari, then tap 'Add to Home Screen'.";
            if (installedModal) installedModal.style.display = 'flex';
            return;
        }

        if (deferredPrompt) {
            try {
                // Show native Chrome prompt
                deferredPrompt.prompt();
                const { outcome } = await deferredPrompt.userChoice;
                deferredPrompt = null;

                if (outcome === 'accepted') {
                    // User tapped "Install" on Chrome prompt -> Run 40s timer
                    start40SecCountdown();
                }
            } catch (err) {
                console.warn('Install prompt error:', err);
                start40SecCountdown();
            }
        } else {
            // Chrome prompt not available -> Show helper modal
            if (modalTitleText) modalTitleText.innerText = "Install BirrGo App";
            if (modalDescText) modalDescText.innerText = "Tap the browser menu (3 dots) at top right and select 'Add to Home screen' or 'Install app'.";
            if (installedModal) installedModal.style.display = 'flex';
        }
    };

    // Main Install Button Click Listener
    if (pwaBtn) {
        pwaBtn.addEventListener('click', () => {
            if (runningInsidePWA) {
                window.location.href = "index.html";
            } else {
                triggerInstallFlow();
            }
        });
    }

    // STRICT BLOCK: Intercept ALL buttons/links while in Chrome browser mode
    if (!runningInsidePWA) {
        const actionElements = document.querySelectorAll('a, button');
        actionElements.forEach(element => {
            if (element.id === 'pwaInstallBtn' || 
                element.id === 'closeInstalledModalBtn' || 
                element.id === 'dlCenterBtn') return;

            element.addEventListener('click', (e) => {
                // BLOCK every click completely inside Chrome browser
                e.preventDefault();
                e.stopPropagation();
                triggerInstallFlow();
            });
        });
    }

    // Modal Close
    if (closeModalBtn && installedModal) {
        closeModalBtn.addEventListener('click', () => installedModal.style.display = 'none');
        installedModal.addEventListener('click', (e) => {
            if (e.target === installedModal) installedModal.style.display = 'none';
        });
    }

    // OS App Installed Event Handler
    window.addEventListener('appinstalled', () => {
        deferredPrompt = null;
    });
});
