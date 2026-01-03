// --- 1. UNIALERT SYSTEM (Custom Popup) ---
window.UniAlert = function(msg, btn1Text = "OK", btn2Text = null) {
    return new Promise((resolve) => {
        if (!document.getElementById('uni-alert-overlay')) {
            const html = `
                <div id="uni-alert-overlay" class="uni-alert-overlay">
                    <div class="uni-alert-box">
                        <p id="uni-alert-msg" class="uni-alert-msg"></p>
                        <div class="uni-alert-actions">
                            <button id="uni-btn-2" class="uni-btn uni-btn-secondary" style="display:none"></button>
                            <button id="uni-btn-1" class="uni-btn uni-btn-primary"></button>
                        </div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', html);
        }

        const overlay = document.getElementById('uni-alert-overlay');
        const msgEl = document.getElementById('uni-alert-msg');
        const btn1 = document.getElementById('uni-btn-1');
        const btn2 = document.getElementById('uni-btn-2');

        msgEl.innerText = msg;
        btn1.innerText = btn1Text;

        if (btn2Text) {
            btn2.innerText = btn2Text;
            btn2.style.display = "inline-block";
        } else {
            btn2.style.display = "none";
        }

        document.body.style.overflow = 'hidden';
        overlay.classList.add('active');

        function closeAlert(result) {
            overlay.classList.remove('active');
            document.body.style.overflow = '';
            
            btn1.onclick = null;
            btn2.onclick = null;
            
            setTimeout(() => {
                resolve(result);
            }, 200);
        }

        btn1.onclick = () => closeAlert(true);
        btn2.onclick = () => closeAlert(false);
    });
};
