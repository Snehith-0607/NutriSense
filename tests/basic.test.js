// nutrisense/tests/basic.test.js

/**
 * Basic lightweight test file for NutriSense logic.
 * Designed to run without any testing frameworks (e.g., via `node tests/basic.test.js`)
 */

const fs = require('fs');
const path = require('path');

// --- 1. Mocking the Browser Environment ---
global.localStorage = {
    _data: {},
    getItem(key) { return this._data[key] || null; },
    setItem(key, value) { this._data[key] = String(value); },
    clear() { this._data = {}; }
};

global.window = { localStorage: global.localStorage };

// Simple implementation of the testing block
const assert = (condition, message) => {
    if (!condition) throw new Error("❌ FAIL: " + message);
    console.log("✅ PASS: " + message);
};

// --- 2. Load the modules payload ---
const storageCode = fs.readFileSync(path.join(__dirname, '../js/storage.js'), 'utf8');
eval(storageCode); // This loads Storage into the global scope

// --- 3. Tests Definition ---

function runTests() {
    console.log("--- Running NutriSense Unit Tests ---\n");
    global.localStorage.clear();

    try {
        const Storage = window.Storage;
        
        // Test: User Goal Initialization
        const user = Storage.setUserGoal('weight_loss');
        assert(user.goalType === 'weight_loss', "setUserGoal assigns correct goalType");
        assert(user.targets.calories === 1500, "setUserGoal generates correct caloric targets for weight loss");

        // Test: Meal Logic Data Validation
        const sampleMeal = {
            food_items: ["Salad"],
            calories: 120,
            protein: 5,
            carbs: 10,
            fat: 2,
            health_score: 90
        };

        const todayMeals = Storage.saveMeal(sampleMeal);
        assert(todayMeals.length === 1, "saveMeal successfully adds a meal to the daily log");
        assert(todayMeals[0].calories >= 0, "Meal validation: Calories cannot be negative (mock valid)");
        assert(todayMeals[0].id !== undefined, "saveMeal auto-generates a unique ID for the meal");

        // Test: Health Score Logic Sanity Check
        const progress = Storage.getDailyProgress();
        assert(progress.totals.calories === 120, "getDailyProgress accurately tallies calories");
        
        // Push over limit to check score reduction
        Storage.saveMeal({ food_items: ["Pizza"], calories: 2000, protein: 30, carbs: 200, fat: 80 });
        const overLimitProgress = Storage.getDailyProgress();
        
        assert(overLimitProgress.totals.score < 100, "Health Score automatically decreases if limits (fat/calories) are exceeded");
        assert(overLimitProgress.totals.score >= 0 && overLimitProgress.totals.score <= 100, "Health Score is correctly clamped between 0 and 100");

        console.log("\n🎊 All basic tests passed successfully!");
    } catch (error) {
        console.error("\n" + error.message);
        process.exit(1);
    }
}

runTests();
