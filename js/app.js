// nutrisense/js/app.js

const App = {
    currentMealResult: null,
    elements: {}, // Cached DOM references

    /**
     * Initializes the application.
     * Caches DOM selectors, checks local storage for user state, and routes to appropriate view.
     */
    init() {
        this.cacheDOM();

        const user = window.Storage.getUser();
        if (!user || !user.onboarded) {
            this.showView('view-onboarding');
        } else {
            this.showView('view-dashboard');
            this.updateDashboard();
        }

        // Set date on dashboard header
        const options = { weekday: 'short', day: 'numeric', month: 'short' };
        if (this.elements.dashDate) {
            this.elements.dashDate.innerText = new Date().toLocaleDateString('en-US', options);
        }
    },

    /**
     * Caches all frequently accessed DOM elements to improve performance
     * and reduce redundant DOM queries.
     */
    cacheDOM() {
        this.elements = {
            views: document.querySelectorAll('.view'),
            dashDate: document.getElementById('dash-date'),
            scoreEl: document.getElementById('dash-score'),
            scoreRing: document.getElementById('score-ring'),
            calConsumed: document.getElementById('dash-cal-consumed'),
            calTarget: document.getElementById('dash-cal-target'),
            calBar: document.getElementById('cal-bar'),
            protVal: document.getElementById('dash-prot'),
            carbVal: document.getElementById('dash-carb'),
            fatVal: document.getElementById('dash-fat'),
            timeline: document.getElementById('meal-timeline'),
            insightText: document.getElementById('dash-insight-text'),
            mealInput: document.getElementById('meal-input'),
            loggerLoading: document.getElementById('logger-loading'),
            inputCard: document.querySelector('.input-card'),
            resultContainer: document.getElementById('result-container'),
            chatInput: document.getElementById('chat-input'),
            chatWindow: document.getElementById('chat-window'),
            errorBanner: null // dynamically created
        };
    },

    /**
     * Handles view switching (routing).
     * @param {string} viewId - ID of the target view container to show.
     */
    showView(viewId) {
        this.elements.views.forEach(v => v.classList.remove('active-view'));
        const target = document.getElementById(viewId);
        if (target) {
            target.classList.add('active-view');
        }
        window.scrollTo(0, 0);

        if (viewId === 'view-dashboard') {
            this.updateDashboard();
        }
    },

    selectGoal(goalType) {
        window.Storage.setUserGoal(goalType);
        this.showView('view-dashboard');
    },

    /**
     * Coordinates the refresh of the Dashboard View.
     * Computes the latest health score, updates all SVG rings and progress bars,
     * populates the timeline, and auto-generates the 'Next Meal' insight.
     */
    updateDashboard() {
        const progress = window.Storage.getDailyProgress();
        if (!progress) return;

        const { totals, user, meals } = progress;

        // --- 1. Health Score Render ---
        this.elements.scoreEl.innerText = totals.score;

        let strokeColor = 'var(--color-success)'; // Green
        if (totals.score < 50) strokeColor = 'var(--color-error)'; // Red
        else if (totals.score < 80) strokeColor = 'var(--color-warning)'; // Yellow

        this.elements.scoreRing.style.stroke = strokeColor;
        // SVG circle dashoffset trick based on 283 circumference
        const offset = 283 - (283 * (totals.score / 100));
        setTimeout(() => { this.elements.scoreRing.style.strokeDashoffset = offset; }, 100);

        // --- 2. Calories Render ---
        this.elements.calConsumed.innerText = totals.calories;
        this.elements.calTarget.innerText = `/ ${user.targets.calories} kcal`;
        let calPct = Math.min(100, (totals.calories / user.targets.calories) * 100);
        this.elements.calBar.style.width = calPct + '%';
        if (calPct >= 100) this.elements.calBar.style.background = 'var(--color-error)';

        // --- 3. Macros Render ---
        this.elements.protVal.innerText = `${totals.protein}g / ${user.targets.protein}g`;
        this.setMacroRing('prot-ring', totals.protein, user.targets.protein);

        this.elements.carbVal.innerText = `${totals.carbs}g / ${user.targets.carbs}g`;
        this.setMacroRing('carb-ring', totals.carbs, user.targets.carbs);

        this.elements.fatVal.innerText = `${totals.fat}g / ${user.targets.fat}g`;
        this.setMacroRing('fat-ring', totals.fat, user.targets.fat);

        // --- 4. Timeline Update ---
        this.elements.timeline.innerHTML = '';
        if (meals.length === 0) {
            this.elements.timeline.innerHTML = `<p style="text-align:center; padding: 20px;">No meals logged today.</p>`;
        } else {
            meals.reverse().forEach(m => {
                this.elements.timeline.innerHTML += `
                    <div class="meal-card">
                        <div class="meal-info">
                            <h4>${m.food_items[0] || 'Meal'} ${m.food_items.length > 1 ? `+${m.food_items.length-1}` : ''}</h4>
                            <span>Logged at ${m.time}</span>
                        </div>
                        <div class="meal-cal">${m.calories} kcal</div>
                    </div>
                `;
            });
        }
        
        // --- 5. Insight Logic (What should I eat next?) ---
        const calLeft = user.targets.calories - totals.calories;
        if (calLeft < 0) {
            this.elements.insightText.innerText = `You are ${Math.abs(calLeft)} kcal over your limit. Consider resting digestion tracking!`;
        } else if (totals.protein < user.targets.protein * 0.5) {
            this.elements.insightText.innerText = "You're running low on protein today. Add some paneer, eggs, or lentils to your next meal.";
        } else {
            this.elements.insightText.innerText = `You have ${calLeft} kcal remaining. Perfect time for a balanced meal to hit your goals.`;
        }
    },

    setMacroRing(id, value, target) {
        const ring = document.getElementById(id);
        // radius 16 -> circumference ~ 100 (100.53)
        const pct = Math.min(1, value / target);
        // dashoffset starts at 100
        setTimeout(() => { ring.style.strokeDashoffset = 100 - (100 * pct); }, 100);
    },

    /**
     * Reads user input, calls the AI module for mocked extraction, and handles state.
     * Incorporates user-friendly non-breaking error handling.
     */
    async analyzeMeal() {
        const input = this.elements.mealInput.value;
        if (!input.trim()) {
            this.showError("Please enter a meal description first.");
            return;
        }

        this.elements.loggerLoading.classList.remove('hidden');
        this.elements.inputCard.classList.add('hidden');
        
        try {
            const result = await window.AI.analyzeFood(input);
            this.currentMealResult = result;
            this.renderResult(result);
            this.elements.mealInput.value = ""; // clear
            this.showView('view-result');
        } catch (e) {
            console.error(e);
            this.showError("We couldn't analyze the meal right now. Please try again.");
        } finally {
            this.elements.loggerLoading.classList.add('hidden');
            this.elements.inputCard.classList.remove('hidden');
        }
    },

    /**
     * Non-intrusive lightweight alert overlay to display warnings to the user.
     * @param {string} message - Error text
     */
    showError(message) {
        if (!this.elements.errorBanner) {
            const banner = document.createElement('div');
            banner.style.cssText = "position: fixed; top: 20px; left: 50%; transform: translateX(-50%); background: var(--color-error); color: white; padding: 12px 24px; border-radius: 8px; z-index: 1000; transition: opacity 0.3s; box-shadow: 0 4px 12px rgba(0,0,0,0.15); font-weight: 500;";
            document.body.appendChild(banner);
            this.elements.errorBanner = banner;
        }
        this.elements.errorBanner.innerText = message;
        this.elements.errorBanner.style.opacity = '1';
        setTimeout(() => {
            this.elements.errorBanner.style.opacity = '0';
        }, 3000);
    },

    /**
     * Renders the structured mock response payload into the Result UI view.
     * @param {Object} r - The analyzed meal payload
     */
    renderResult(r) {
        const container = this.elements.resultContainer;
        let tagsHtml = r.food_items.map(i => `<span class="tag">${i}</span>`).join('');
        
        container.innerHTML = `
            <div class="result-box">
                <div class="r-title">Detected Items</div>
                <div class="tag-list">${tagsHtml}</div>
                
                <div class="r-title">Nutrition Overview</div>
                <div class="result-macros">
                    <div class="rm-item"><span class="lbl">Calories</span><span class="val">${r.calories} kcal</span></div>
                    <div class="rm-item"><span class="lbl">Health Score</span><span class="val text-teal">${r.health_score} / 100</span></div>
                    <div class="rm-item"><span class="lbl">Protein</span><span class="val">${r.protein}g</span></div>
                    <div class="rm-item"><span class="lbl">Carbs</span><span class="val">${r.carbs}g</span></div>
                    <div class="rm-item"><span class="lbl">Fat</span><span class="val">${r.fat}g</span></div>
                </div>
            </div>
            <div class="ai-insight-card" style="cursor:default; transform:none;">
                <div class="ai-icon"><i class="ri-lightbulb-flash-line"></i></div>
                <div class="ai-content">
                    <h4>AI Insight</h4>
                    <p>${r.insight} <br/> <strong>Tip:</strong> ${r.suggestion}</p>
                </div>
            </div>
        `;
    },

    saveMeal() {
        if (!this.currentMealResult) return;
        window.Storage.saveMeal(this.currentMealResult);
        this.currentMealResult = null;
        this.showView('view-dashboard');
    },

    /**
     * Handles the submit action on the AI Coaching chat interface.
     * Resolves the response and binds it to the list.
     */
    async sendMessage() {
        const input = this.elements.chatInput;
        const text = input.value.trim();
        if (!text) return;

        this.appendMessage('user', text);
        input.value = "";
        
        const progress = window.Storage.getDailyProgress();
        const response = await window.AI.chat(progress, text);
        
        this.appendMessage('system', response.content);
    },

    appendMessage(role, text) {
        const win = this.elements.chatWindow;
        if (!win) return;
        const msgDiv = document.createElement('div');
        msgDiv.className = `message ${role === 'user' ? 'user-msg' : 'system-msg'}`;
        msgDiv.innerHTML = `<div class="bubble">${text}</div>`;
        win.appendChild(msgDiv);
        win.scrollTop = win.scrollHeight;
    },

    handleChatKeyPress(e) {
        if (e.key === 'Enter') {
            this.sendMessage();
        }
    }
};

window.app = App;

// Bootstrap
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
