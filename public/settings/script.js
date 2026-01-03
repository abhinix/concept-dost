if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

let isDeletingAccount = false;

// --- TAB SWITCHING LOGIC ---
const menuItems = document.querySelectorAll('.menu-item');
const panels = document.querySelectorAll('.settings-panel');

menuItems.forEach(item => {
    item.addEventListener('click', () => {
        menuItems.forEach(btn => btn.classList.remove('active'));
        panels.forEach(panel => panel.classList.add('hidden'));

        item.classList.add('active');
        const targetId = item.getAttribute('data-target');
        document.getElementById(targetId).classList.remove('hidden');
    });
});

// --- LOAD USER DATA ---
auth.onAuthStateChanged(user => {
    if (user) {
        document.getElementById('name-input').value = user.displayName || "";
        document.getElementById('email-input').value = user.email || "";
        document.getElementById('settings-pic').src = user.photoURL || "https://via.placeholder.com/150";
    } else {
        if (!isDeletingAccount) {
            window.location.href = "../";
        }
    }
});

// --- UPDATE NAME (Strict Validation) ---
document.getElementById('save-profile-btn').addEventListener('click', async () => {
    const user = auth.currentUser;
    if (!user) return;

    const nameInput = document.getElementById('name-input');
    const btn = document.getElementById('save-profile-btn');

    // Validation Logic
    const newName = nameInput.value.trim();

    if (newName.length === 0) {
        await UniAlert("Name cannot be empty!", "OK");
        return;
    }

    if (!/^[a-zA-Z]/.test(newName)) {
        await UniAlert("Name must start with an English letter (A-Z).", "OK");
        return;
    }

    const nameRegex = /^[a-zA-Z][a-zA-Z\s\.\-\']*$/;
    if (!nameRegex.test(newName)) {
        await UniAlert("Invalid characters! Name can only contain letters, spaces, dots (.), hyphens (-), and apostrophes (').", "OK");
        return;
    }

    // Save Logic
    btn.innerText = "Saving...";

    user.updateProfile({ displayName: newName })
        .then(() => {
            UniAlert("Name updated successfully!", "OK");
            btn.innerText = "Save Changes";
            nameInput.value = newName;
        })
        .catch((error) => {
            UniAlert("Error: " + error.message, "OK");
            btn.innerText = "Save Changes";
        });
});

// --- DATA CONTROL: CLEAR HISTORY / CARDS ---
async function deleteCollection(collectionRef) {
    const snapshot = await collectionRef.get();
    const batch = db.batch();
    let count = 0;

    snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
        count++;
    });

    if (count > 0) {
        await batch.commit();
    }
    return count;
}

window.clearData = async function (type) {
    const btn = event.target;
    const user = auth.currentUser;
    if (!user) return;

    let collectionName = "";
    let confirmMsg = "";

    if (type === 'history') {
        collectionName = 'history';
        confirmMsg = "Are you sure you want to clear your entire learning history?";
    } else if (type === 'cards') {
        collectionName = 'saved_cards';
        confirmMsg = "Are you sure you want to delete ALL saved notes?";
    } else {
        return;
    }

    const confirmation = await UniAlert(confirmMsg, "Yes, Clear", "Cancel");

    if (confirmation) {
        const originalText = btn.innerText;
        btn.innerText = "Clearing...";
        btn.disabled = true;

        try {
            const ref = db.collection('users').doc(user.uid).collection(collectionName);
            await deleteCollection(ref);

            await UniAlert(`All ${type} data cleared.`, "OK");
            btn.innerText = "Cleared";
        } catch (error) {
            console.error(error);
            await UniAlert("Error clearing data: " + error.message, "OK");
            btn.innerText = originalText;
        } finally {
            setTimeout(() => {
                btn.innerText = originalText;
                btn.disabled = false;
            }, 2000);
        }
    }
};

// --- DELETE ACCOUNT LOGIC ---

const deleteModal = document.getElementById('delete-modal');
const deleteInput = document.getElementById('delete-confirm-input');
const finalDeleteBtn = document.getElementById('final-delete-btn');

// Open Modal
window.openDeleteModal = function () {
    deleteModal.classList.remove('hidden');
    deleteInput.value = "";

    deleteInput.style.textTransform = "none";

    finalDeleteBtn.disabled = true;
    deleteInput.focus();
};

// Close Modal
window.closeDeleteModal = function () {
    deleteModal.classList.add('hidden');
};

//  Verify Input ("DELETE")
deleteInput.addEventListener('input', function () {
    // Check strictly for uppercase "DELETE"
    if (this.value === "DELETE") {
        finalDeleteBtn.disabled = false;
        finalDeleteBtn.style.opacity = "1";
    } else {
        finalDeleteBtn.disabled = true;
        finalDeleteBtn.style.opacity = "0.5";
    }
});

// Perform Actual Delete
window.confirmDeleteAccount = async function () {
    const user = auth.currentUser;
    if (!user) return;

    finalDeleteBtn.innerText = "Deleting...";
    finalDeleteBtn.disabled = true;
    isDeletingAccount = true;

    try {
        // Delete Data
        await deleteCollection(db.collection('users').doc(user.uid).collection('history'));
        await deleteCollection(db.collection('users').doc(user.uid).collection('saved_cards'));
        await db.collection('users').doc(user.uid).delete();

        // Delete User
        await user.delete();

        // Show Alert (User stays on page because of isDeletingAccount flag)
        await UniAlert("Account has been permanently deleted.", "OK");

        // Manual Redirect after user clicks OK
        window.location.href = "../";

    } catch (error) {
        console.error(error);
        isDeletingAccount = false;

        if (error.code === 'auth/requires-recent-login') {
            await UniAlert("Security Check: Please Log Out and Log In again to confirm ownership before deleting.", "OK");
        } else {
            await UniAlert("Error deleting account: " + error.message, "OK");
        }
        closeDeleteModal();
        finalDeleteBtn.innerText = "Delete Everything";
    }
};