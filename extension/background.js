// background.js - HG-CLM Service Worker & Governance Engine

chrome.action.onClicked.addListener((tab) => {
    chrome.sidePanel.open({ windowId: tab.windowId });
});

// Helper to recursively find user prompt strings inside any nested JSON structure
function extractTextFromJSON(obj) {
    if (!obj) return "";
    if (typeof obj === 'string') return obj;
    if (Array.isArray(obj)) return obj.map(extractTextFromJSON).join(" ");
    if (typeof obj === 'object') {
        let texts = [];
        const targetKeys = ["content", "parts", "text", "prompt", "message", "input", "query", "user_input"];
        for (const key of targetKeys) {
            if (obj[key]) {
                texts.push(extractTextFromJSON(obj[key]));
            }
        }
        if (texts.length > 0) return texts.join(" ");
        for (const k in obj) {
            if (typeof obj[k] === 'string' && obj[k].length > 2) {
                texts.push(obj[k]);
            }
        }
        return texts.join(" ");
    }
    return "";
}

// Relays messages and performs background governance check against local_server.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === "CHECK_PROMPT_GOVERNANCE") {
        let promptText = request.prompt || "";
        
        try {
            if (typeof promptText === 'string' && (promptText.trim().startsWith('{') || promptText.trim().startsWith('['))) {
                const parsed = JSON.parse(promptText);
                const extracted = extractTextFromJSON(parsed);
                if (extracted && extracted.trim()) {
                    promptText = extracted;
                }
            }
        } catch (e) {}

        const promptLower = promptText.toLowerCase().trim();

        // Conversational Greetings & Short Prompts Bypass
        const greetings = ["hello", "hi", "hey", "greetings", "good morning", "thanks", "thank you", "ok", "okay"];
        const wordCount = promptLower.split(/\s+/).length;
        const isGreeting = greetings.some(g => promptLower === g || promptLower.startsWith(g + " ") || promptLower.startsWith(g + ","));

        if (isGreeting || wordCount < 3) {
            sendResponse({ safe: true, reason: "Conversational greeting or short prompt passed." });
            return;
        }

        // Fetch active state from chrome.storage.local or local_server.js
        chrome.storage.local.get(['hg_clm_state'], async (result) => {
            const state = result.hg_clm_state || {
                goal: "Research effective neuromarketing tools strictly focusing on eye tracking",
                constraints: [
                    "don't allow EEG, Fmri, PET, GSC related search"
                ],
                backendUrl: "http://localhost:8080"
            };

            try {
                const res = await fetch(`${state.backendUrl || 'http://localhost:8080'}/inspect_prompt`, {
                    method: "POST",
                    headers: { 
                        "Content-Type": "application/json",
                        "Bypass-Tunnel-Reminder": "true" 
                    },
                    body: JSON.stringify({
                        prompt: promptText,
                        goal: state.goal,
                        constraints: state.constraints,
                        decisions: state.decisions || []
                    })
                });

                const data = await res.json();
                if (data.safe === false) {
                    sendResponse({ safe: false, reason: data.reason });
                    return;
                }
            } catch (e) {
                console.warn("HG-CLM Background: API backend offline, passing locally.", e.message);
            }

            sendResponse({ safe: true });
        });

        return true;
    }

    if (request.type === "CHECK_RESPONSE_GOVERNANCE") {
        const responseText = request.responseText || "";
        chrome.storage.local.get(['hg_clm_state'], async (result) => {
            const state = result.hg_clm_state || {
                goal: "Research effective neuromarketing tools strictly focusing on eye tracking",
                constraints: [ "don't allow EEG, Fmri, PET, GSC related search" ],
                backendUrl: "http://localhost:8080"
            };

            try {
                const res = await fetch(`${state.backendUrl || 'http://localhost:8080'}/inspect_response`, {
                    method: "POST",
                    headers: { 
                        "Content-Type": "application/json",
                        "Bypass-Tunnel-Reminder": "true" 
                    },
                    body: JSON.stringify({
                        responseText: responseText,
                        goal: state.goal,
                        constraints: state.constraints,
                        decisions: state.decisions || []
                    })
                });

                const data = await res.json();
                sendResponse(data);
            } catch (e) {
                sendResponse({ safe: true, reason: "Backend offline" });
            }
        });

        return true;
    }
});
