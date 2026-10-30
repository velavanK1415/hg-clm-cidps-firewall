// content_main.js - HG-CLM Universal Data Plane Interceptor for Tusk Search, ChatGPT, Claude, DeepSeek, Qwen

console.log("🛡️ HG-CLM / CIDPS Universal Control Plane Interceptor Active.");

function createVisualBadge() {
    if (document.getElementById('hg-clm-badge')) return;
    const parent = document.body || document.documentElement;
    if (!parent) return;

    const badge = document.createElement('div');
    badge.id = 'hg-clm-badge';
    badge.style.cssText = `
        position: fixed;
        bottom: 12px;
        left: 12px;
        z-index: 999999;
        background: #181825;
        color: #89b4fa;
        border: 1px solid #45475a;
        padding: 6px 10px;
        border-radius: 6px;
        font-family: monospace;
        font-size: 11px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.4);
        display: flex;
        align-items: center;
        gap: 6px;
        pointer-events: none;
    `;
    badge.innerHTML = `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#a6e3a1;"></span> 🛡️ HG-CLM Active`;
    parent.appendChild(badge);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createVisualBadge);
} else {
    createVisualBadge();
}

setInterval(createVisualBadge, 1500);

// Helper to inspect payload text and resolve governance check
async function inspectPayloadAndGovern(bodyStr) {
    const badge = document.getElementById('hg-clm-badge');
    if (badge) badge.innerHTML = `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#f9e2af;"></span> 🛡️ Inspecting Payload...`;

    const requestId = 'net_' + Date.now() + '_' + Math.random();
    
    const validationPromise = new Promise((resolve) => {
        function onResponse(e) {
            if (e.detail && e.detail.requestId === requestId) {
                window.removeEventListener('HG_CLM_RESPONSE', onResponse);
                resolve(e.detail.response);
            }
        }
        window.addEventListener('HG_CLM_RESPONSE', onResponse);
        window.dispatchEvent(new CustomEvent('HG_CLM_REQUEST', {
            detail: { requestId: requestId, prompt: bodyStr }
        }));
    });

    const result = await validationPromise;

    if (result && result.safe === false) {
        console.warn("🚨 HG-CLM NETWORK INTERCEPTOR BLOCKED TRANSMISSION:", result.reason);
        if (badge) badge.innerHTML = `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#f38ba8;"></span> 🚨 NETWORK BLOCKED`;

        alert("🚨 HG-CLM COGNITIVE INTRUSION PREVENTED:\n\n" + result.reason + "\n\nNetwork transmission has been blocked.");

        setTimeout(() => {
            if (badge) badge.innerHTML = `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#a6e3a1;"></span> 🛡️ HG-CLM Active`;
        }, 4000);

        return false;
    }

    if (badge) badge.innerHTML = `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#a6e3a1;"></span> ✅ Payload Approved`;
    return true;
}

// Inject CSS for dynamic blurring and notification banners
const styleEl = document.createElement('style');
styleEl.innerHTML = `
    .hg-clm-blurred {
        filter: blur(8px) !important;
        transition: filter 0.3s ease !important;
        pointer-events: none !important;
        user-select: none !important;
    }
    .hg-clm-mask-banner {
        background: #f38ba8;
        color: #11111b;
        font-family: monospace;
        font-weight: bold;
        font-size: 12px;
        padding: 8px 12px;
        border-radius: 6px;
        margin: 8px 0;
        box-shadow: 0 4px 12px rgba(243, 139, 168, 0.3);
        border: 1px solid #eba0ac;
    }
`;
(document.head || document.documentElement).appendChild(styleEl);

let correctionAttempts = 0;
const MAX_CORRECTION_ATTEMPTS = 3;

function escapeHtml(str) {
    return (str || '').replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

async function inspectAIResponseAndGovern(responseText, targetElement) {
    if (correctionAttempts >= MAX_CORRECTION_ATTEMPTS) {
        console.warn("🚨 HG-CLM MAX CORRECTION ATTEMPTS REACHED (3/3). Halting self-correction loop.");
        return;
    }

    const requestId = 'resp_' + Date.now() + '_' + Math.random();
    const validationPromise = new Promise((resolve) => {
        function onReply(e) {
            if (e.detail && e.detail.requestId === requestId) {
                window.removeEventListener('HG_CLM_INSPECT_RESPONSE_REPLY', onReply);
                resolve(e.detail.response);
            }
        }
        window.addEventListener('HG_CLM_INSPECT_RESPONSE_REPLY', onReply);
        window.dispatchEvent(new CustomEvent('HG_CLM_INSPECT_RESPONSE_REQUEST', {
            detail: { requestId: requestId, responseText: responseText }
        }));
    });

    const result = await validationPromise;

    if (result && result.safe === false) {
        console.warn("🚨 HG-CLM RESPONSE VIOLATION DETECTED:", result.reason);
        
        if (targetElement) {
            targetElement.classList.add('hg-clm-blurred');
            
            let banner = targetElement.previousElementSibling;
            if (!banner || !banner.classList.contains('hg-clm-mask-banner')) {
                banner = document.createElement('div');
                banner.className = 'hg-clm-mask-banner';
                targetElement.parentNode.insertBefore(banner, targetElement);
            }
            correctionAttempts++;
            banner.innerHTML = `🚨 <strong>HG-CLM GOVERNANCE VIOLATION DETECTED:</strong> ${escapeHtml(result.reason)}<br>` +
                `<span style="font-size:11px; font-weight: normal;">🛡️ Auto-Injecting Correction Prompt into Model (Attempt ${correctionAttempts}/${MAX_CORRECTION_ATTEMPTS})...</span>`;
        }

        if (result.correction_prompt) {
            setTimeout(() => {
                injectCorrectionPrompt(result.correction_prompt);
            }, 800);
        }
    } else {
        correctionAttempts = 0;
    }
}

function injectCorrectionPrompt(correctionText) {
    const inputSelectors = [
        'textarea',
        'div[contenteditable="true"]',
        '#prompt-textarea',
        '[data-id="root"] textarea',
        'input[type="text"]'
    ];

    let chatInput = null;
    for (const selector of inputSelectors) {
        const el = document.querySelector(selector);
        if (el && el.offsetWidth > 0 && el.offsetHeight > 0) {
            chatInput = el;
            break;
        }
    }

    if (!chatInput) return;

    if (chatInput.tagName === 'TEXTAREA' || chatInput.tagName === 'INPUT') {
        chatInput.value = correctionText;
    } else {
        chatInput.innerText = correctionText;
    }

    chatInput.dispatchEvent(new Event('input', { bubbles: true }));
    chatInput.dispatchEvent(new Event('change', { bubbles: true }));

    setTimeout(() => {
        const sendBtnSelectors = [
            'button[type="submit"]',
            'button[aria-label*="Send"]',
            'button[data-testid*="send"]',
            'button.send-button'
        ];
        for (const s of sendBtnSelectors) {
            const btn = document.querySelector(s);
            if (btn && !btn.disabled) {
                btn.click();
                return;
            }
        }
        chatInput.dispatchEvent(new KeyboardEvent('keydown', { keyCode: 13, key: 'Enter', bubbles: true }));
    }, 500);
}

// 1. FETCH INTERCEPTOR
const originalFetch = window.fetch;
window.fetch = async function(resource, config) {
    const url = typeof resource === 'string' ? resource : (resource && resource.url ? resource.url : '');
    const urlLower = url.toLowerCase();

    const isLLMConversationEndpoint = (
        urlLower.includes('/backend-api/') ||
        urlLower.includes('/chat_conversations') ||
        urlLower.includes('/bardchatui') ||
        urlLower.includes('/api/v1/chat') ||
        urlLower.includes('/api/chat') ||
        urlLower.includes('/chat/completion') ||
        urlLower.includes('/chat/create_completion') ||
        urlLower.includes('/completion') ||
        urlLower.includes('/query') ||
        urlLower.includes('/ai/')
    );

    const isPostMethod = config && config.method && config.method.toUpperCase() === 'POST';

    if (isLLMConversationEndpoint && isPostMethod && config && config.body) {
        try {
            let bodyStr = typeof config.body === 'string' ? config.body : '';
            if (bodyStr) {
                const isAllowed = await inspectPayloadAndGovern(bodyStr);
                if (!isAllowed) {
                    throw new Error("HG-CLM Governance: Prompt transmission blocked due to constraint violation.");
                }
            }
        } catch (err) {
            if (err.message && err.message.includes("HG-CLM Governance")) throw err;
            console.warn("HG-CLM Fetch Interceptor Warning:", err);
        }
    }

    const response = await originalFetch.apply(this, arguments);

    if (isLLMConversationEndpoint && response && response.clone) {
        try {
            const clone = response.clone();
            clone.text().then(text => {
                if (text && text.trim().length > 10) {
                    setTimeout(() => {
                        const messageContainers = document.querySelectorAll('tusk-message-display, .message, [class*="message"], article');
                        const lastContainer = messageContainers.length > 0 ? messageContainers[messageContainers.length - 1] : null;
                        inspectAIResponseAndGovern(text, lastContainer);
                    }, 500);
                }
            }).catch(() => {});
        } catch (e) {}
    }

    return response;
};

// 2. XHR INTERCEPTOR
const originalXhrOpen = XMLHttpRequest.prototype.open;
const originalXhrSend = XMLHttpRequest.prototype.send;

XMLHttpRequest.prototype.open = function(method, url) {
    this._hg_method = method;
    this._hg_url = url;
    return originalXhrOpen.apply(this, arguments);
};

XMLHttpRequest.prototype.send = function(body) {
    const self = this;
    const urlLower = (self._hg_url || '').toLowerCase();
    const isPostMethod = self._hg_method && self._hg_method.toUpperCase() === 'POST';

    const isLLMConversationEndpoint = (
        urlLower.includes('/api/v1/chat') ||
        urlLower.includes('/api/chat') ||
        urlLower.includes('/chat/completion') ||
        urlLower.includes('/completion') ||
        urlLower.includes('/query') ||
        urlLower.includes('/ai/')
    );

    if (isLLMConversationEndpoint && isPostMethod && body && typeof body === 'string') {
        inspectPayloadAndGovern(body).then(isAllowed => {
            if (isAllowed) {
                originalXhrSend.call(self, body);
            } else {
                console.warn("🚨 HG-CLM XHR BLOCKED TRANSMISSION for URL:", self._hg_url);
                self.dispatchEvent(new Event('error'));
            }
        }).catch(() => {
            originalXhrSend.call(self, body);
        });
        return;
    }

    return originalXhrSend.apply(this, arguments);
};
