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

    // Service Worker Registration
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./of.js')
            .then(() => console.log('Service Worker registered.'))
            .catch(err => console.error('Service Worker registration failed:', err));
    }

    // Helper: Style top button as Installed (White background, burgundy text)
    const setBtnInstalledState = (text = "Installed") => {
        if (!pwaBtn) return;
        pwaBtn.innerText = text;
        pwaBtn.style.backgroundColor = "#ffffff";
        pwaBtn.style.color = "#800020";
        pwaBtn.style.fontWeight = "800";
        pwaBtn.style.border = "1px solid #ffffff";
        pwaBtn.disabled = false;
    };

    // Initial state check
    if (isPWA() || localStorage.getItem('birrgo_app_installed') === 'true') {
        setBtnInstalledState("Open");
    } else {
        if (pwaBtn) {
            pwaBtn.innerText = "Install";
            pwaBtn.style.backgroundColor = "";
            pwaBtn.style.color = "";
            pwaBtn.disabled = false;
        }
    }

    // Capture Native Browser PWA Install Prompt
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        if (!isPWA() && localStorage.getItem('birrgo_app_installed') !== 'true') {
            if (pwaBtn) {
                pwaBtn.innerText = "Install";
                pwaBtn.style.backgroundColor = "";
                pwaBtn.style.color = "";
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

    // Update Progress UI Function based on Real Bytes
    const updateProgressUI = (percent) => {
        const rounded = Math.min(100, Math.round(percent));

        // Banner Progress
        if (pwaProgressTrack) pwaProgressTrack.style.display = 'block';
        if (pwaProgressFill) pwaProgressFill.style.width = rounded + '%';
        if (pwaMainTitle) pwaMainTitle.innerText = "Downloading Assets...";
        if (pwaSubTitle) pwaSubTitle.innerText = `Downloaded: ${rounded}%`;
        
        if (pwaBtn) {
            pwaBtn.innerText = `${rounded}%`;
            pwaBtn.style.backgroundColor = "";
            pwaBtn.style.color = "";
            pwaBtn.disabled = true;
        }

        // Popup Progress
        if (dlBarFill) dlBarFill.style.width = rounded + '%';
        if (dlCenterDesc) dlCenterDesc.innerText = `Downloading assets: ${rounded}%`;

        // When 100% real network download finishes
        if (rounded >= 100) {
            if (pwaMainTitle) pwaMainTitle.innerText = "Download Complete!";
            if (pwaSubTitle) pwaSubTitle.innerText = "Installing BirrGo App...";
            
            if (dlCenterTitle) dlCenterTitle.innerText = "Ready to Install";
            if (dlCenterDesc) dlCenterDesc.innerText = "Tap 'Install App' to add BirrGo to your home screen.";
            
            if (dlCenterBtn) {
                dlCenterBtn.innerText = "Install App";
                dlCenterBtn.style.background = "linear-gradient(135deg, #800020 0%, #4a0012 100%)";
                dlCenterBtn.disabled = false;
                
                // Clicking triggers Chrome's native OS Installation Prompt
                dlCenterBtn.onclick = async () => {
                    if (dlCenterOverlay) dlCenterOverlay.style.display = 'none';
                    
                    if (deferredPrompt) {
                        deferredPrompt.prompt();
                        const { outcome } = await deferredPrompt.userChoice;
                        if (outcome === 'accepted') {
                            localStorage.setItem('birrgo_app_installed', 'true');
                            setBtnInstalledState("Installed");
                        }
                        deferredPrompt = null;
                    } else {
                        modalTitleText.innerText = "App Ready";
                        modalDescText.innerText = "Look for the BirrGo icon on your home screen or check browser menu to finish installation.";
                        installedModal.style.display = 'flex';
                    }
                };
            }

            // Top Banner Button Turns White with "Installed"
            if (pwaBtn) {
                setBtnInstalledState("Installed");
                pwaBtn.onclick = dlCenterBtn.onclick;
            }
        }
    };

    // Real Byte Download Progress Calculator using XMLHttpRequest
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

        // Download files and track network speed
        await Promise.all(assets.map((asset, idx) => fetchWithProgress(asset, idx)));
        updateProgressUI(100);
    };

    // Flow Trigger on Install action
    const triggerInstallFlow = async () => {
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

        if (dlCenterOverlay) dlCenterOverlay.style.display = 'flex';
        if (dlCenterTitle) dlCenterTitle.innerText = "Downloading BirrGo...";
        if (dlCenterBtn) {
            dlCenterBtn.innerText = "Downloading Assets...";
            dlCenterBtn.style.background = "";
            dlCenterBtn.disabled = true;
        }

        // Start actual network progress calculation
        downloadAssetsWithRealProgress();
    };

    // Install Button Listener
    if (pwaBtn) {
        pwaBtn.addEventListener('click', () => {
            if (isPWA()) {
                window.location.reload();
            } else {
                triggerInstallFlow();
            }
        });
    }

    // Intercept clicks for uninstalled web app visitors
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

    // Modal Close
    if (closeModalBtn && installedModal) {
        closeModalBtn.addEventListener('click', () => installedModal.style.display = 'none');
        installedModal.addEventListener('click', (e) => {
            if (e.target === installedModal) installedModal.style.display = 'none';
        });
    }

    // Listen for OS App Installed event
    window.addEventListener('appinstalled', () => {
        localStorage.setItem('birrgo_app_installed', 'true');
        deferredPrompt = null;
        if (dlCenterOverlay) dlCenterOverlay.style.display = 'none';
        if (pwaMainTitle) pwaMainTitle.innerText = "BirrGo App Installed";
        if (pwaSubTitle) pwaSubTitle.innerText = "Open app from your Home Screen";
        setBtnInstalledState("Installed");
    });
});
