// content_bridge.js - Runs in Chrome Extension "world": "ISOLATED"
// Relays CustomEvents from content_main.js (Main World) to background.js Service Worker

console.log("🛡️ HG-CLM / CIDPS Extension Bridge Active.");

window.addEventListener('HG_CLM_REQUEST', (event) => {
    if (!event.detail) return;
    const requestId = event.detail.requestId;
    const promptText = event.detail.prompt;

    chrome.runtime.sendMessage({
        type: "CHECK_PROMPT_GOVERNANCE",
        prompt: promptText
    }, (response) => {
        const err = chrome.runtime.lastError;
        const respData = err ? { safe: true, warning: err.message } : response;

        window.dispatchEvent(new CustomEvent('HG_CLM_RESPONSE', {
            detail: { requestId: requestId, response: respData }
        }));
    });
});

window.addEventListener('HG_CLM_INSPECT_RESPONSE_REQUEST', (event) => {
    if (!event.detail) return;
    const requestId = event.detail.requestId;
    const responseText = event.detail.responseText;

    chrome.runtime.sendMessage({
        type: "CHECK_RESPONSE_GOVERNANCE",
        responseText: responseText
    }, (response) => {
        const err = chrome.runtime.lastError;
        const respData = err ? { safe: true } : response;

        window.dispatchEvent(new CustomEvent('HG_CLM_INSPECT_RESPONSE_REPLY', {
            detail: { requestId: requestId, response: respData }
        }));
    });
});
