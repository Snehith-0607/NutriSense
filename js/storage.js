// nutrisense/js/storage.js

const Storage = {
    KEYS: {
        USER: 'ns_user',
        MEALS: 'ns_meals_' // appended with YYYY-MM-DD
    },

    getTodayStr() {
        const today = new Date();
        return today.toISOString().split('T')[0];
    },

    getUser() {
        const data = localStorage.getItem(this.KEYS.USER);
        return data ? JSON.parse(data) : null;
    },

    saveUser(user) {
        localStorage.setItem(this.KEYS.USER, JSON.stringify(user));
    },

    setUserGoal(goalType) {
        let targets = {};
        if (goalType === 'weight_loss') {
            targets = { calories: 1500, protein: 120, carbs: 130, fat: 50 };
        } else if (goalType === 'muscle_gain') {
            targets = { calories: 2600, protein: 180, carbs: 300, fat: 75 };
        } else {
            // balanced fallback
            targets = { calories: 2000, protein: 100, carbs: 250, fat: 65 };
        }

        const user = {
            goalType,
            targets,
            onboarded: true
        };
        this.saveUser(user);
        return user;
    },

    getMeals(dateStr = this.getTodayStr()) {
        const data = localStorage.getItem(this.KEYS.MEALS + dateStr);
        return data ? JSON.parse(data) : [];
    },

    saveMeal(mealItem) {
        const dateStr = this.getTodayStr();
        const meals = this.getMeals(dateStr);
        meals.push({
            ...mealItem,
            id: Date.now().toString(),
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
        localStorage.setItem(this.KEYS.MEALS + dateStr, JSON.stringify(meals));
        return meals;
    },

    getDailyProgress() {
        const user = this.getUser();
        if (!user) return null;

        const meals = this.getMeals();
        let totals = { calories: 0, protein: 0, carbs: 0, fat: 0, score: 100 };

        meals.forEach(m => {
            totals.calories += m.calories || 0;
            totals.protein += m.protein || 0;
            totals.carbs += m.carbs || 0;
            totals.fat += m.fat || 0;
        });

        // Simple Health Score Calculation
        // Start at 100, reduce for high fat, over calories. Increase for good protein.
        let score = 100;
        
        // Penalize overeating
        if (totals.calories > user.targets.calories) {
            score -= ((totals.calories - user.targets.calories) / 100) * 5; 
        }
        
        // Penalize high fat
        if (totals.fat > user.targets.fat) {
            score -= ((totals.fat - user.targets.fat) / 10) * 2;
        }

        // Reward protein (if close to target)
        if (totals.protein >= user.targets.protein * 0.8) {
            score += 5;
        }

        // Clamp
        score = Math.max(0, Math.min(100, Math.round(score)));
        totals.score = score;

        return {
            user,
            totals,
            meals
        };
    },

    clearData() {
        localStorage.clear();
    }
};

window.Storage = Storage;
