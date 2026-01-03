// Initialize Firebase
if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const provider = new firebase.auth.GoogleAuthProvider();

// --- DOM ELEMENTS ---
const loginBtn = document.getElementById('login-btn');
const loginBtn2 = document.getElementById('login-btn-mob');
const userInfo = document.getElementById('user-info');
const userPic = document.getElementById('user-pic');
const dropdownName = document.getElementById('dropdown-name');
const profileDropdown = document.getElementById('profile-dropdown');
const logoutAction = document.getElementById('logout-action');
const nav_expand_btn = document.getElementById("nav-expand-btn");
const mobMenuWin = document.getElementById("mobMenuWin");

//   NEW: Guest About Elements
const navAboutBtn = document.getElementById('nav-about-btn');
const navAboutBtn2 = document.getElementById('nav-about-btn-mob');
const guestAboutModal = document.getElementById('guest-about-modal');
const closeAboutModal = document.getElementById('close-about-modal');


// Nav Buttons
const menuSettingsBtn = document.getElementById('menu-settings-btn');
const savedCardsBtn = document.getElementById('saved-cards-btn');
const learningHistoryBtn = document.getElementById('learning-history-btn');

// Guest Elements
const guestCounter = document.getElementById('guest-counter');
const guestCounter2 = document.getElementById('guest-counter-mob');

// Main App Elements
const topicInput = document.getElementById('topicInput');
const searchBtn = document.getElementById('search-btn');
const cardsContainer = document.getElementById('cards-container');
const loading = document.getElementById('loading');
const appLoader = document.getElementById('app-loader');

// Settings Elements
const tuneBtn = document.getElementById('tune-btn');
const settingsPanel = document.getElementById('settings-panel');
const closePanelBtn = document.getElementById('close-panel');
const languageSelect = document.getElementById('language');
const styleSelect = document.getElementById('style');
const personaSelect = document.getElementById('persona');
const detailLevelSelect = document.getElementById('detailLevel');
const cardCountToggle = document.getElementById('cardCountToggle');

let currentUser = null;
let isLoggingOut = false; //   NEW: Flag to prevent flicker

// --- APP LOADER & AUTH STATE ---
const startTime = Date.now();
const MIN_LOAD_TIME = 500;

auth.onAuthStateChanged(async (user) => {
    //Do not change UI if logged out
    if (isLoggingOut) return;

    // Update Global User
    currentUser = user;
    updateUIForUser(user);

    // Real-time Concept Counter
    if (user) {
        db.collection('users').doc(user.uid).onSnapshot((doc) => {
            const countDisplay = document.getElementById('concepts-count');
            if (countDisplay) {
                if (doc.exists) {
                    const data = doc.data();
                    countDisplay.innerText = data.conceptsLearned || 0;
                } else {
                    countDisplay.innerText = 0;
                }
            }
        });
        nav_expand_btn.style.display = 'none';
        mobMenuWin.style.height = "0rem";
    } else {
        const countDisplay = document.getElementById('concepts-count');
        if (countDisplay) countDisplay.innerText = 0;
        checkGuestLimit();
    }

    // Remove Splash Screen
    const currentTime = Date.now();
    const timeSpent = currentTime - startTime;
    const waitTime = Math.max(0, MIN_LOAD_TIME - timeSpent);

    setTimeout(() => {
        if (appLoader) {
            appLoader.style.opacity = '0';
            setTimeout(() => { appLoader.style.display = 'none'; }, 500);
        }
    }, waitTime);
});

// --- AUTH FUNCTIONS & UI UPDATES ---

function updateUIForUser(user) {
    if (user) {
        // LOGGED IN STATE
        if (loginBtn) loginBtn.style.display = 'none';
        if (loginBtn2) loginBtn2.style.display = 'none';
        if (userInfo) userInfo.style.display = 'flex';
        if (guestCounter) guestCounter.style.display = 'none';
        if (guestCounter2) guestCounter2.style.display = 'none';
        // Hide Guest About Button (Available in Settings)
        if (navAboutBtn) navAboutBtn.style.display = 'none';
        if (navAboutBtn2) navAboutBtn2.style.display = 'none';
        if (userPic) userPic.src = user.photoURL || "assets/default-user.png";
        if (dropdownName) { dropdownName.innerText = "Hi, " + user.displayName || "Student"; dropdownName.style.display = "block"; }

    } else {
        // GUEST STATE
        if (loginBtn) loginBtn.style.display = 'block';
        if (loginBtn2) loginBtn2.style.display = 'block';
        if (userInfo) userInfo.style.display = 'none';
        if (guestCounter) guestCounter.style.display = 'inline-block';
        if (guestCounter2) guestCounter2.style.display = 'inline-block';
        // Show Guest About Button
        if (navAboutBtn) navAboutBtn.style.display = 'block';
        if (navAboutBtn2) navAboutBtn2.style.display = 'block';
    }
}

// Login Click
if (loginBtn) {
    loginBtn.addEventListener('click', () => {
        auth.signInWithPopup(provider).catch((error) => {
            UniAlert("Login failed: " + error.message, "OK");
        });
    });
}
if (loginBtn2) {
    loginBtn2.addEventListener('click', () => {
        auth.signInWithPopup(provider).catch((error) => {
            UniAlert("Login failed: " + error.message, "OK");
        });
    });
}

// Logout Click
if (logoutAction) {
    logoutAction.addEventListener('click', () => {
        isLoggingOut = true;

        auth.signOut().then(() => {
            if (profileDropdown) profileDropdown.classList.add('hidden');
            window.location.reload();
        });
    });
}

// GUEST ABOUT MODAL LOGIC
if (navAboutBtn && guestAboutModal) {
    navAboutBtn.addEventListener('click', () => {
        guestAboutModal.classList.remove('hidden');
    });
}
if (navAboutBtn2 && guestAboutModal) {
    navAboutBtn2.addEventListener('click', () => {
        guestAboutModal.classList.remove('hidden');
    });
}
if (closeAboutModal) {
    closeAboutModal.addEventListener('click', () => {
        guestAboutModal.classList.add('hidden');
    });
}
// Close if clicked outside
window.addEventListener('click', (e) => {
    if (guestAboutModal && e.target === guestAboutModal) {
        guestAboutModal.classList.add('hidden');
    }
});


// Guest Limit Checker
async function checkGuestLimit() {
    try {
        const response = await fetch('/api/guest-status');
        const data = await response.json();
        if (data && guestCounter) {
            guestCounter.innerText = `Free: ${data.remaining}/10`;
            if (data.remaining === 0) {
                guestCounter.style.color = "red";
            }
        }
        if (data && guestCounter2) {
            guestCounter2.innerText = `Free: ${data.remaining}/10`;
            if (data.remaining === 0) {
                guestCounter2.style.color = "red";
            }
        }
    } catch (error) {
        console.error("Guest check error:", error);
    }
}

// ---  PREFERENCES (Settings) ---

function loadUserPreferences() {
    const savedPrefs = localStorage.getItem('conceptDost_prefs');
    if (savedPrefs) {
        const prefs = JSON.parse(savedPrefs);
        if (prefs.language && languageSelect) languageSelect.value = prefs.language;
        if (prefs.style && styleSelect) styleSelect.value = prefs.style;
        if (prefs.persona && personaSelect) personaSelect.value = prefs.persona;
        if (prefs.detailLevel && detailLevelSelect) detailLevelSelect.value = prefs.detailLevel;
        if (prefs.cardLimit !== undefined && cardCountToggle) cardCountToggle.checked = (prefs.cardLimit === 6);
    }
}
loadUserPreferences();

function saveUserPreferences() {
    const preferences = {
        language: languageSelect ? languageSelect.value : "English",
        style: styleSelect ? styleSelect.value : "Simple",
        persona: personaSelect ? personaSelect.value : "Friendly Tutor",
        detailLevel: detailLevelSelect ? detailLevelSelect.value : "medium",
        cardLimit: cardCountToggle ? (cardCountToggle.checked ? 6 : 4) : 4
    };
    localStorage.setItem('conceptDost_prefs', JSON.stringify(preferences));
}

if (languageSelect) languageSelect.addEventListener('change', saveUserPreferences);
if (styleSelect) styleSelect.addEventListener('change', saveUserPreferences);
if (personaSelect) personaSelect.addEventListener('change', saveUserPreferences);
if (detailLevelSelect) detailLevelSelect.addEventListener('change', saveUserPreferences);
if (cardCountToggle) cardCountToggle.addEventListener('change', saveUserPreferences);

// --- UI TOGGLES ---

if (tuneBtn) {
    tuneBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        settingsPanel.classList.toggle('hidden');
        if (profileDropdown) profileDropdown.classList.add('hidden');
    });
}
if (settingsPanel) settingsPanel.addEventListener('click', (e) => e.stopPropagation());
if (closePanelBtn) closePanelBtn.addEventListener('click', () => settingsPanel.classList.add('hidden'));

if (userPic) {
    userPic.addEventListener('click', (e) => {
        e.stopPropagation();
        if (profileDropdown) profileDropdown.classList.toggle('hidden');
        if (settingsPanel) settingsPanel.classList.add('hidden');
    });
}
if (profileDropdown) profileDropdown.addEventListener('click', (e) => e.stopPropagation());

window.addEventListener('click', () => {
    if (settingsPanel && !settingsPanel.classList.contains('hidden')) settingsPanel.classList.add('hidden');
    if (profileDropdown && !profileDropdown.classList.contains('hidden')) profileDropdown.classList.add('hidden');
});

if (menuSettingsBtn) menuSettingsBtn.addEventListener('click', () => window.location = "/settings/");
if (savedCardsBtn) savedCardsBtn.addEventListener('click', () => window.location.href = "/saved-cards/");
if (learningHistoryBtn) learningHistoryBtn.addEventListener('click', () => window.location.href = "/learning-history/");

// --- CORE LOGIC: GENERATE ANSWER ---

if (searchBtn) searchBtn.addEventListener('click', generateAnswer);
if (topicInput) {
    topicInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') generateAnswer();
    });
}

async function generateAnswer() {
    const topic = topicInput.value.trim();
    if (!topic) {
        await UniAlert("Please enter a topic!", "OK");
        return;
    }

    cardsContainer.innerHTML = "";
    loading.style.display = "flex";
    loading.innerHTML = `<div class="spinner"></div><p>Thinking...</p>`;
    searchBtn.disabled = true;

    const language = languageSelect ? languageSelect.value : "English";
    const style = styleSelect ? styleSelect.value : "Simple";
    const persona = personaSelect ? personaSelect.value : "Friendly Tutor";
    const detailLevel = detailLevelSelect ? detailLevelSelect.value : "medium";
    const cardLimit = cardCountToggle ? (cardCountToggle.checked ? 6 : 4) : 4;

    const payload = {
        topic, language, style, persona, detailLevel, cardLimit,
        userId: currentUser ? currentUser.uid : null
    };

    try {
        const response = await fetch('/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (data.success) {
            loading.style.display = "none";
            renderCards(data.data);

            if (currentUser) {
                const userRef = db.collection('users').doc(currentUser.uid);

                // Save History
                userRef.collection('history').add({
                    topic: topic,
                    cards: data.data,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                    settings: { style, persona, language }
                });

                // Smart Counter Logic
                userRef.get().then((docSnapshot) => {
                    const userData = docSnapshot.data();
                    const currentTopicClean = topic.trim().toLowerCase();
                    const lastTopicClean = userData?.lastTopic ? userData.lastTopic.toLowerCase() : "";

                    if (currentTopicClean !== lastTopicClean) {
                        userRef.set({
                            conceptsLearned: firebase.firestore.FieldValue.increment(1),
                            lastTopic: topic.trim(),
                            lastActive: firebase.firestore.FieldValue.serverTimestamp()
                        }, { merge: true });
                    } else {
                        userRef.set({
                            lastActive: firebase.firestore.FieldValue.serverTimestamp()
                        }, { merge: true });
                    }
                });

            } else {
                updateGuestCounter();
            }
        } else {
            loading.innerHTML = `<p style="color:red">Error: ${data.message}</p>`;
            if (data.errorType === "LIMIT_EXCEEDED") {
                await UniAlert(data.message, "OK");
            }
        }

    } catch (error) {
        console.error("Fetch error:", error);
        loading.innerHTML = `<p style="color:red">Connection Failed. Try again.</p>`;
    } finally {
        searchBtn.disabled = false;
    }
}

function updateGuestCounter() {
    checkGuestLimit();
}

// --- RENDER CARDS (With Highlights, Formatting, Simplify, Copy, Save) ---

function renderCards(cardsData) {
    const colors = ["card-blue", "card-yellow", "card-green", "card-purple", "card-orange", "card-red"];
    let colorIndex = 0;

    cardsContainer.innerHTML = "";

    Object.keys(cardsData).forEach(key => {
        const card = cardsData[key];
        const colorClass = colors[colorIndex % colors.length];

        // Track Raw Content (with ** stars)
        let currentRawContent = card.content;

        const cardEl = document.createElement('div');
        cardEl.className = `card ${colorClass}`;

        // Format for Display
        const formattedTitle = formatText(card.title);
        const formattedContent = formatText(currentRawContent);

        const titleEl = document.createElement('h3');
        titleEl.innerHTML = formattedTitle;

        const contentEl = document.createElement('p');
        contentEl.innerHTML = formattedContent;

        cardEl.appendChild(titleEl);
        cardEl.appendChild(contentEl);

        // --- ACTION FOOTER ---
        const footer = document.createElement('div');
        footer.style.cssText = "display: flex; justify-content: flex-end; gap: 15px; margin-top: 15px; border-top: 1px solid rgba(0,0,0,0.05); padding-top: 10px;";

        // Define buttons first to use them in listeners
        const saveBtn = document.createElement('div');

        // SIMPLIFY BUTTON
        const simplifyBtn = document.createElement('div');
        simplifyBtn.style.cssText = "cursor:pointer; font-size:0.85rem; opacity:0.8; transition: all 0.2s; display:flex; align-items:center; gap:5px; color: #4285F4;";
        simplifyBtn.innerHTML = `<i class="fas fa-magic"></i> Simplify`;
        simplifyBtn.title = "Explain this simple";

        simplifyBtn.addEventListener('click', async () => {
            // Simplify logic sends raw content
            const newRaw = await simplifyCard(contentEl, card.title, currentRawContent);

            if (newRaw) {
                currentRawContent = newRaw; // Update tracking variable

                if (saveBtn.dataset.docId) {
                    saveBtn.dataset.updateId = saveBtn.dataset.docId;
                    delete saveBtn.dataset.docId;
                    saveBtn.innerHTML = `<i class="far fa-bookmark"></i> Save Update`;
                    saveBtn.style.color = "#555";
                    saveBtn.style.fontWeight = "normal";
                }
            }
        });

        // COPY BUTTON
        const copyBtn = document.createElement('div');
        copyBtn.style.cssText = "cursor:pointer; font-size:0.85rem; opacity:0.7; transition: all 0.2s; display:flex; align-items:center; gap:5px; color: #555;";
        copyBtn.innerHTML = `<i class="far fa-copy"></i> Copy`;
        copyBtn.title = "Copy to clipboard";

        copyBtn.addEventListener('click', async () => {
            try {
                // CLEAN TEXT for Clipboard (Remove stars)
                let cleanTitle = card.title.replace(/\*\*/g, "");
                let cleanContent = currentRawContent.replace(/\*\*/g, "");

                const textToCopy = `${cleanTitle}\n\n${cleanContent}`;
                await navigator.clipboard.writeText(textToCopy);

                copyBtn.innerHTML = `<i class="fas fa-check"></i> Copied`;
                copyBtn.style.color = "#137333";
                copyBtn.style.fontWeight = "600";
                copyBtn.style.opacity = "1";

                setTimeout(() => {
                    copyBtn.innerHTML = `<i class="far fa-copy"></i> Copy`;
                    copyBtn.style.color = "#555";
                    copyBtn.style.fontWeight = "normal";
                    copyBtn.style.opacity = "0.7";
                }, 2000);

            } catch (err) {
                console.error("Copy failed", err);
                UniAlert("Failed to copy text", "OK");
            }
        });

        // SAVE BUTTON
        saveBtn.style.cssText = "cursor:pointer; font-size:0.85rem; opacity:0.7; transition: all 0.2s; display:flex; align-items:center; gap:5px; color: #555;";
        saveBtn.innerHTML = `<i class="far fa-bookmark"></i> Save`;

        saveBtn.addEventListener('click', function () {
            // RAW Content save karo (with stars)
            toggleCardState(this, card.title, currentRawContent, colorClass);
        });

        footer.appendChild(simplifyBtn);
        footer.appendChild(copyBtn);
        footer.appendChild(saveBtn);

        cardEl.appendChild(footer);
        cardsContainer.appendChild(cardEl);

        colorIndex++;
    });
}
//HELPER: Formats **text** to Highlighted HTML (<mark>)
function formatText(text) {
    if (!text) return "";
    return text.replace(/\*\*(.*?)\*\*/g, (match, p1) => {
        return `<mark style="background-color: #fff2cc; color: #333; padding: 0 4px; border-radius: 4px; font-weight: 600;">${p1}</mark>`;
    });
}

// UPDATED: SIMPLIFY FUNCTION (With Detail Level Fix)
async function simplifyCard(contentElement, title, originalContent) {
    // UI: Show Loading
    const originalHTML = contentElement.innerHTML; // Save HTML state
    contentElement.innerHTML = `<span style="color:#4285F4; display:flex; align-items:center; justify-content:center; gap:10px;"><div class="spinner" style="margin: 20px 0; width:20px; height:20px; border-width:2px;"></div> Thinking...</span>`;

    // ROBUST FETCHING OF SETTINGS
    const language = document.getElementById('language')?.value || "English";
    const topic = document.getElementById('topicInput')?.value || "General Concept";

    // FIX: Fetch detailLevel from DOM or LocalStorage
    let detailLevel = "medium";
    if (document.getElementById('detailLevel')) {
        detailLevel = document.getElementById('detailLevel').value;
    } else {
        const saved = localStorage.getItem('conceptDost_prefs');
        if (saved) detailLevel = JSON.parse(saved).detailLevel || "medium";
    }

    try {
        const response = await fetch('/api/simplify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title: title,
                content: originalContent,
                topic: topic,
                language: language,
                detailLevel: detailLevel,
                style: "Very Simple & Friendly"
            })
        });

        const data = await response.json();

        if (data.success) {
            // Update Content & Apply Formatting
            contentElement.style.opacity = "0";
            setTimeout(() => {
                contentElement.innerHTML = formatText(data.newContent);
                contentElement.style.transition = "opacity 0.5s";
                contentElement.style.opacity = "1";
            }, 100);

            return data.newContent;
        } else {
            contentElement.innerHTML = originalHTML;
            UniAlert("Could not simplify. Try again.", "OK");
            return null;
        }

    } catch (error) {
        console.error("Simplify failed:", error);
        contentElement.innerHTML = originalHTML;
        UniAlert("Connection failed.", "OK");
        return null;
    }
}

// --- TOGGLE CARD STATE ---

window.toggleCardState = async function (btnElement, title, content, colorClass) {
    const user = auth.currentUser;
    if (!user) {
        await UniAlert("Please Login to save cards!", "OK");
        return;
    }

    const savedDocId = btnElement.dataset.docId;

    // UNSAVE CASE
    if (savedDocId) {
        const originalHTML = btnElement.innerHTML;
        btnElement.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Removing...`;

        try {
            await db.collection('users').doc(user.uid).collection('saved_cards').doc(savedDocId).delete();
            delete btnElement.dataset.docId;
            btnElement.innerHTML = `<i class="far fa-bookmark"></i> Save`;
            btnElement.style.color = "";
            btnElement.style.fontWeight = "normal";
        } catch (error) {
            console.error("Unsave failed:", error);
            btnElement.innerHTML = originalHTML;
        }
        return;
    }

    // SAVE CASE
    btnElement.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Saving...`;
    const currentTopic = topicInput ? topicInput.value : "General";

    try {
        let docRefId;

        if (btnElement.dataset.updateId) {
            const updateId = btnElement.dataset.updateId;

            await db.collection('users').doc(user.uid).collection('saved_cards').doc(updateId).update({
                content: content,
                savedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            docRefId = updateId;
            delete btnElement.dataset.updateId;
        } else {
            const docRef = await db.collection('users').doc(user.uid).collection('saved_cards').add({
                title: title,
                content: content,
                colorClass: colorClass,
                topic: currentTopic,
                savedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            docRefId = docRef.id;
        }

        btnElement.dataset.docId = docRefId;
        btnElement.innerHTML = `<i class="fas fa-bookmark"></i> Saved`;
        btnElement.style.color = "#137333";
        btnElement.style.fontWeight = "bold";

    } catch (error) {
        console.error("Save failed:", error);
        btnElement.innerHTML = `<i class="fas fa-exclamation-triangle"></i> Error`;
        btnElement.style.color = "red";
    }
};

// --- HELPER: CHIPS CLICK ---
window.fillInput = function (text) {
    if (topicInput) topicInput.value = text;
};

// --- PWA SERVICE WORKER REGISTRATION ---
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js')
            .then(reg => console.log('Service Worker Registered'))
            .catch(err => console.log('Service Worker Error:', err));
    });
}

//Nav Mobile Menu Expand
nav_expand_btn.addEventListener("click", () => {
    if (nav_expand_btn.children[1].style.opacity != "0") {
        nav_expand_btn.children[1].style.opacity = "0";
        mobMenuWin.style.height = "4rem";
        nav_expand_btn.children[0].style.transform = "rotate(45deg)translateX(4.5px)translateY(4.5px)";
        nav_expand_btn.children[2].style.transform = "rotate(-45deg)translateX(4.5px)translateY(-4.5px)";
    } else {

        nav_expand_btn.children[1].style.opacity = "1";
        mobMenuWin.style.height = "0rem";
        nav_expand_btn.children[0].style.transform = "rotate(0)translateX(0)translateY(0)";
        nav_expand_btn.children[2].style.transform = "rotate(0)translateX(0)translateY(0)";
    }

})