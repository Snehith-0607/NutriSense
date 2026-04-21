// nutrisense/js/ai.js

/**
 * AI Module
 * Acts as the interfacing layer for Artificial Intelligence queries.
 * Handles Mock Parsing for Food, and Real API requests for Chat.
 */
const AI = {
    /**
     * Simulates analyzing a food string via an AI API.
     * Enforces a structured JSON output with macros and health insights.
     * @param {string} input - The text description of the meal
     * @returns {Promise<Object>} The simulated AI response payload
     */
    async analyzeFood(input) {
        return new Promise((resolve, reject) => {
            if (!input || typeof input !== 'string') {
                return reject(new Error("Invalid input provided to AI module"));
            }

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

    /**
     * Sends a chat prompt to the external Aura AI backend.
     * Automatically appends user context (macros, goals) via a system prompt.
     * @param {Object} userProgress - The user's current goals and daily totals
     * @param {string} message - The user's typed message
     * @returns {Promise<Object>} The response object containing role and content
     */
    async chat(userProgress, message) {
        const { totals, user } = userProgress;
        const calLeft = user.targets.calories - totals.calories;
        const systemPrompt = `You are NutriSense, a helpful AI nutritionist specializing in Indian food.
Context: The user's goal is ${user.goalType}. 
They've consumed ${totals.calories} kcal today. 
They have ${Math.max(0, calLeft)} kcal remaining to hit their goal. 
Current macros: ${totals.protein}g protein, ${totals.carbs}g carbs, ${totals.fat}g fat.
Respond concisely and specifically to this user. Use modern, polite language.`;

        const messages = [
            { role: "user", content: systemPrompt },
            { role: "assistant", content: "Understood. I will use this context to answer." },
            { role: "user", content: message }
        ];

        try {
            const res = await fetch("https://chatbot-030u.onrender.com/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    messages: messages, 
                    apiKey: "AIzaSyArTwhwkuqwu4OUSzcvs9OO-4SIlkG_4_A" 
                }),
            });
            
            if (!res.ok) throw new Error("API response error");
            const data = await res.json();
            return { role: 'assistant', content: data.reply || "No response." };
            
        } catch (error) {
            console.error("Aura Chatbot API Error:", error);
            return { role: 'assistant', content: "Sorry, I am having trouble connecting right now." };
        }
    }
};

window.AI = AI;
