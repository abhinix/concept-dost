if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// --- DOM ELEMENTS ---
const initialLoader = document.getElementById('initial-loader');
const historyList = document.getElementById('history-list');
const emptyState = document.getElementById('empty-state');
const searchInput = document.getElementById('historySearch');
const sortOrder = document.getElementById('sortOrder');
const controlsWrapper = document.querySelector('.controls-wrapper');

// Selection Elements
const toggleSelectBtn = document.getElementById('toggle-select-btn');
const bulkActionBar = document.getElementById('bulk-action-bar');
const selectedCountSpan = document.getElementById('selected-count');
const deleteSelectedBtn = document.getElementById('delete-selected-btn');
const selectAllBtn = document.getElementById('select-all-btn');

// State
let rawHistoryData = [];
let currentFilteredData = [];
let isSelectionMode = false;
let selectedIds = new Set();
let savedCardsMap = new Map(); 

// --- AUTH & FETCH ---
auth.onAuthStateChanged(user => {
    if (user) {
        initializePage(user.uid);
    } else {
        window.location.href = "../";
    }
});

async function initializePage(userId) {
    try {
        await fetchSavedStatus(userId);
        await fetchHistory(userId);
    } catch (error) {
        console.error("Initialization error:", error);
    }
}

async function fetchSavedStatus(userId) {
    try {
        const snapshot = await db.collection('users').doc(userId).collection('saved_cards').get();
        savedCardsMap.clear();
        snapshot.forEach(doc => {
            const data = doc.data();
            const signature = `${data.title}|${data.content}`;
            savedCardsMap.set(signature, doc.id);
        });
    } catch (error) {
        console.error("Error syncing saved cards:", error);
    }
}

async function fetchHistory(userId) {
    try {
        const snapshot = await db.collection('users').doc(userId).collection('history')
            .orderBy('timestamp', 'desc')
            .get();

        rawHistoryData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            dateObj: doc.data().timestamp ? doc.data().timestamp.toDate() : new Date()
        }));

        if (initialLoader) initialLoader.style.display = 'none';
        filterAndRender();

    } catch (error) {
        console.error("Error loading history:", error);
        if (initialLoader) initialLoader.innerHTML = "<p style='color:red'>Failed to load.</p>";
    }
}

// --- RENDER LOGIC ---
function filterAndRender() {
    if (rawHistoryData.length === 0) {
        emptyState.classList.remove('hidden');
        historyList.innerHTML = "";
        controlsWrapper.style.display = "none";
        toggleSelectBtn.style.display = "none";
        bulkActionBar.classList.add('hidden');
        return;
    }

    emptyState.classList.add('hidden');
    controlsWrapper.style.display = "flex";
    toggleSelectBtn.style.display = "block";

    const query = searchInput.value.toLowerCase();
    const sort = sortOrder.value;

    let filtered = rawHistoryData.filter(item => 
        item.topic.toLowerCase().includes(query)
    );

    filtered.sort((a, b) => {
        if (sort === 'newest') return b.dateObj - a.dateObj;
        return a.dateObj - b.dateObj;
    });

    currentFilteredData = filtered;
    renderList(filtered);
}

function renderList(data) {
    historyList.innerHTML = "";

    if (data.length === 0) {
        historyList.innerHTML = `
            <div style="text-align: center; padding: 60px 20px; color: #5f6368;">
                <i class="fas fa-search" style="font-size: 3rem; margin-bottom: 20px; color: #dadce0;"></i>
                <h4 style="font-size: 1.2rem; margin-bottom: 8px;">No matching records found</h4>
            </div>
        `;
        return;
    }

    data.forEach(item => {
        const dateStr = item.dateObj.toLocaleDateString() + " • " + item.dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        const itemEl = document.createElement('div');
        itemEl.className = 'history-item';
        itemEl.dataset.id = item.id;
        const isChecked = selectedIds.has(item.id) ? 'checked' : '';

        itemEl.innerHTML = `
            <div class="history-header" onclick="toggleExpand('${item.id}', this)">
                <div style="display:flex; align-items:center;">
                    <input type="checkbox" class="select-checkbox" ${isChecked} onclick="handleCheckbox('${item.id}', event)">
                    <div class="header-content">
                        <h3>${item.topic}</h3>
                        <span><i class="far fa-clock"></i> ${dateStr}</span>
                    </div>
                </div>
                <i class="fas fa-chevron-down expand-icon"></i>
            </div>
            
            <div class="history-body" id="body-${item.id}">
                <div class="inner-cards-grid" id="grid-${item.id}"></div>
            </div>
        `;

        historyList.appendChild(itemEl);

        const gridContainer = itemEl.querySelector(`#grid-${item.id}`);
        appendMiniCards(gridContainer, item.cards, item.topic);
    });
}

// Formats **text** to Highlighted HTML (<mark>)
function formatText(text) {
    if (!text) return "";
    return text.replace(/\*\*(.*?)\*\*/g, (match, p1) => {
        return `<mark style="background-color: #fff2cc; color: #333; padding: 0 4px; border-radius: 4px; font-weight: 600;">${p1}</mark>`;
    });
}

// Render Cards with Highlights & Clean Copy
function appendMiniCards(container, cardsObj, topic) {
    if (!cardsObj) {
        container.innerHTML = "<p style='padding:10px; color:#999;'>No card details.</p>";
        return;
    }

    const keys = Object.keys(cardsObj);
    keys.sort((a, b) => {
        const numA = parseInt(a.replace('card', '')) || 0;
        const numB = parseInt(b.replace('card', '')) || 0;
        return numA - numB;
    });

    keys.forEach(key => {
        const card = cardsObj[key];
        
        const cardDiv = document.createElement('div');
        cardDiv.className = 'mini-card';

        // Content with Highlighting
        const titleEl = document.createElement('h4');
        titleEl.innerHTML = formatText(card.title); 
        
        const contentEl = document.createElement('p');
        contentEl.innerHTML = formatText(card.content); 

        const footer = document.createElement('div');
        footer.style.cssText = "display: flex; justify-content: flex-end; gap: 10px; margin-top: 15px; border-top: 1px solid rgba(0,0,0,0.05); padding-top: 10px;";

        // COPY BUTTON 
        const copyBtn = document.createElement('div');
        copyBtn.style.cssText = "cursor:pointer; font-size:0.75rem; opacity:0.7; transition: all 0.2s; display:flex; align-items:center; gap:5px; color: #555; background: #f1f3f4; padding: 5px 10px; border-radius: 15px;";
        copyBtn.innerHTML = `<i class="far fa-copy"></i> Copy`;
        
        copyBtn.addEventListener('click', async (e) => {
            e.stopPropagation(); 
            try {
                let cleanTitle = titleEl.innerText;
                let cleanContent = contentEl.innerText;

                // Remove stars manually just in case
                cleanTitle = cleanTitle.replace(/\*\*/g, "");
                cleanContent = cleanContent.replace(/\*\*/g, "");

                const textToCopy = `${cleanTitle}\n\n${cleanContent}`;
                await navigator.clipboard.writeText(textToCopy);
                
                copyBtn.innerHTML = `<i class="fas fa-check"></i> Copied`;
                copyBtn.style.color = "#137333";
                copyBtn.style.background = "#e6f4ea";
                copyBtn.style.fontWeight = "600";

                setTimeout(() => {
                    copyBtn.innerHTML = `<i class="far fa-copy"></i> Copy`;
                    copyBtn.style.color = "#555";
                    copyBtn.style.background = "#f1f3f4";
                    copyBtn.style.fontWeight = "normal";
                }, 2000);
            } catch (err) {
                UniAlert("Failed to copy.", "OK");
            }
        });

        // SAVE BUTTON
        const signature = `${card.title}|${card.content}`;
        let savedDocId = savedCardsMap.get(signature);

        const saveBtn = document.createElement('button');
        if (savedDocId) {
            saveBtn.className = "history-save-btn saved";
            saveBtn.innerHTML = `<i class="fas fa-check"></i> Saved`;
        } else {
            saveBtn.className = "history-save-btn";
            saveBtn.innerHTML = `<i class="far fa-bookmark"></i> Save Card`;
        }
        saveBtn.style.position = "static"; 

        saveBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const safeTitle = encodeURIComponent(card.title || "").replace(/'/g, "%27");
            const safeContent = encodeURIComponent(card.content || "").replace(/'/g, "%27");
            const safeTopic = encodeURIComponent(topic || "General").replace(/'/g, "%27");
            
            savedDocId = savedCardsMap.get(signature);
            toggleSaveFromHistory(saveBtn, safeTitle, safeContent, safeTopic, savedDocId);
        });

        footer.appendChild(copyBtn);
        footer.appendChild(saveBtn);

        cardDiv.appendChild(titleEl);
        cardDiv.appendChild(contentEl);
        cardDiv.appendChild(footer);

        container.appendChild(cardDiv);
    });
}

// --- TOGGLE SAVE/UNSAVE LOGIC ---
window.toggleSaveFromHistory = async function(btn, encTitle, encContent, encTopic, existingDocId) {
    const user = auth.currentUser;
    if (!user) return;

    const title = decodeURIComponent(encTitle);
    const content = decodeURIComponent(encContent);
    const topic = decodeURIComponent(encTopic);
    const signature = `${title}|${content}`;

    // UNSAVE LOGIC
    const currentDocId = existingDocId || savedCardsMap.get(signature);

    if (currentDocId) {
        btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Removing...`;
        try {
            await db.collection('users').doc(user.uid).collection('saved_cards').doc(currentDocId).delete();
            savedCardsMap.delete(signature);
            btn.innerHTML = `<i class="far fa-bookmark"></i> Save Card`;
            btn.classList.remove('saved');
        } catch (error) {
            console.error("Unsave failed:", error);
            btn.innerHTML = `<i class="fas fa-exclamation"></i> Error`;
        }
        return;
    }

    // SAVE LOGIC
    btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Saving...`;
    
    try {
        const docRef = await db.collection('users').doc(user.uid).collection('saved_cards').add({
            title: title,
            content: content,
            topic: topic,
            colorClass: "card-blue",
            savedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        savedCardsMap.set(signature, docRef.id);
        btn.innerHTML = `<i class="fas fa-check"></i> Saved`;
        btn.classList.add('saved');

    } catch (error) {
        console.error("Save failed:", error);
        btn.innerHTML = `<i class="fas fa-exclamation"></i> Error`;
    }
};

// --- SELECTION LOGIC ---
toggleSelectBtn.addEventListener('click', () => {
    isSelectionMode = !isSelectionMode;
    document.body.classList.toggle('selection-mode');
    
    if (isSelectionMode) {
        toggleSelectBtn.innerText = "Cancel";
        toggleSelectBtn.classList.add('active');
    } else {
        toggleSelectBtn.innerText = "Selection";
        toggleSelectBtn.classList.remove('active');
        selectedIds.clear();
        document.querySelectorAll('.select-checkbox').forEach(cb => cb.checked = false);
        updateBulkBar();
    }
});

selectAllBtn.addEventListener('click', () => {
    const allVisibleIds = currentFilteredData.map(item => item.id);
    const allSelected = allVisibleIds.every(id => selectedIds.has(id));

    if (allSelected) {
        selectedIds.clear();
        document.querySelectorAll('.select-checkbox').forEach(cb => cb.checked = false);
        selectAllBtn.innerText = "Select All";
    } else {
        allVisibleIds.forEach(id => selectedIds.add(id));
        document.querySelectorAll('.select-checkbox').forEach(cb => cb.checked = true);
        selectAllBtn.innerText = "Deselect All";
    }
    updateBulkBar();
});

window.handleCheckbox = function(id, e) {
    if (e && e.stopPropagation) e.stopPropagation();
    if (selectedIds.has(id)) selectedIds.delete(id);
    else selectedIds.add(id);
    updateBulkBar();
    const allVisibleIds = currentFilteredData.map(item => item.id);
    const allSelected = allVisibleIds.length > 0 && allVisibleIds.every(id => selectedIds.has(id));
    selectAllBtn.innerText = allSelected ? "Deselect All" : "Select All";
};

function updateBulkBar() {
    if (selectedIds.size > 0) {
        bulkActionBar.classList.remove('hidden');
        selectedCountSpan.innerText = `${selectedIds.size} Selected`;
    } else {
        bulkActionBar.classList.add('hidden');
    }
}

window.toggleExpand = function(id, headerEl) {
    if (isSelectionMode) {
        const checkbox = headerEl.querySelector('.select-checkbox');
        checkbox.checked = !checkbox.checked;
        handleCheckbox(id, { stopPropagation: () => {} });
        return;
    }
    headerEl.parentElement.classList.toggle('expanded');
};

// --- DELETE HISTORY LOGIC ---
deleteSelectedBtn.addEventListener('click', async () => {
    const confirmMsg = `Are you sure you want to delete ${selectedIds.size} history items?`;
    const confirmed = await UniAlert(confirmMsg, "Yes, Delete", "Cancel");

    if (!confirmed) return;

    const user = auth.currentUser;
    if (!user) return;

    deleteSelectedBtn.innerText = "Deleting...";
    const batch = db.batch();

    selectedIds.forEach(id => {
        const ref = db.collection('users').doc(user.uid).collection('history').doc(id);
        batch.delete(ref);
    });

    try {
        await batch.commit();
        rawHistoryData = rawHistoryData.filter(item => !selectedIds.has(item.id));
        toggleSelectBtn.click();
        deleteSelectedBtn.innerText = "Delete";
        filterAndRender();
    } catch (error) {
        console.error("Delete failed", error);
        await UniAlert("Error deleting items. Please check your connection.", "OK");
        deleteSelectedBtn.innerText = "Delete";
    }
});

// Event Listeners
searchInput.addEventListener('input', filterAndRender);
sortOrder.addEventListener('change', filterAndRender);