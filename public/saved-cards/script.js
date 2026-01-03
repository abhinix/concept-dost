if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Elements
const initialLoader = document.getElementById('initial-loader');
const cardsGrid = document.getElementById('cards-grid');
const emptyState = document.getElementById('empty-state');
const searchInput = document.getElementById('searchInput');
const sortOrder = document.getElementById('sortOrder');
const controlsWrapper = document.querySelector('.controls-wrapper');

// Selection Elements
const toggleSelectBtn = document.getElementById('toggle-select-btn');
const bulkActionBar = document.getElementById('bulk-action-bar');
const selectedCountSpan = document.getElementById('selected-count');
const deleteSelectedBtn = document.getElementById('delete-selected-btn');
const selectAllBtn = document.getElementById('select-all-btn');

// State
let allCardsData = [];
let currentFilteredData = [];
let isSelectionMode = false;
let selectedIds = new Set();

// --- FETCH CARDS (On Load) ---
auth.onAuthStateChanged(user => {
    if (user) {
        fetchSavedCards(user.uid);
    } else {
        window.location.href = "../";
    }
});

async function fetchSavedCards(userId) {
    try {
        const snapshot = await db.collection('users').doc(userId).collection('saved_cards')
            .orderBy('savedAt', 'desc')
            .get();

        allCardsData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            dateObj: doc.data().savedAt ? doc.data().savedAt.toDate() : new Date(0)
        }));

        if (initialLoader) initialLoader.style.display = 'none';

        if (allCardsData.length === 0) {
            emptyState.classList.remove('hidden');
            controlsWrapper.style.display = 'none';
            toggleSelectBtn.style.display = 'none';
            return;
        }

        emptyState.classList.add('hidden');
        controlsWrapper.style.display = 'flex';
        toggleSelectBtn.style.display = 'block';

        filterAndRender();

    } catch (error) {
        console.error("Error fetching cards:", error);
        if (initialLoader) initialLoader.innerHTML = `<p style="color:red">Failed to load cards.</p>`;
    }
}

// --- FILTER & SORT LOGIC ---
function filterAndRender() {
    const query = searchInput.value.toLowerCase();
    const sort = sortOrder.value;

    let filtered = allCardsData.filter(card =>
        card.title.toLowerCase().includes(query) ||
        card.content.toLowerCase().includes(query) ||
        (card.topic && card.topic.toLowerCase().includes(query))
    );

    filtered.sort((a, b) => {
        if (sort === 'newest') return b.dateObj - a.dateObj;
        return a.dateObj - b.dateObj;
    });

    currentFilteredData = filtered;
    renderCards(filtered);
}

searchInput.addEventListener('input', filterAndRender);
sortOrder.addEventListener('change', filterAndRender);


// --- RENDER FUNCTION ---
function renderCards(cards) {
    cardsGrid.innerHTML = "";

    if (cards.length === 0) {
        cardsGrid.innerHTML = `
            <div style="width: 100%; text-align: center; padding: 60px 20px; color: #5f6368;">
                <i class="fas fa-search" style="font-size: 3rem; margin-bottom: 20px; color: #dadce0;"></i>
                <h4 style="font-size: 1.2rem; font-weight: 600; color: #3c4043; margin-bottom: 8px;">
                    No matching cards found
                </h4>
                <p style="font-size: 0.95rem; color: #70757a;">
                    Try searching for a different keyword or topic.
                </p>
            </div>
        `;
        cardsGrid.style.display = 'block';
        return;
    }

    cardsGrid.style.display = 'flex';

    const colors = ["card-blue", "card-yellow", "card-green", "card-purple", "card-orange", "card-red"];
    const width = window.innerWidth;
    let colCount = 3;
    if (width < 768) colCount = 1;
    else if (width < 1200) colCount = 2;

    const columns = [];
    for (let i = 0; i < colCount; i++) {
        const col = document.createElement('div');
        col.className = 'masonry-column';
        columns.push(col);
    }

    cards.forEach((card, index) => {
        const date = card.dateObj.toLocaleDateString();
        const colorClass = card.colorClass || colors[index % colors.length];

        // Main Card Element
        const cardEl = document.createElement('div');
        cardEl.className = `saved-card ${colorClass}`;
        if (selectedIds.has(card.id)) {
            cardEl.classList.add('selected');
        }

        // Apply Formatting
        const formattedTitle = formatText(card.title);
        const formattedContent = formatText(card.content);

        // Content Area
        const contentDiv = document.createElement('div');
        contentDiv.innerHTML = `
            <div class="check-circle"><i class="fas fa-check"></i></div>
            <h3>${formattedTitle}</h3>
            <p>${formattedContent}</p>
            <div class="card-meta">
                <span><i class="far fa-clock"></i> ${date}</span>
                <span>${card.topic || "Topic"}</span>
            </div>
        `;

        // Footer Area
        const footer = document.createElement('div');
        footer.style.cssText = "display: flex; justify-content: flex-end; margin-top: 15px; border-top: 1px solid rgba(0,0,0,0.05); padding-top: 10px;";

        const copyBtn = document.createElement('div');
        copyBtn.style.cssText = "cursor:pointer; font-size:0.85rem; opacity:0.7; transition: all 0.2s; display:flex; align-items:center; gap:5px; color: #555;";
        copyBtn.innerHTML = `<i class="far fa-copy"></i> Copy`;
        copyBtn.title = "Copy to clipboard";
        copyBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            try {
                const cleanTitle = card.title.replace(/\*\*/g, "");
                const cleanContent = card.content.replace(/\*\*/g, "");
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

        footer.appendChild(copyBtn);
        cardEl.appendChild(contentDiv);
        cardEl.appendChild(footer);

        // Click Logic for Selection
        cardEl.addEventListener('click', () => handleCardClick(cardEl, card.id));

        const columnIndex = index % colCount;
        columns[columnIndex].appendChild(cardEl);
    });

    columns.forEach(col => cardsGrid.appendChild(col));
}

// Formats **text** to Highlighted HTML
function formatText(text) {
    if (!text) return "";
    return text.replace(/\*\*(.*?)\*\*/g, (match, p1) => {
        return `<mark style="background-color: #fff2cc; color: #333; padding: 0 4px; border-radius: 4px; font-weight: 600;">${p1}</mark>`;
    });
}

let resizeTimer;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
        if (allCardsData && allCardsData.length > 0) filterAndRender();
    }, 100);
});

// --- SELECTION LOGIC ---
toggleSelectBtn.addEventListener('click', () => {
    isSelectionMode = !isSelectionMode;

    if (isSelectionMode) {
        toggleSelectBtn.innerText = "Cancel";
        toggleSelectBtn.classList.add('active');
        document.body.classList.add('selection-mode');
    } else {
        toggleSelectBtn.innerText = "Selection";
        toggleSelectBtn.classList.remove('active');
        document.body.classList.remove('selection-mode');
        selectedIds.clear();
        updateBulkBar();
        document.querySelectorAll('.saved-card').forEach(el => el.classList.remove('selected'));
    }
});

function handleCardClick(element, id) {
    if (!isSelectionMode) return;

    if (selectedIds.has(id)) {
        selectedIds.delete(id);
        element.classList.remove('selected');
    } else {
        selectedIds.add(id);
        element.classList.add('selected');
    }
    updateBulkBar();
}

selectAllBtn.addEventListener('click', () => {
    const allVisibleIds = currentFilteredData.map(item => item.id);
    const allSelected = allVisibleIds.every(id => selectedIds.has(id));

    if (allSelected) {
        selectedIds.clear();
        document.querySelectorAll('.saved-card').forEach(el => el.classList.remove('selected'));
        selectAllBtn.innerText = "Select All";
    } else {
        allVisibleIds.forEach(id => selectedIds.add(id));
        document.querySelectorAll('.saved-card').forEach(el => el.classList.add('selected'));
        selectAllBtn.innerText = "Deselect All";
    }
    updateBulkBar();
});

function updateBulkBar() {
    if (selectedIds.size > 0) {
        bulkActionBar.classList.remove('hidden');
        selectedCountSpan.innerText = `${selectedIds.size} Selected`;

        const allVisibleIds = currentFilteredData.map(item => item.id);
        const allSelected = allVisibleIds.length > 0 && allVisibleIds.every(id => selectedIds.has(id));
        selectAllBtn.innerText = allSelected ? "Deselect All" : "Select All";
    } else {
        bulkActionBar.classList.add('hidden');
    }
}

// --- DELETE LOGIC ---
deleteSelectedBtn.addEventListener('click', async () => {
    const confirmMsg = `Are you sure you want to unsave ${selectedIds.size} cards?`;
    const confirmed = await UniAlert(confirmMsg, "Yes, Unsave", "Cancel");

    if (!confirmed) return;

    const user = auth.currentUser;
    if (!user) return;

    const originalText = deleteSelectedBtn.innerText;
    deleteSelectedBtn.innerText = "Removing...";

    const batch = db.batch();

    selectedIds.forEach(id => {
        const ref = db.collection('users').doc(user.uid).collection('saved_cards').doc(id);
        batch.delete(ref);
    });

    try {
        await batch.commit();

        allCardsData = allCardsData.filter(card => !selectedIds.has(card.id));

        toggleSelectBtn.click();
        deleteSelectedBtn.innerText = "Unsave";

        if (allCardsData.length === 0) {
            cardsGrid.innerHTML = "";
            cardsGrid.style.display = 'flex';
            emptyState.classList.remove('hidden');
            controlsWrapper.style.display = 'none';
            toggleSelectBtn.style.display = 'none';
            bulkActionBar.classList.add('hidden');
        } else {
            filterAndRender();
        }

    } catch (error) {
        console.error("Delete failed:", error);
        await UniAlert("Error removing cards.", "OK");
        deleteSelectedBtn.innerText = originalText;
    }
});