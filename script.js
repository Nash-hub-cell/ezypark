// --- Firebase Initialization ---
// IMPORTANT: Replace with your actual Firebase project configuration.
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();


document.addEventListener('DOMContentLoaded', () => {
    // --- App Containers ---
    const authContainer = document.getElementById('auth-container');
    const appContainer = document.getElementById('app-container');

    // --- Auth Forms & Buttons ---
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    const showSignup = document.getElementById('show-signup');
    const showLogin = document.getElementById('show-login');
    const signupButton = document.getElementById('signup-button');
    const loginButton = document.getElementById('login-button');
    const logoutButton = document.getElementById('logout-button');

    // --- Goal UI Elements ---
    const goalModal = document.getElementById('goal-modal');
    const addGoalButton = document.getElementById('add-goal-button');
    const goalForm = document.getElementById('goal-form');
    const goalsList = document.getElementById('goals-list');
    const modalTitle = document.getElementById('modal-title');
    const goalIdInput = document.getElementById('goal-id');
    const goalTitleInput = document.getElementById('goal-title');
    const goalDescriptionInput = document.getElementById('goal-description');

    // --- Progress UI Elements ---
    const progressModal = document.getElementById('progress-modal');
    const progressModalTitle = document.getElementById('progress-modal-title');
    const progressList = document.getElementById('progress-list');
    const progressForm = document.getElementById('progress-form');
    const progressValueInput = document.getElementById('progress-value');
    const progressNoteInput = document.getElementById('progress-note');
    const progressChartCanvas = document.getElementById('progress-chart');

    // --- Message UI ---
    const motivationalMessageContainer = document.getElementById('motivational-message');

    // --- State Variables ---
    let goalsUnsubscribe = null;
    let progressUnsubscribe = null;
    let currentGoalId = null;
    let progressChart = null;

    // --- Motivational Quotes ---
    const motivationalQuotes = [
        "The secret of getting ahead is getting started.",
        "The journey of a thousand miles begins with a single step.",
        "Don’t watch the clock; do what it does. Keep going.",
        "Success is not final, failure is not fatal: it is the courage to continue that counts.",
        "Believe you can and you're halfway there."
    ];

    // --- Main Functions ---
    const displayMotivationalMessage = () => {
        const randomIndex = Math.floor(Math.random() * motivationalQuotes.length);
        motivationalMessageContainer.innerText = motivationalQuotes[randomIndex];
    };

    // --- Auth State Listener ---
    auth.onAuthStateChanged(user => {
        if (user) {
            authContainer.style.display = 'none';
            appContainer.style.display = 'block';
            displayMotivationalMessage();
            if (goalsUnsubscribe) goalsUnsubscribe();
            goalsUnsubscribe = db.collection('goals').where('userId', '==', user.uid)
                .orderBy('createdAt', 'desc')
                .onSnapshot(snapshot => {
                    renderGoals(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
                }, err => console.error("Error fetching goals: ", err));
        } else {
            authContainer.style.display = 'block';
            appContainer.style.display = 'none';
            if (goalsUnsubscribe) goalsUnsubscribe();
            if (progressUnsubscribe) progressUnsubscribe();
        }
    });

    // --- Modal UI Logic ---
    const openModal = (modal) => modal.classList.add('show');
    const closeModal = (modal) => {
        modal.classList.remove('show');
        if (modal === goalModal) {
            goalForm.reset();
            goalIdInput.value = '';
        } else if (modal === progressModal) {
            progressForm.reset();
            currentGoalId = null;
            if (progressUnsubscribe) progressUnsubscribe();
            if (progressChart) progressChart.destroy();
        }
    };

    addGoalButton.addEventListener('click', () => {
        modalTitle.innerText = 'Add a New Goal';
        openModal(goalModal);
    });

    goalModal.querySelector('.close-button').addEventListener('click', () => closeModal(goalModal));
    progressModal.querySelector('.close-button').addEventListener('click', () => closeModal(progressModal));

    window.addEventListener('click', (e) => {
        if (e.target == goalModal) closeModal(goalModal);
        if (e.target == progressModal) closeModal(progressModal);
    });

    // --- CRUD Logic for Goals ---
    const renderGoals = (goals) => {
        goalsList.innerHTML = '';
        if (goals.length === 0) {
            goalsList.innerHTML = '<p>You haven\'t set any goals yet. Let\'s add one!</p>';
            return;
        }
        goals.forEach(goal => {
            const goalEl = document.createElement('div');
            goalEl.className = 'goal-item';
            goalEl.setAttribute('data-id', goal.id);
            goalEl.innerHTML = `
                <div class="goal-info">
                    <h3>${goal.title}</h3>
                    <p>${goal.description || ''}</p>
                </div>
                <div class="actions">
                    <button class="edit-btn" data-id="${goal.id}">Edit</button>
                    <button class="delete-btn" data-id="${goal.id}">Delete</button>
                </div>
            `;
            goalsList.appendChild(goalEl);
        });
    };

    goalForm.addEventListener('submit', e => {
        e.preventDefault();
        const title = goalTitleInput.value;
        const description = goalDescriptionInput.value;
        const goalId = goalIdInput.value;
        const user = auth.currentUser;
        if (!title || !user) return;

        if (goalId) {
            db.collection('goals').doc(goalId).update({ title, description })
                .catch(err => console.error('Error updating goal:', err));
        } else {
            db.collection('goals').add({
                title, description, userId: user.uid,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            }).catch(err => console.error('Error adding goal:', err));
        }
        closeModal(goalModal);
    });

    goalsList.addEventListener('click', e => {
        const target = e.target;
        const goalItem = target.closest('.goal-item');
        if (!goalItem) return;
        const id = goalItem.dataset.id;

        if (target.classList.contains('delete-btn')) {
            if (confirm('Are you sure you want to delete this goal?')) {
                db.collection('goals').doc(id).delete().catch(err => console.error('Error deleting goal:', err));
            }
        } else if (target.classList.contains('edit-btn')) {
            db.collection('goals').doc(id).get().then(doc => {
                if (doc.exists) {
                    const goal = doc.data();
                    modalTitle.innerText = 'Edit Goal';
                    goalIdInput.value = id;
                    goalTitleInput.value = goal.title;
                    goalDescriptionInput.value = goal.description;
                    openModal(goalModal);
                }
            });
        } else {
            currentGoalId = id;
            db.collection('goals').doc(id).get().then(doc => {
                progressModalTitle.innerText = `Progress for "${doc.data().title}"`;
            });
            openModal(progressModal);

            if (progressUnsubscribe) progressUnsubscribe();
            progressUnsubscribe = db.collection('goals').doc(id).collection('progress')
                .orderBy('createdAt', 'asc')
                .onSnapshot(snapshot => {
                    const progressEntries = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    renderProgress(progressEntries.slice().reverse());
                    renderChart(progressEntries);
                }, err => console.error("Error fetching progress: ", err));
        }
    });

    // --- CRUD Logic for Progress ---
    const renderProgress = (progressEntries) => {
        progressList.innerHTML = '';
        if (progressEntries.length === 0) {
            progressList.innerHTML = '<p>No progress logged yet. Add your first entry!</p>';
            return;
        }
        progressEntries.forEach(entry => {
            const progressEl = document.createElement('div');
            progressEl.className = 'progress-item';
            const date = entry.createdAt ? entry.createdAt.toDate().toLocaleDateString() : 'Just now';
            progressEl.innerHTML = `
                <p class="note"><strong>Value: ${entry.value}</strong> - ${entry.note || ''}</p>
                <p class="date">${date}</p>
            `;
            progressList.appendChild(progressEl);
        });
    };

    const renderChart = (progressEntries) => {
        if (progressChart) progressChart.destroy();
        const labels = progressEntries.map(entry => entry.createdAt ? entry.createdAt.toDate().toLocaleDateString() : '');
        const data = progressEntries.map(entry => entry.value);

        progressChart = new Chart(progressChartCanvas, {
            type: 'line', data: { labels: labels,
                datasets: [{ label: 'Progress Over Time', data: data, borderColor: 'var(--primary-color)',
                    backgroundColor: 'rgba(13, 138, 110, 0.1)', fill: true, tension: 0.1 }]
            },
            options: { scales: { y: { beginAtZero: true } }, responsive: true, maintainAspectRatio: false }
        });
    };

    progressForm.addEventListener('submit', e => {
        e.preventDefault();
        const value = parseFloat(progressValueInput.value);
        const note = progressNoteInput.value;
        if (isNaN(value) || !currentGoalId) { alert('Please enter a valid number for the value.'); return; }

        db.collection('goals').doc(currentGoalId).collection('progress').add({
            value, note, createdAt: firebase.firestore.FieldValue.serverTimestamp()
        }).then(() => {
            progressForm.reset();
        }).catch(err => console.error("Error logging progress:", err));
    });

    // --- Auth Logic ---
    showSignup.addEventListener('click', (e) => { e.preventDefault(); loginForm.style.display = 'none'; signupForm.style.display = 'block'; });
    showLogin.addEventListener('click', (e) => { e.preventDefault(); signupForm.style.display = 'none'; loginForm.style.display = 'block'; });
    signupButton.addEventListener('click', () => {
        const email = document.getElementById('signup-email').value;
        const password = document.getElementById('signup-password').value;
        if (!email || !password) { alert("Please enter both email and password."); return; }
        auth.createUserWithEmailAndPassword(email, password).catch(err => alert(`Error: ${err.message}`));
    });
    loginButton.addEventListener('click', () => {
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        if (!email || !password) { alert("Please enter both email and password."); return; }
        auth.signInWithEmailAndPassword(email, password).catch(err => alert(`Error: ${err.message}`));
    });
    logoutButton.addEventListener('click', () => auth.signOut());
});

console.log("Welcome to We-Up! The journey of a thousand miles begins with a single step.");
