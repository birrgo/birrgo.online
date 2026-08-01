document.addEventListener("DOMContentLoaded", () => {
    // 1. Helper: Check if opened inside standalone PWA window
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

    // 2. Register Service Worker & Listen for Caching Events
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./of.js')
            .then(() => console.log('Service Worker (of.js) registered successfully.'))
            .catch(err => console.error('Service Worker registration failed:', err));

        // Listen for real percentage updates from of.js
        navigator.serviceWorker.addEventListener('message', (event) => {
            if (event.data && event.data.type === 'CACHE_PROGRESS') {
                updateProgressUI(event.data.progress);
            }
        });
    }

    // Logo visual load state
    const targetLogo = document.querySelector('.logo-image');
    if (targetLogo && targetLogo.complete && targetLogo.naturalWidth > 0) {
        targetLogo.classList.add('loaded');
    }

    localStorage.setItem('birrgo_last_page', 'index.html');

    // Handle referral links
    const urlParams = new URLSearchParams(window.location.search);
    const refParam = urlParams.get('ref');
    if (refParam) {
        const createBtn = document.getElementById('createAccountBtn');
        if (createBtn) createBtn.href = `register.html?ref=${encodeURIComponent(refParam.trim())}`;
    }

    // Function: Real progress UI updater for BOTH top banner and centered popup
    const updateProgressUI = (percent) => {
        const rounded = Math.round(percent);
        
        // Update Banner Progress
        if (pwaProgressTrack) pwaProgressTrack.style.display = 'block';
        if (pwaProgressFill) pwaProgressFill.style.width = rounded + '%';
        if (pwaMainTitle) pwaMainTitle.innerText = "Downloading App Assets...";
        if (pwaSubTitle) pwaSubTitle.innerText = `Downloading: ${rounded}%`;
        
        if (pwaBtn) {
            pwaBtn.innerText = `${rounded}%`;
            pwaBtn.disabled = true;
        }

        // Update Centered Modal Progress
        if (dlBarFill) dlBarFill.style.width = rounded + '%';
        if (dlCenterDesc) dlCenterDesc.innerText = `Downloading assets: ${rounded}%`;

        // When downloading reaches 100%
        if (rounded >= 100) {
            // Banner updates
            if (pwaMainTitle) pwaMainTitle.innerText = "Download Complete!";
            if (pwaSubTitle) pwaSubTitle.innerText = "Ready to launch BirrGo.";
            if (pwaBtn) {
                pwaBtn.innerText = "Open";
                pwaBtn.style.backgroundColor = "#10b981";
                pwaBtn.disabled = false;
            }

            // Centered Modal updates
            if (dlCenterTitle) dlCenterTitle.innerText = "Installation Ready!";
            if (dlCenterDesc) dlCenterDesc.innerText = "All assets loaded. Click 'Open App' to proceed.";
            if (dlCenterBtn) {
                dlCenterBtn.innerText = "Open App";
                dlCenterBtn.style.background = "#10b981";
                dlCenterBtn.disabled = false;
                dlCenterBtn.onclick = () => {
                    window.location.href = "index.html";
                };
            }

            localStorage.setItem('birrgo_app_installed', 'true');
        }
    };

    // Set UI according to mode
    if (isPWA()) {
        localStorage.setItem('birrgo_app_installed', 'true');
        if (pwaMainTitle) pwaMainTitle.innerText = "BirrGo App Ready";
        if (pwaSubTitle) pwaSubTitle.innerText = "Running in Standalone PWA";
        if (pwaBtn) {
            pwaBtn.innerText = "Open";
            pwaBtn.style.backgroundColor = "#10b981";
            pwaBtn.disabled = false;
        }
    } else if (localStorage.getItem('birrgo_app_installed') === 'true') {
        if (pwaBtn) {
            pwaBtn.innerText = "Open";
            pwaBtn.style.backgroundColor = "#10b981";
        }
    }

    // Intercept native browser installation prompt
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

    // Helper: Trigger Download / Native Prompt & Show Center Popup
    const triggerInstallFlow = async () => {
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

        // Show real-time centered popup
        if (dlCenterOverlay) dlCenterOverlay.style.display = 'flex';

        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                localStorage.setItem('birrgo_app_installed', 'true');
            }
            deferredPrompt = null;
        } else if (isIOS) {
            if (dlCenterOverlay) dlCenterOverlay.style.display = 'none';
            modalIconWrapper.style.background = "#fdf2f4";
            modalIconSvg.setAttribute('stroke', '#800020');
            modalIconSvg.innerHTML = `<path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path><polyline points="16 6 12 2 8 6"></polyline><line x1="12" y1="2" x2="12" y2="15"></line>`;
            modalTitleText.innerText = "Install BirrGo First";
            modalDescText.innerText = "To access BirrGo features, install the app on your home screen. Tap the 'Share' icon at the bottom of Safari, then select 'Add to Home Screen'.";
            installedModal.style.display = 'flex';
        }
    };

    // Download/Open Button Click behavior
    if (pwaBtn) {
        pwaBtn.addEventListener('click', () => {
            if (pwaBtn.innerText === "Open" || isPWA()) {
                if (!isPWA()) {
                    modalTitleText.innerText = "Open BirrGo App";
                    modalDescText.innerText = "Launch the BirrGo application icon from your device's home screen to access your wallet.";
                    installedModal.style.display = 'flex';
                } else {
                    window.location.reload();
                }
            } else {
                triggerInstallFlow();
            }
        });
    }

    // 3. LOCK OUT LINKS/BUTTONS WHEN IN NORMAL BROWSER MODE
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
