// --- Supabase Initialization ---
// IMPORTANT: Replace with your actual Supabase project URL and anon key.
const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';

// The 'supabase' object is loaded from the CDN script in index.html
const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Overwrite the global supabase object with our initialized client
// This is a bit of a hack to avoid changing all the supabase references below
window.supabase = supabaseClient;


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
    let goalsSubscription = null;
    let progressSubscription = null;
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
    supabase.auth.onAuthStateChange(async (event, session) => {
        if (session && session.user) {
            authContainer.style.display = 'none';
            appContainer.style.display = 'block';
            displayMotivationalMessage();
            await fetchAndRenderGoals(session.user);
        } else {
            authContainer.style.display = 'block';
            appContainer.style.display = 'none';
            if (goalsSubscription) goalsSubscription.unsubscribe();
            if (progressSubscription) progressSubscription.unsubscribe();
        }
    });

    // --- Auth Logic ---
    signupButton.addEventListener('click', async () => {
        const email = document.getElementById('signup-email').value;
        const password = document.getElementById('signup-password').value;
        if (!email || !password) { alert("Please enter both email and password."); return; }
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) alert(`Error signing up: ${error.message}`);
        else alert('Sign up successful! Please check your email to verify your account.');
    });

    loginButton.addEventListener('click', async () => {
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        if (!email || !password) { alert("Please enter both email and password."); return; }
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) alert(`Error logging in: ${error.message}`);
    });

    logoutButton.addEventListener('click', async () => {
        const { error } = await supabase.auth.signOut();
        if (error) alert(`Error logging out: ${error.message}`);
    });

    showSignup.addEventListener('click', (e) => { e.preventDefault(); loginForm.style.display = 'none'; signupForm.style.display = 'block'; });
    showLogin.addEventListener('click', (e) => { e.preventDefault(); signupForm.style.display = 'none'; loginForm.style.display = 'block'; });


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
            if (progressSubscription) progressSubscription.unsubscribe();
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
    const fetchAndRenderGoals = async (user) => {
        const { data: goals, error } = await supabase.from('goals').select('*').order('created_at', { ascending: false });
        if (error) { console.error('Error fetching goals:', error); return; }
        renderGoals(goals);

        if (goalsSubscription) goalsSubscription.unsubscribe();
        goalsSubscription = supabase.channel('public:goals')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'goals' }, () => fetchAndRenderGoals(user))
            .subscribe();
    };

    const renderGoals = (goals) => {
        goalsList.innerHTML = '';
        if (!goals || goals.length === 0) {
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

    goalForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const title = goalTitleInput.value;
        const description = goalDescriptionInput.value;
        const goalId = goalIdInput.value;
        const { data: { user } } = await supabase.auth.getUser();
        if (!title || !user) { alert("Title is required."); return; }

        const { error } = goalId
            ? await supabase.from('goals').update({ title, description }).eq('id', goalId)
            : await supabase.from('goals').insert({ title, description, user_id: user.id });

        if (error) alert(`Error saving goal: ${error.message}`);
        closeModal(goalModal);
    });

    goalsList.addEventListener('click', async (e) => {
        const target = e.target;
        const goalItem = target.closest('.goal-item');
        if (!goalItem) return;
        const id = goalItem.dataset.id;

        if (target.classList.contains('delete-btn')) {
            if (confirm('Are you sure you want to delete this goal?')) {
                const { error } = await supabase.from('goals').delete().eq('id', id);
                if (error) alert(`Error deleting goal: ${error.message}`);
            }
        } else if (target.classList.contains('edit-btn')) {
            const { data: goal, error } = await supabase.from('goals').select('*').eq('id', id).single();
            if (error) { alert(`Error fetching goal: ${error.message}`); }
            else {
                modalTitle.innerText = 'Edit Goal';
                goalIdInput.value = id;
                goalTitleInput.value = goal.title;
                goalDescriptionInput.value = goal.description;
                openModal(goalModal);
            }
        } else {
            currentGoalId = id;
            const { data: goal } = await supabase.from('goals').select('title').eq('id', id).single();
            progressModalTitle.innerText = `Progress for "${goal.title}"`;
            fetchAndRenderProgress(id);
            openModal(progressModal);
        }
    });

    // --- CRUD Logic for Progress ---
    const fetchAndRenderProgress = async (goalId) => {
        const { data: progressEntries, error } = await supabase.from('progress').select('*').eq('goal_id', goalId).order('created_at', { ascending: true });
        if (error) { console.error('Error fetching progress:', error); return; }
        renderProgress(progressEntries);
        renderChart(progressEntries);

        if (progressSubscription) progressSubscription.unsubscribe();
        progressSubscription = supabase.channel(`public:progress:goal_id=eq.${goalId}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'progress', filter: `goal_id=eq.${goalId}` }, () => fetchAndRenderProgress(goalId))
            .subscribe();
    };

    const renderProgress = (progressEntries) => {
        progressList.innerHTML = '';
        if (!progressEntries || progressEntries.length === 0) {
            progressList.innerHTML = '<p>No progress logged yet. Add your first entry!</p>';
            return;
        }
        // Show newest first in the list
        progressEntries.slice().reverse().forEach(entry => {
            const progressEl = document.createElement('div');
            progressEl.className = 'progress-item';
            const date = new Date(entry.created_at).toLocaleDateString();
            progressEl.innerHTML = `
                <p class="note"><strong>Value: ${entry.value}</strong> - ${entry.note || ''}</p>
                <p class="date">${date}</p>
            `;
            progressList.appendChild(progressEl);
        });
    };

    const renderChart = (progressEntries) => {
        if (progressChart) progressChart.destroy();
        const labels = progressEntries.map(entry => new Date(entry.created_at).toLocaleDateString());
        const data = progressEntries.map(entry => entry.value);

        progressChart = new Chart(progressChartCanvas, {
            type: 'line', data: { labels: labels,
                datasets: [{ label: 'Progress Over Time', data: data, borderColor: 'var(--primary-color)',
                    backgroundColor: 'rgba(13, 138, 110, 0.1)', fill: true, tension: 0.1 }]
            },
            options: { scales: { y: { beginAtZero: true } }, responsive: true, maintainAspectRatio: false }
        });
    };

    progressForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const value = parseFloat(progressValueInput.value);
        const note = progressNoteInput.value;
        if (isNaN(value) || !currentGoalId) { alert('Please enter a valid number for the value.'); return; }

        const { error } = await supabase.from('progress').insert({ value, note, goal_id: currentGoalId });
        if (error) alert(`Error logging progress: ${error.message}`);
        else progressForm.reset();
    });
});

console.log("Welcome to We-Up! The journey of a thousand miles begins with a single step.");
