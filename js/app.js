// nutrisense/js/app.js

const App = {
    currentMealResult: null,

    init() {
        const user = window.Storage.getUser();
        if (!user || !user.onboarded) {
            this.showView('view-onboarding');
        } else {
            this.showView('view-dashboard');
            this.updateDashboard();
        }

        // Set date
        const options = { weekday: 'short', day: 'numeric', month: 'short' };
        document.getElementById('dash-date').innerText = new Date().toLocaleDateString('en-US', options);
    },

    showView(viewId) {
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active-view'));
        document.getElementById(viewId).classList.add('active-view');
        window.scrollTo(0, 0);

        if (viewId === 'view-dashboard') {
            this.updateDashboard();
        }
    },

    selectGoal(goalType) {
        window.Storage.setUserGoal(goalType);
        this.showView('view-dashboard');
    },

    updateDashboard() {
        const progress = window.Storage.getDailyProgress();
        if (!progress) return;

        const { totals, user, meals } = progress;

        // Health Score
        const scoreEl = document.getElementById('dash-score');
        const scoreRing = document.getElementById('score-ring');
        scoreEl.innerText = totals.score;

        let strokeColor = 'var(--color-success)'; // Green
        if (totals.score < 50) strokeColor = 'var(--color-error)'; // Red
        else if (totals.score < 80) strokeColor = 'var(--color-warning)'; // Yellow

        scoreRing.style.stroke = strokeColor;
        // Dasharray is 283 (2 * pi * r, r=45)
        const offset = 283 - (283 * (totals.score / 100));
        setTimeout(() => { scoreRing.style.strokeDashoffset = offset; }, 100);

        // Calories
        document.getElementById('dash-cal-consumed').innerText = totals.calories;
        document.getElementById('dash-cal-target').innerText = `/ ${user.targets.calories} kcal`;
        let calPct = Math.min(100, (totals.calories / user.targets.calories) * 100);
        document.getElementById('cal-bar').style.width = calPct + '%';
        if (calPct >= 100) document.getElementById('cal-bar').style.background = 'var(--color-error)';

        // Macros
        document.getElementById('dash-prot').innerText = `${totals.protein}g / ${user.targets.protein}g`;
        this.setMacroRing('prot-ring', totals.protein, user.targets.protein);

        document.getElementById('dash-carb').innerText = `${totals.carbs}g / ${user.targets.carbs}g`;
        this.setMacroRing('carb-ring', totals.carbs, user.targets.carbs);

        document.getElementById('dash-fat').innerText = `${totals.fat}g / ${user.targets.fat}g`;
        this.setMacroRing('fat-ring', totals.fat, user.targets.fat);

        // Timeline Update
        const timeline = document.getElementById('meal-timeline');
        timeline.innerHTML = '';
        if (meals.length === 0) {
            timeline.innerHTML = `<p style="text-align:center; padding: 20px;">No meals logged today.</p>`;
        } else {
            meals.reverse().forEach(m => {
                timeline.innerHTML += `
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
        
        // Update Insight Card safely
        const insightText = document.getElementById('dash-insight-text');
        const calLeft = user.targets.calories - totals.calories;
        if (calLeft < 0) {
            insightText.innerText = `You are ${Math.abs(calLeft)} kcal over your limit. Stick to water or tea!`;
        } else if (totals.protein < user.targets.protein * 0.5) {
            insightText.innerText = "You're running low on protein today. Add some paneer, eggs, or lentils.";
        } else {
            insightText.innerText = `You have ${calLeft} kcal remaining. Perfect time for a balanced meal.`;
        }
    },

    setMacroRing(id, value, target) {
        const ring = document.getElementById(id);
        // radius 16 -> circumference ~ 100 (100.53)
        const pct = Math.min(1, value / target);
        // dashoffset starts at 100
        setTimeout(() => { ring.style.strokeDashoffset = 100 - (100 * pct); }, 100);
    },

    async analyzeMeal() {
        const input = document.getElementById('meal-input').value;
        if (!input.trim()) return alert("Please enter a meal description.");

        document.getElementById('logger-loading').classList.remove('hidden');
        document.querySelector('.input-card').classList.add('hidden');
        
        try {
            const result = await window.AI.analyzeFood(input);
            this.currentMealResult = result;
            this.renderResult(result);
            document.getElementById('meal-input').value = ""; // clear
            this.showView('view-result');
        } catch (e) {
            alert('Error analyzing meal');
        } finally {
            document.getElementById('logger-loading').classList.add('hidden');
            document.querySelector('.input-card').classList.remove('hidden');
        }
    },

    renderResult(r) {
        const container = document.getElementById('result-container');
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

    async sendMessage() {
        const input = document.getElementById('chat-input');
        const text = input.value.trim();
        if (!text) return;

        this.appendMessage('user', text);
        input.value = "";
        
        const progress = window.Storage.getDailyProgress();
        const response = await window.AI.chat(progress, text);
        
        this.appendMessage('system', response.content);
    },

    appendMessage(role, text) {
        const win = document.getElementById('chat-window');
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
