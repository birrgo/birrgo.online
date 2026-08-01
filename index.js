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

    // Register Service Worker
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./of.js')
            .then(() => console.log('Service Worker registered.'))
            .catch(err => console.error('Service Worker registration failed:', err));
    }

    // Capture Native Browser PWA Install Prompt
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        if (!isPWA() && localStorage.getItem('birrgo_app_installed') !== 'true') {
            if (pwaBtn) {
                pwaBtn.innerText = "Download";
                pwaBtn.style.backgroundColor = "";
                pwaBtn.disabled = false;
            }
        }
    });

    // Logo Visual state
    const targetLogo = document.querySelector('.logo-image');
    if (targetLogo && targetLogo.complete && targetLogo.naturalWidth > 0) {
        targetLogo.classList.add('loaded');
    }

    localStorage.setItem('birrgo_last_page', 'index.html');

    // Update Progress UI function
    const updateProgressUI = (percent) => {
        const rounded = Math.min(100, Math.round(percent));

        // Banner Progress
        if (pwaProgressTrack) pwaProgressTrack.style.display = 'block';
        if (pwaProgressFill) pwaProgressFill.style.width = rounded + '%';
        if (pwaMainTitle) pwaMainTitle.innerText = "Downloading App Assets...";
        if (pwaSubTitle) pwaSubTitle.innerText = `Downloading: ${rounded}%`;
        
        if (pwaBtn) {
            pwaBtn.innerText = `${rounded}%`;
            pwaBtn.disabled = true;
        }

        // Popup Progress
        if (dlBarFill) dlBarFill.style.width = rounded + '%';
        if (dlCenterDesc) dlCenterDesc.innerText = `Downloading assets: ${rounded}%`;

        // When 100% real network download finishes
        if (rounded >= 100) {
            if (pwaMainTitle) pwaMainTitle.innerText = "Download Complete!";
            if (pwaSubTitle) pwaSubTitle.innerText = "Ready to install BirrGo.";
            
            if (dlCenterTitle) dlCenterTitle.innerText = "Download Complete!";
            if (dlCenterDesc) dlCenterDesc.innerText = "Tap 'Open App' to add BirrGo to your home screen.";
            if (dlCenterBtn) {
                dlCenterBtn.innerText = "Open App";
                dlCenterBtn.style.background = "#10b981";
                dlCenterBtn.disabled = false;
                
                // Clicking Open App triggers the REAL PWA installation prompt
                dlCenterBtn.onclick = async () => {
                    if (deferredPrompt) {
                        deferredPrompt.prompt();
                        const { outcome } = await deferredPrompt.userChoice;
                        if (outcome === 'accepted') {
                            localStorage.setItem('birrgo_app_installed', 'true');
                        }
                        deferredPrompt = null;
                    } else {
                        // Alert user to launch shortcut from Home Screen if already installed
                        if (dlCenterOverlay) dlCenterOverlay.style.display = 'none';
                        modalTitleText.innerText = "App Installed!";
                        modalDescText.innerText = "BirrGo is ready on your Home Screen. Look for the BirrGo icon to open the full app PWA experience.";
                        installedModal.style.display = 'flex';
                    }
                };
            }

            if (pwaBtn) {
                pwaBtn.innerText = "Open";
                pwaBtn.style.backgroundColor = "#10b981";
                pwaBtn.disabled = false;
                pwaBtn.onclick = dlCenterBtn.onclick;
            }
        }
    };

    // 2. REAL NETWORK ASSET DOWNLOAD CALCULATOR
    const downloadAssetsWithRealProgress = async () => {
        const assets = [
            './index.html',
            './index.css',
            './index.js',
            './birrgo-logo.png',
            './manifest.json'
        ];

        let loadedBytes = new Array(assets.length).fill(0);
        let totalBytes = new Array(assets.length).fill(0);

        const fetchWithProgress = (url, index) => {
            return new Promise((resolve) => {
                const xhr = new XMLHttpRequest();
                xhr.open('GET', url + '?cache_bust=' + Date.now(), true);
                xhr.responseType = 'blob';

                xhr.onprogress = (e) => {
                    if (e.lengthComputable) {
                        loadedBytes[index] = e.loaded;
                        totalBytes[index] = e.total;

                        const sumLoaded = loadedBytes.reduce((a, b) => a + b, 0);
                        const sumTotal = totalBytes.reduce((a, b) => a + b, 0);

                        if (sumTotal > 0) {
                            const percent = (sumLoaded / sumTotal) * 100;
                            updateProgressUI(percent);
                        }
                    }
                };

                xhr.onload = () => {
                    // Fallback weight if length isn't computable
                    if (!totalBytes[index]) {
                        loadedBytes[index] = 100;
                        totalBytes[index] = 100;
                    }
                    resolve();
                };

                xhr.onerror = () => resolve();
                xhr.send();
            });
        };

        // Download all files and track network progress
        await Promise.all(assets.map((asset, idx) => fetchWithProgress(asset, idx)));
        updateProgressUI(100);
    };

    // Flow Trigger
    const triggerInstallFlow = async () => {
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

        if (dlCenterOverlay) dlCenterOverlay.style.display = 'flex';
        if (dlCenterTitle) dlCenterTitle.innerText = "Installing BirrGo App...";
        if (dlCenterBtn) {
            dlCenterBtn.innerText = "Downloading Assets...";
            dlCenterBtn.style.background = "";
            dlCenterBtn.disabled = true;
        }

        if (isIOS) {
            if (dlCenterOverlay) dlCenterOverlay.style.display = 'none';
            modalIconWrapper.style.background = "#fdf2f4";
            modalIconSvg.setAttribute('stroke', '#800020');
            modalIconSvg.innerHTML = `<path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path><polyline points="16 6 12 2 8 6"></polyline><line x1="12" y1="2" x2="12" y2="15"></line>`;
            modalTitleText.innerText = "Install BirrGo PWA";
            modalDescText.innerText = "To get the real BirrGo PWA app: Tap the 'Share' icon in Safari, then tap 'Add to Home Screen'.";
            installedModal.style.display = 'flex';
            return;
        }

        // Run real network progress tracking
        downloadAssetsWithRealProgress();
    };

    // Button click behavior
    if (pwaBtn) {
        pwaBtn.addEventListener('click', () => {
            if (pwaBtn.innerText === "Open" || isPWA()) {
                if (!isPWA()) {
                    modalTitleText.innerText = "Open BirrGo App";
                    modalDescText.innerText = "Launch the BirrGo app directly from your device Home Screen shortcut.";
                    installedModal.style.display = 'flex';
                } else {
                    window.location.reload();
                }
            } else {
                triggerInstallFlow();
            }
        });
    }

    // Lock page elements in regular browser view until installed
    if (!isPWA()) {
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

    if (closeModalBtn && installedModal) {
        closeModalBtn.addEventListener('click', () => installedModal.style.display = 'none');
        installedModal.addEventListener('click', (e) => {
            if (e.target === installedModal) installedModal.style.display = 'none';
        });
    }

    window.addEventListener('appinstalled', () => {
        localStorage.setItem('birrgo_app_installed', 'true');
        deferredPrompt = null;
        if (pwaBtn) {
            pwaBtn.innerText = "Open";
            pwaBtn.style.backgroundColor = "#10b981";
        }
    });
});
