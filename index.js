document.addEventListener("DOMContentLoaded", () => {
    // 1. Register Service Worker
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./of.js')
            .then(() => console.log('Service Worker (of.js) registered successfully.'))
            .catch(err => console.error('Service Worker registration failed:', err));
    }

    const targetLogo = document.querySelector('.logo-image');
    if (targetLogo && targetLogo.complete && targetLogo.naturalWidth > 0) {
        targetLogo.classList.add('loaded');
    }

    localStorage.setItem('birrgo_last_page', 'index.html');

    const urlParams = new URLSearchParams(window.location.search);
    const refParam = urlParams.get('ref');

    if (refParam) {
        const createBtn = document.getElementById('createAccountBtn');
        if (createBtn) createBtn.href = `register.html?ref=${encodeURIComponent(refParam.trim())}`;
    }

    let deferredPrompt;
    const pwaBtn = document.getElementById('pwaInstallBtn');
    const installedModal = document.getElementById('alreadyInstalledModal');
    const closeModalBtn = document.getElementById('closeInstalledModalBtn');
    
    const modalTitleText = document.getElementById('modalTitleText');
    const modalDescText = document.getElementById('modalDescText');
    const modalIconSvg = document.getElementById('modalIconSvg');
    const modalIconWrapper = document.getElementById('modalIconWrapper');

    // Helper: Check if running inside installed PWA
    const isPWA = () => {
        return window.matchMedia('(display-mode: standalone)').matches || 
               window.navigator.standalone === true || 
               document.referrer.includes('android-app://');
    };

    const setBtnAsInstalled = () => {
        if (pwaBtn) {
            pwaBtn.innerText = "Installed";
            pwaBtn.disabled = true;
        }
    };

    if (isPWA()) {
        localStorage.setItem('birrgo_app_installed', 'true');
        setBtnAsInstalled();
    }

    if (localStorage.getItem('birrgo_app_installed') === 'true') {
        setBtnAsInstalled();
    }

    // Capture install prompt
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        localStorage.removeItem('birrgo_app_installed'); 
        if (pwaBtn) {
            pwaBtn.innerText = "Download";
            pwaBtn.disabled = false;
        }
    });

    // Helper to trigger installation modal / prompt
    const triggerInstallFlow = async () => {
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                localStorage.setItem('birrgo_app_installed', 'true');
                setBtnAsInstalled();
            }
            deferredPrompt = null;
        } else if (isIOS) {
            modalIconWrapper.style.background = "#fdf2f4";
            modalIconSvg.setAttribute('stroke', '#800020');
            modalIconSvg.innerHTML = `<path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path><polyline points="16 6 12 2 8 6"></polyline><line x1="12" y1="2" x2="12" y2="15"></line>`;
            modalTitleText.innerText = "Install BirrGo First";
            modalDescText.innerText = "To access BirrGo features, install the app on your home screen. Tap the 'Share' icon at the bottom of Safari, then select 'Add to Home Screen'.";
            installedModal.style.display = 'flex';
        } else {
            modalIconWrapper.style.background = "#fdf2f4";
            modalIconSvg.setAttribute('stroke', '#800020');
            modalIconSvg.innerHTML = `<circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line>`;
            modalTitleText.innerText = "Install BirrGo App";
            modalDescText.innerText = "Please install the BirrGo app to access this feature. Tap your browser's menu icon (⋮) and select 'Add to Home screen' or 'Install App'.";
            installedModal.style.display = 'flex';
        }
    };

    // Download/Install Button click
    if (pwaBtn) {
        pwaBtn.addEventListener('click', () => {
            if (!pwaBtn.disabled) triggerInstallFlow();
        });
    }

    // BLOCK ALL ACTION BUTTONS & LINKS IF NOT IN PWA MODE
    if (!isPWA()) {
        const actionElements = document.querySelectorAll('a, button');
        
        actionElements.forEach(element => {
            // Ignore the install button itself and modal close button
            if (element.id === 'pwaInstallBtn' || element.id === 'closeInstalledModalBtn') return;

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
        setBtnAsInstalled();
        deferredPrompt = null;
    });
});
