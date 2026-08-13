// 1. Import ONLY the initialized db instance from your local config
import { db } from "./db.js";

// 2. Import ALL database utility functions from the exact same Firebase CDN link
import { 
    ref, 
    get, 
    set, 
    runTransaction, 
    push,
    query, 
    orderByChild, 
    equalTo 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

// Alphabetically ordered list of 23 countries with exact max digit lengths
const countries = [
    { name: "Australia", code: "+61", flag: "🇦🇺", maxLen: 9 },
    { name: "Bahrain", code: "+973", flag: "🇧🇭", maxLen: 8 },
    { name: "Canada", code: "+1", flag: "🇨🇦", maxLen: 10 },
    { name: "Djibouti", code: "+253", flag: "🇩🇯", maxLen: 8 },
    { name: "Egypt", code: "+20", flag: "🇪🇬", maxLen: 10 },
    { name: "Eritrea", code: "+291", flag: "🇪🇷", maxLen: 7 },
    { name: "Ethiopia", code: "+251", flag: "🇪🇹", maxLen: 9 },
    { name: "France", code: "+33", flag: "🇫🇷", maxLen: 9 },
    { name: "Germany", code: "+49", flag: "🇩🇪", maxLen: 11 },
    { name: "Israel", code: "+972", flag: "🇮🇱", maxLen: 9 },
    { name: "Italy", code: "+39", flag: "🇮🇹", maxLen: 10 },
    { name: "Jordan", code: "+962", flag: "🇯🇴", maxLen: 9 },
    { name: "Kenya", code: "+254", flag: "🇰🇪", maxLen: 9 },
    { name: "Kuwait", code: "+965", flag: "🇰🇼", maxLen: 8 },
    { name: "Oman", code: "+968", flag: "🇴🇲", maxLen: 8 },
    { name: "Saudi Arabia", code: "+966", flag: "🇸🇦", maxLen: 9 },
    { name: "Somalia", code: "+252", flag: "🇸🇴", maxLen: 9 },
    { name: "South Africa", code: "+27", flag: "🇿🇦", maxLen: 9 },
    { name: "Sudan", code: "+249", flag: "🇸🇩", maxLen: 9 },
    { name: "Turkey", code: "+90", flag: "🇹🇷", maxLen: 10 },
    { name: "United Arab Emirates", code: "+971", flag: "🇦🇪", maxLen: 9 },
    { name: "United Kingdom", code: "+44", flag: "🇬🇧", maxLen: 10 },
    { name: "United States", code: "+1", flag: "🇺🇸", maxLen: 10 }
];

let activeSelectedPrefix = "+251";
let activeMaxPhoneLength = 9;

const overlay = document.getElementById('countryModalOverlay');
const listScrollContainer = document.getElementById('countryListScroll');
const searchInput = document.getElementById('modalSearchInput');

let signupPayload = {};
let countdownTimer;

/* ==========================================================================
   PWA INSTALLATION EVENT HANDLER
   ========================================================================== */
let deferredPrompt = null;

window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent Chrome from automatically showing the standard banner
    e.preventDefault();
    // Stash the event so it can be triggered later
    deferredPrompt = e;
});

function sanitizeEmail(email) {
    return email.toLowerCase().replace(/\./g, '_').replace(/@/g, '_at_');
}

async function hashPin(pin) {
    const encoder = new TextEncoder();
    const data = encoder.encode(pin);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function isStrongPin(pin) {
    if (!/^\d{6}$/.test(pin)) return false;
    if (/^(\d)\1{5}$/.test(pin)) return false;

    const sequentialAscending = "0123456789";
    const sequentialDescending = "9876543210";
    if (sequentialAscending.includes(pin) || sequentialDescending.includes(pin)) return false;

    if (pin.slice(0, 2).repeat(3) === pin || pin.slice(0, 3).repeat(2) === pin) return false;

    return true;
}

function populateCountries(filterText = "") {
    listScrollContainer.innerHTML = "";
    const cleanFilter = filterText.toLowerCase().trim();
    
    const filtered = countries.filter(c => 
        c.name.toLowerCase().includes(cleanFilter) || 
        c.code.includes(cleanFilter)
    );

    filtered.forEach(country => {
        const row = document.createElement('div');
        row.className = 'country-item';
        row.innerHTML = `
            <span class="item-flag">${country.flag}</span>
            <span class="item-name">${country.name}</span>
            <span class="item-code">${country.code}</span>
        `;
        row.addEventListener('click', () => {
            document.getElementById('currentFlag').innerText = country.flag;
            document.getElementById('currentCode').innerText = country.code;
            activeSelectedPrefix = country.code;
            activeMaxPhoneLength = country.maxLen;

            const phoneInput = document.getElementById('regPhone');
            phoneInput.maxLength = activeMaxPhoneLength;
            if (phoneInput.value.length > activeMaxPhoneLength) {
                phoneInput.value = phoneInput.value.slice(0, activeMaxPhoneLength);
            }

            closeCountryModal();
        });
        listScrollContainer.appendChild(row);
    });
}

function openCountryModal() {
    populateCountries();
    searchInput.value = "";
    overlay.classList.add('active');
}

function closeCountryModal() {
    overlay.classList.remove('active');
}

document.getElementById('countryTriggerBtn').addEventListener('click', openCountryModal);
overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeCountryModal();
});
searchInput.addEventListener('input', (e) => {
    populateCountries(e.target.value);
});

/* ==========================================================================
   PIN EYE VISIBILITY TOGGLE & STRENGTH CHECKER LOGIC
   ========================================================================== */
function setupPinToggle(btnId, inputId) {
    const btn = document.getElementById(btnId);
    const input = document.getElementById(inputId);

    if (!btn || !input) return;

    const eyeOpenSVG = `
        <svg class="eye-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
            <circle cx="12" cy="12" r="3"></circle>
        </svg>`;
    
    const eyeClosedSVG = `
        <svg class="eye-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
            <line x1="1" y1="1" x2="23" y2="23"></line>
        </svg>`;

    btn.addEventListener('click', (e) => {
        e.preventDefault(); 
        const isPassword = input.type === 'password';
        input.type = isPassword ? 'text' : 'password';
        btn.innerHTML = isPassword ? eyeClosedSVG : eyeOpenSVG;
    });
}

function initPinFeedback() {
    const regPinInput = document.getElementById('regPin');
    const regConfirmPinInput = document.getElementById('regConfirmPin');
    const pinFeedback = document.getElementById('pinFeedback');
    const confirmPinFeedback = document.getElementById('confirmPinFeedback');

    if (!regPinInput || !regConfirmPinInput) return;

    regPinInput.addEventListener('input', (e) => {
        const pin = e.target.value;
        if (pin.length === 6) {
            const valid = isStrongPin(pin);
            pinFeedback.innerText = valid ? "✓ Strong PIN" : "⚠️ Avoid simple (123456) or repeating (111111) digits";
            pinFeedback.style.color = valid ? "#065f46" : "#800020";
        } else {
            pinFeedback.innerText = "";
        }
    });

    regConfirmPinInput.addEventListener('input', () => {
        if (regConfirmPinInput.value.length === 6) {
            if (regConfirmPinInput.value === regPinInput.value) {
                confirmPinFeedback.innerText = "✓ PINs match";
                confirmPinFeedback.style.color = "#065f46";
            } else {
                confirmPinFeedback.innerText = "⚠️ PINs do not match";
                confirmPinFeedback.style.color = "#800020";
            }
        } else {
            confirmPinFeedback.innerText = "";
        }
    });
}

let referrerAccountId = "";
document.addEventListener('DOMContentLoaded', () => {
    localStorage.setItem('birrgo_last_page', 'register.html');

    // Attach eye button listeners safely
    setupPinToggle('toggleRegPin', 'regPin');
    setupPinToggle('toggleRegConfirmPin', 'regConfirmPin');
    initPinFeedback();

    const urlParams = new URLSearchParams(window.location.search);
    const refParam = urlParams.get('ref');
    if (refParam) {
        referrerAccountId = refParam.trim();
        if (referrerAccountId) {
            document.getElementById('referrer-label').innerHTML = `Invited by User: <span style="color:var(--primary-burgundy);font-weight:700;">${referrerAccountId}</span>`;
        }
    }

    const phoneInput = document.getElementById('regPhone');
    phoneInput.maxLength = activeMaxPhoneLength;
});

document.getElementById('regPhone').addEventListener('input', (e) => {
    let cleanVal = e.target.value.replace(/[^0-9]/g, '').replace(/^0+/, '');
    if (cleanVal.length > activeMaxPhoneLength) {
        cleanVal = cleanVal.slice(0, activeMaxPhoneLength);
    }
    e.target.value = cleanVal;
});

function showNotification(message, isSuccess = false) {
    const toast = document.getElementById('toast-message');
    toast.innerText = message;
    toast.style.background = isSuccess ? 'rgba(16, 185, 129, 0.95)' : 'rgba(223, 34, 34, 0.95)';
    toast.style.display = 'block';
    setTimeout(() => { toast.style.display = 'none'; }, 3500);
}

document.getElementById('navBackBtn').addEventListener('click', () => {
    const signupForm = document.getElementById('signupForm');
    const otpView = document.getElementById('otpView');
    const pwaView = document.getElementById('pwaInstallView');
    
    if (pwaView && pwaView.style.display === 'flex') {
        window.location.href = "dashboard.html";
    } else if (otpView.style.display === 'flex') {
        otpView.style.display = 'none';
        signupForm.style.display = 'flex';
        
        document.getElementById('stepDot1').className = 'step-dot-active';
        document.getElementById('stepDot2').className = 'step-dot';
        document.getElementById('screen-title').innerText = "Create Your Account";
        
        clearInterval(countdownTimer);
    } else {
        window.location.href = "index.html"; 
    }
});

const otpInputs = document.querySelectorAll('.otp-input');
otpInputs.forEach((input, index) => {
    input.addEventListener('input', (e) => {
        e.target.value = e.target.value.replace(/[^0-9]/g, '');
        if (e.target.value.length === 1 && index < otpInputs.length - 1) {
            otpInputs[index + 1].focus();
        }
    });

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' && !input.value && index > 0) {
            otpInputs[index - 1].focus();
        }
    });
});

async function sendVerificationOtp(email) {
    try {
        const backendUrl = 'https://birrgo-otp-backend.onrender.com/send-otp'; 

        const response = await fetch(backendUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email: email.toLowerCase() })
        }).catch(() => {
            throw new Error("Unable to contact verification servers. Check your connection.");
        });

        if (response.ok) {
            showNotification(`Verification code sent successfully to ${email}`, true);
            startCountdown();
        } else {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `Server Error (${response.status})`);
        }

    } catch (error) {
        console.error("OTP Delivery Exception:", error);
        showNotification(`Email Dispatch Error: ${error.message}`);
    }
}

function startCountdown() {
    const resendBtn = document.getElementById('resendCodeBtn');
    resendBtn.classList.add('disabled');
    let timer = 30;
    
    clearInterval(countdownTimer);
    countdownTimer = setInterval(() => {
        timer--;
        resendBtn.innerText = `Resend in (${timer}s)`;
        if (timer <= 0) {
            clearInterval(countdownTimer);
            resendBtn.innerText = "Resend Code";
            resendBtn.classList.remove('disabled');
        }
    }, 1000);
}

document.getElementById('resendCodeBtn').addEventListener('click', function() {
    if (!this.classList.contains('disabled')) {
        sendVerificationOtp(signupPayload.email);
    }
});

document.getElementById('signupForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const submitBtn = document.getElementById('submitBtn');
    const rawPhone = document.getElementById('regPhone').value.trim();
    
    const firstName = document.getElementById('regFirstName').value.trim();
    const middleName = document.getElementById('regMiddleName').value.trim();
    const lastName = document.getElementById('regLastName').value.trim();

    const email = document.getElementById('regEmail').value.trim().toLowerCase(); 
    const pin = document.getElementById('regPin').value;
    const confirmPin = document.getElementById('regConfirmPin').value;

    let cleanPhone = rawPhone.replace(/^0+/, '');
    
    if (cleanPhone.length !== activeMaxPhoneLength) {
        showNotification(`Please enter a valid ${activeMaxPhoneLength}-digit phone number for the selected country.`);
        return;
    }

    if (!firstName || !middleName || !lastName) {
        showNotification("Please enter all 3 names: First, Middle, and Last name.");
        return;
    }

    const fullName = `${firstName} ${middleName} ${lastName}`;

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
        showNotification("Please enter a valid email address.");
        return;
    }

    if (!isStrongPin(pin)) {
        showNotification("Weak PIN code. Avoid simple sequences (123456) or repeating numbers (000000, 121212).");
        return;
    }

    if (pin !== confirmPin) {
        showNotification("PIN configurations do not match.");
        return;
    }

    try {
        submitBtn.disabled = true;
        submitBtn.innerText = "Checking Availability...";

        const userSnapshot = await get(ref(db, 'users/' + cleanPhone));

        if (userSnapshot.exists()) {
            showNotification("An account already exists with this phone number.");
            submitBtn.disabled = false;
            submitBtn.innerText = "Continue to Verification";
            return;
        }

        const usersRef = ref(db, 'users');
        const emailQuery = query(usersRef, orderByChild('emailAddress'), equalTo(email));
        const emailSnapshot = await get(emailQuery);

        if (emailSnapshot.exists()) {
            showNotification("This email address is already in use by another account.");
            submitBtn.disabled = false;
            submitBtn.innerText = "Continue to Verification";
            return;
        }

        const sanitizedEmailKey = sanitizeEmail(email);
        const otpVerifySnapshot = await get(ref(db, `otps/${sanitizedEmailKey}`));
        
        if (otpVerifySnapshot.exists() && otpVerifySnapshot.val().verified === true) {
            showNotification("This email has already been verified and used.");
            submitBtn.disabled = false;
            submitBtn.innerText = "Continue to Verification";
            return;
        }

        const encryptedPin = await hashPin(pin);

        signupPayload = {
            cleanPhone,
            fullName,
            email, 
            pin: encryptedPin,
            firstNameOnly: firstName,
            formatGlobalPhone: activeSelectedPrefix + cleanPhone
        };

        document.getElementById('signupForm').style.display = 'none';
        document.getElementById('otpView').style.display = 'flex';
        
        document.getElementById('stepDot1').className = 'step-dot';
        document.getElementById('stepDot2').className = 'step-dot-active';
        document.getElementById('screen-title').innerText = "Verify Your Email";
        document.getElementById('referrer-label').innerHTML = `Enter the 6-digit code sent to <strong style="color:var(--primary-burgundy);">${email}</strong>`;

        await sendVerificationOtp(email);

    } catch (error) {
        console.error("Firebase lookup failure: ", error);
        showNotification(`Database Error: ${error.message || 'Check network connection'}`);
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerText = "Continue to Verification";
    }
});

/* ==========================================================================
   APP DOWNLOAD PROMPT VIEW LOGIC
   ========================================================================== */
function showPwaDownloadPrompt() {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;

    // If user is already running inside installed PWA, redirect immediately
    if (isStandalone) {
        window.location.href = "dashboard.html";
        return;
    }

    // Hide OTP view and display PWA installation screen
    document.getElementById('otpView').style.display = 'none';
    
    let pwaView = document.getElementById('pwaInstallView');
    if (!pwaView) {
        pwaView = document.createElement('div');
        pwaView.id = 'pwaInstallView';
        pwaView.className = 'pwa-prompt-container';
        pwaView.style.cssText = 'display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 24px; text-align: center; height: 100%;';
        pwaView.innerHTML = `
            <div style="background: #f0fdf4; border: 2px solid #10b981; border-radius: 50%; padding: 16px; margin-bottom: 20px;">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
            </div>
            <h2 style="margin-bottom: 8px; color: #111827;">Account Created!</h2>
            <p style="color: #4b5563; font-size: 14px; margin-bottom: 24px;">
                For the best mobile experience, faster access, and secure transactions, download and install the official app to your phone.
            </p>
            <button id="downloadAppBtn" class="primary-btn" style="width: 100%; padding: 14px; background: var(--primary-burgundy, #800020); color: #fff; border: none; border-radius: 8px; font-weight: 600; font-size: 16px; cursor: pointer; margin-bottom: 12px;">
                📱 Download & Install App
            </button>
            <button id="continueWebBtn" style="width: 100%; padding: 12px; background: transparent; color: #6b7280; border: 1px solid #d1d5db; border-radius: 8px; font-weight: 500; font-size: 14px; cursor: pointer;">
                Continue in Browser
            </button>
        `;
        document.querySelector('.container') ? document.querySelector('.container').appendChild(pwaView) : document.body.appendChild(pwaView);
    } else {
        pwaView.style.display = 'flex';
    }

    document.getElementById('screen-title').innerText = "Get the App";

    // Handle App Installation Button Click
    document.getElementById('downloadAppBtn').onclick = async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            deferredPrompt = null;
            if (outcome === 'accepted') {
                showNotification("Thank you for installing! Redirecting...", true);
                setTimeout(() => { window.location.href = "dashboard.html"; }, 1500);
            } else {
                window.location.href = "dashboard.html";
            }
        } else {
            // Chrome manual add to home screen instructions or fallback redirect
            showNotification("To install: Tap browser menu (⋮) -> 'Add to Home screen'", true);
            setTimeout(() => { window.location.href = "dashboard.html"; }, 3000);
        }
    };

    // Handle Web Fallback Button Click
    document.getElementById('continueWebBtn').onclick = () => {
        window.location.href = "dashboard.html";
    };
}

document.getElementById('verifyOtpBtn').addEventListener('click', async () => {
    let enteredOtp = "";
    otpInputs.forEach(input => enteredOtp += input.value);

    if (enteredOtp.length !== 6) {
        showNotification("Please enter all 6 digits of the OTP.");
        return;
    }

    const verifyOtpBtn = document.getElementById('verifyOtpBtn');
    const sanitizedEmailKey = sanitizeEmail(signupPayload.email);

    try {
        verifyOtpBtn.disabled = true;
        verifyOtpBtn.innerText = "Verifying...";

        const otpSnapshot = await get(ref(db, `otps/${sanitizedEmailKey}`));

        if (!otpSnapshot.exists()) {
            showNotification("Verification details expired. Resend code.");
            verifyOtpBtn.disabled = false;
            verifyOtpBtn.innerText = "Verify OTP & Create Account";
            return;
        }

        const dbOtpRecord = otpSnapshot.val();
        const currentTime = Date.now();
        if (currentTime > dbOtpRecord.expiresAt) {
            showNotification("This code has expired (15 min limit). Please request a new one.");
            verifyOtpBtn.disabled = false;
            verifyOtpBtn.innerText = "Verify OTP & Create Account";
            return;
        }

        if (enteredOtp !== dbOtpRecord.otp) {
            showNotification("Incorrect verification code. Try again.");
            verifyOtpBtn.disabled = false;
            verifyOtpBtn.innerText = "Verify OTP & Create Account";
            return;
        }

        verifyOtpBtn.innerText = "Creating Account...";

        const cleanPhone = signupPayload.cleanPhone;
        const final6Reversed = cleanPhone.slice(-6).split('').reverse().join('');
        const computedCardNumber = cleanPhone + final6Reversed;

        let finalizedUserNumber = 1000; 
        try {
            const globalCounterRef = ref(db, 'new/globalUserCounter');
            const txResult = await runTransaction(globalCounterRef, (currentValue) => {
                let parsedValue = parseInt(currentValue);
                if (isNaN(parsedValue) || parsedValue < 1000) {
                    return 1001;
                }
                return parsedValue + 1;
            });
            if (txResult.committed) {
                finalizedUserNumber = txResult.snapshot.val() - 1;
            }
        } catch (counterErr) {
            console.error("Counter fallback logic run.", counterErr);
        }

        const userPayload = {
            phoneNumber: signupPayload.formatGlobalPhone,
            localPhoneRef: cleanPhone,
            emailAddress: signupPayload.email,
            firstName: signupPayload.firstNameOnly,
            fullName: signupPayload.fullName,
            securityPin: signupPayload.pin,
            walletBalance: 0.00,
            userNumber: finalizedUserNumber,
            accountId: "BG-" + finalizedUserNumber, 
            cardNumber: computedCardNumber, 
            createdAt: new Date().toISOString()
        };

        await set(ref(db, 'users/' + cleanPhone), userPayload);

        if (referrerAccountId) {
            try {
                const usersRef = ref(db, 'users');
                const referralQuery = query(usersRef, orderByChild('accountId'), equalTo(referrerAccountId));
                const querySnapshot = await get(referralQuery);

                if (querySnapshot.exists()) {
                    let inviterPhoneNode = "";
                    
                    querySnapshot.forEach((child) => {
                        inviterPhoneNode = child.key; 
                    });

                    if (inviterPhoneNode && inviterPhoneNode !== cleanPhone) {
                        const inviterBalanceRef = ref(db, `users/${inviterPhoneNode}/walletBalance`);
                        const inviterTxRef = ref(db, `users/${inviterPhoneNode}/transactions`);
                        const referredHistoryRef = ref(db, `users/${inviterPhoneNode}/referredUsers`);
                        
                        const fixedBonus = 50.00; 

                        await runTransaction(inviterBalanceRef, (currentBalance) => {
                            let parsedBalance = parseFloat(currentBalance);
                            if (isNaN(parsedBalance)) parsedBalance = 0;
                            return parsedBalance + fixedBonus;
                        });

                        const now = new Date();
                        const walletFormattedTime = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ', ' + 
                                                   now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

                        const newTxNode = push(inviterTxRef);
                        await set(newTxNode, {
                            title: `Referral Bonus (${signupPayload.firstNameOnly})`,
                            amount: fixedBonus,
                            type: "income",
                            timestamp: walletFormattedTime
                        });

                        const historyLogNode = push(referredHistoryRef);
                        await set(historyLogNode, {
                            fullName: signupPayload.fullName,
                            phone: cleanPhone,
                            timestamp: walletFormattedTime
                        });
                    }
                }
            } catch (referralError) {
                console.error("Referral Engine Error: ", referralError);
            }
        }

        await set(ref(db, `otps/${sanitizedEmailKey}/verified`), true);

        showNotification("Account verified & created successfully!", true);
        localStorage.setItem('auth_session_phone', cleanPhone);
        localStorage.setItem('birrgo_last_page', 'dashboard.html');

        // Instead of immediate redirect to dashboard.html, offer PWA installation
        setTimeout(() => {
            showPwaDownloadPrompt();
        }, 1200);

    } catch (error) {
        console.error("Database Write Error: ", error);
        showNotification(`Database error: ${error.message || 'Check network connection'}`);
        verifyOtpBtn.disabled = false;
        verifyOtpBtn.innerText = "Verify OTP & Create Account";
    }
});
