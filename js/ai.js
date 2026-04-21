// nutrisense/js/ai.js

const AI = {
    // We would use fetch to an API here. For now, realistic mock parsing.
    async analyzeFood(input) {
        return new Promise((resolve) => {
            setTimeout(() => {
                const lowerInput = input.toLowerCase();
                let mockResult = {
                    food_items: [],
                    calories: 0,
                    protein: 0,
                    carbs: 0,
                    fat: 0,
                    health_score: 80,
                    insight: "Balanced meal",
                    suggestion: "Drink a glass of water after this."
                };

                // Realistic Mock Logic based on Indian foods
                if (lowerInput.includes('roti') && lowerInput.includes('dal')) {
                    mockResult = {
                        food_items: ["Wheat Roti (2)", "Yellow Dal (1 bowl)", "Mixed Sabzi"],
                        calories: 450,
                        protein: 18,
                        carbs: 65,
                        fat: 12,
                        health_score: 85,
                        insight: "Great source of complex carbs and plant protein.",
                        suggestion: "Consider adding a side of cucumber salad for more fiber."
                    };
                } else if (lowerInput.includes('paneer') || lowerInput.includes('butter masala')) {
                    mockResult = {
                        food_items: ["Paneer Butter Masala", "Naan (1)"],
                        calories: 680,
                        protein: 22,
                        carbs: 45,
                        fat: 45,
                        health_score: 60,
                        insight: "High in fat and calories.",
                        suggestion: "Next time, try a tomato-based curry without cream to reduce fat."
                    };
                } else if (lowerInput.includes('salad') || lowerInput.includes('fruit')) {
                    mockResult = {
                        food_items: ["Mixed Fresh Salad"],
                        calories: 120,
                        protein: 3,
                        carbs: 25,
                        fat: 1,
                        health_score: 95,
                        insight: "Excellent low-calorie volume eating.",
                        suggestion: "Add a protein source like roasted chana or paneer to stay full longer."
                    };
                } else {
                    // Generic fallback
                    mockResult = {
                        food_items: ["Unknown Meal Component"],
                        calories: 350,
                        protein: 10,
                        carbs: 40,
                        fat: 15,
                        health_score: 70,
                        insight: "Moderate meal.",
                        suggestion: "Try to log specific items for better tracking."
                    };
                }

                resolve(mockResult);
            }, 1500); // 1.5s delay to simulate network
        });
    },

    async chat(userProgress, message) {
        return new Promise((resolve) => {
            setTimeout(() => {
                const lowerMsg = message.toLowerCase();
                let reply = "";

                // Context variables
                const { totals, user } = userProgress;
                const calLeft = user.targets.calories - totals.calories;

                if (lowerMsg.includes('what should i eat') || lowerMsg.includes('next')) {
                    if (calLeft > 500 && totals.protein < user.targets.protein * 0.7) {
                        reply = `You have ${calLeft} kcal left but are low on protein. I suggest a high-protein meal like Palak Paneer with a small portion of rice, or some Grilled Chicken/Soya Chunks.`;
                    } else if (calLeft > 300) {
                        reply = `You're tracking well. A small balanced snack like Poha or a bowl of Dal would fit nicely without going over your limits.`;
                    } else {
                        reply = `You only have ${Math.max(0, calLeft)} kcal left for today. Stick to something very light, like a cucumber salad or clear soup.`;
                    }
                } else if (lowerMsg.includes('balanced') || lowerMsg.includes('how am i doing')) {
                    if (totals.score >= 80) {
                        reply = `You're doing great! Your health score is ${totals.score}/100. Your macros are well-distributed. Keep it up!`;
                    } else {
                        reply = `Your health score is ${totals.score}/100. Watch out for foods high in fats or simple carbs. Let's aim for more protein with your next meal.`;
                    }
                } else if (lowerMsg.includes('high-protein') || lowerMsg.includes('dinner')) {
                    reply = `For a high-protein Indian dinner, try Egg Bhurji (with 3 egg whites), Low-fat Paneer Tikka, or a hearty bowl of Rajma with a side of greens.`;
                } else {
                    reply = `That's interesting! Based on your ${user.goalType.replace('_', ' ')} goal, always remember to prioritize whole foods. I'm here if you need meal suggestions!`;
                }

                resolve({ role: 'assistant', content: reply });
            }, 1000);
        });
    }
};

window.AI = AI;
