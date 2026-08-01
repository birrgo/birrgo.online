document.addEventListener("DOMContentLoaded", () => {
    // 1. Helper: Check if running inside real PWA standalone mode
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

    // Helper: Style top button for Installed / Open State
    const setBtnOpenState = () => {
        if (!pwaBtn) return;
        pwaBtn.innerText = "Open";
        pwaBtn.style.backgroundColor = "#ffffff";
        pwaBtn.style.color = "#800020";
        pwaBtn.style.fontWeight = "800";
        pwaBtn.style.border = "1px solid #ffffff";
        pwaBtn.disabled = false;
        pwaBtn.onclick = () => {
            window.location.href = "index.html";
        };
    };

    // Check Initial App State
    if (isPWA() || localStorage.getItem('birrgo_app_installed') === 'true') {
        setBtnOpenState();
    } else {
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

    // 40-Second Progress Loading Function (Percentage only, no seconds display)
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
                dlCenterBtn.innerText = `Downloading... ${percent}%`;
                dlCenterBtn.disabled = true;
            }
        };

        updateTimerUI();

        installTimer = setInterval(async () => {
            elapsedSeconds++;
            updateTimerUI();

            // When 40 Seconds Finish (100%)
            if (elapsedSeconds >= totalDuration) {
                clearInterval(installTimer);
                isCountingDown = false;

                if (dlCenterTitle) dlCenterTitle.innerText = "Ready to Install";
                if (dlCenterDesc) dlCenterDesc.innerText = "Tap 'Install App' to add BirrGo to your home screen.";

                if (dlCenterBtn) {
                    dlCenterBtn.innerText = "Install App";
                    dlCenterBtn.style.background = "linear-gradient(135deg, #800020 0%, #4a0012 100%)";
                    dlCenterBtn.disabled = false;

                    // Trigger OS Native Browser PWA Install Window
                    dlCenterBtn.onclick = async () => {
                        if (dlCenterOverlay) dlCenterOverlay.style.display = 'none';

                        if (deferredPrompt) {
                            deferredPrompt.prompt();
                            const { outcome } = await deferredPrompt.userChoice;
                            if (outcome === 'accepted') {
                                localStorage.setItem('birrgo_app_installed', 'true');
                                setBtnOpenState();
                            }
                            deferredPrompt = null;
                        } else {
                            modalTitleText.innerText = "App Ready";
                            modalDescText.innerText = "Look for the BirrGo icon on your home screen or check browser menu to finish installation.";
                            installedModal.style.display = 'flex';
                        }
                    };
                }

                if (pwaMainTitle) pwaMainTitle.innerText = "Download Complete!";
                if (pwaSubTitle) pwaSubTitle.innerText = "Ready for Installation";

                if (pwaBtn) {
                    pwaBtn.innerText = "Install";
                    pwaBtn.style.backgroundColor = "#ffffff";
                    pwaBtn.style.color = "#800020";
                    pwaBtn.style.fontWeight = "800";
                    pwaBtn.disabled = false;
                    pwaBtn.onclick = dlCenterBtn.onclick;
                }

                // Auto Trigger native prompt popup immediately if available
                if (deferredPrompt) {
                    dlCenterBtn.click();
                }
            }
        }, 1000);
    };

    // Flow Trigger
    const triggerInstallFlow = () => {
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

        if (isIOS) {
            modalIconWrapper.style.background = "#fdf2f4";
            modalIconSvg.setAttribute('stroke', '#800020');
            modalIconSvg.innerHTML = `<path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path><polyline points="16 6 12 2 8 6"></polyline><line x1="12" y1="2" x2="12" y2="15"></line>`;
            modalTitleText.innerText = "Install BirrGo PWA";
            modalDescText.innerText = "To install BirrGo: Tap the 'Share' icon in Safari, then tap 'Add to Home Screen'.";
            installedModal.style.display = 'flex';
            return;
        }

        start40SecCountdown();
    };

    // Main Install Button Click Listener
    if (pwaBtn) {
        pwaBtn.addEventListener('click', () => {
            if (isPWA() || localStorage.getItem('birrgo_app_installed') === 'true') {
                window.location.href = "index.html";
            } else {
                triggerInstallFlow();
            }
        });
    }

    // Intercept clicks on all links/buttons for uninstalled visitors
    if (!isPWA() && localStorage.getItem('birrgo_app_installed') !== 'true') {
        const actionElements = document.querySelectorAll('a, button');
        actionElements.forEach(element => {
            if (element.id === 'pwaInstallBtn' || 
                element.id === 'closeInstalledModalBtn' || 
                element.id === 'dlCenterBtn') return;

            element.addEventListener('click', (e) => {
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
        localStorage.setItem('birrgo_app_installed', 'true');
        deferredPrompt = null;
        if (dlCenterOverlay) dlCenterOverlay.style.display = 'none';
        if (pwaMainTitle) pwaMainTitle.innerText = "BirrGo App Installed";
        if (pwaSubTitle) pwaSubTitle.innerText = "Open app from your Home Screen";
        setBtnOpenState();
    });
});
