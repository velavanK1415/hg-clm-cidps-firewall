// workbench.js - HG-CLM AI Research Workbench Engine & Master Broadcast Observer
// Optimized: 300ms Input Debouncing, TAB_ID Self-Receive Guards, Server Health Ping, Audit Export

const TAB_ID = 'tab_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);

let state = {
    projectId: "proj_default_001",
    goal: "Research effective neuromarketing tools strictly focusing on eye tracking",
    constraints: [
        { id: "c1", text: "don't allow EEG, Fmri, PET, GSC related search", type: "HARD" },
        { id: "c2", text: "Must support human-in-the-loop node curation before context distillation", type: "SOFT" },
        { id: "c3", text: "Maintain zero unpermitted data alterations", type: "HARD" }
    ],
    decisions: [
        { id: "d1", text: "neuromarketing effective tool is only eye tracking" },
        { id: "d2", text: "Data Plane runs in Workbench UI; Control Plane runs locally on port 8080" }
    ],
    proposals: [],
    rejections: [
        { id: "r1", text: "Suggesting fMRI or EEG hardware sensors" }
    ],
    backendUrl: "http://localhost:8080"
};

const HMAC_SECRET = "HG_CLM_HMAC_SECRET_KEY_2026";
let hmacKey = null;

async function initHmacKey() {
    try {
        const enc = new TextEncoder();
        hmacKey = await window.crypto.subtle.importKey(
            "raw",
            enc.encode(HMAC_SECRET),
            { name: "HMAC", hash: "SHA-256" },
            false,
            ["sign", "verify"]
        );
    } catch (e) {}
}

async function signPayload(payload) {
    if (!hmacKey) return "";
    try {
        const enc = new TextEncoder();
        const signature = await window.crypto.subtle.sign("HMAC", hmacKey, enc.encode(JSON.stringify(payload)));
        return Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (e) {
        return "";
    }
}

async function verifyPayload(payload, signature) {
    if (!hmacKey || !signature) return true;
    try {
        const enc = new TextEncoder();
        const sigBuf = new Uint8Array(signature.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
        return await window.crypto.subtle.verify("HMAC", hmacKey, sigBuf, enc.encode(JSON.stringify(payload)));
    } catch (e) {
        return false;
    }
}

// ------------------------------------------------------------------
// MASTER BROADCAST OBSERVER HUB (< 1ms Multi-Tab Sync)
// ------------------------------------------------------------------
const masterChannel = new BroadcastChannel('hg_clm_master_hub');

masterChannel.onmessage = async (event) => {
    const envelope = event.data;
    if (!envelope || !envelope.delta) return;

    if (envelope.senderId === TAB_ID) return;

    const isValid = await verifyPayload(envelope.delta, envelope.signature);
    if (!isValid) return;

    const delta = envelope.delta;
    
    if (delta.type === 'UPDATE_GOAL') {
        state.goal = delta.payload;
    } else if (delta.type === 'ADD_CONSTRAINT') {
        state.constraints.push(delta.payload);
    } else if (delta.type === 'REMOVE_CONSTRAINT') {
        state.constraints.splice(delta.payloadIndex, 1);
    } else if (delta.type === 'ADD_DECISION') {
        state.decisions.push(delta.payload);
    } else if (delta.type === 'ACCEPT_PROPOSAL') {
        const prop = state.proposals.splice(delta.payloadIndex, 1)[0];
        if (prop) {
            state[prop.category || 'constraints'].push({ id: 'node_' + Date.now(), text: prop.text, type: 'HARD' });
        }
    } else if (delta.type === 'REJECT_PROPOSAL') {
        const prop = state.proposals.splice(delta.payloadIndex, 1)[0];
        if (prop) {
            state.rejections.push({ id: 'rej_' + Date.now(), text: prop.text });
            syncRejectionLedgerWithServer();
        }
    }

    renderAll();
};

async function broadcastDelta(type, payload, payloadIndex = null) {
    const delta = {
        type: type,
        payload: payload,
        payloadIndex: payloadIndex,
        timestamp: Date.now()
    };
    const signature = await signPayload(delta);
    masterChannel.postMessage({ senderId: TAB_ID, delta, signature });
    renderAll();
}

// ------------------------------------------------------------------
// REJECTION LEDGER & SERVER HEALTH PING
// ------------------------------------------------------------------
async function syncRejectionLedgerWithServer() {
    try {
        await fetch(`${state.backendUrl}/ledger/sync`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ rejections: state.rejections })
        });
    } catch (e) {}
}

async function loadRejectionLedgerFromServer() {
    try {
        const res = await fetch(`${state.backendUrl}/ledger/get`);
        const data = await res.json();
        if (data.rejections && data.rejections.length > 0) {
            state.rejections = data.rejections;
            renderAll();
        }
    } catch (e) {}
}

async function checkServerHealth() {
    const dot = document.getElementById('server-dot');
    const status = document.getElementById('server-status');
    try {
        const res = await fetch(`${state.backendUrl}/ledger/get`);
        if (res.ok) {
            if (dot) dot.style.background = 'var(--accent-green)';
            if (status) status.innerText = 'http://localhost:8080 Active';
        } else {
            if (dot) dot.style.background = 'var(--accent-yellow)';
            if (status) status.innerText = 'Server Degraded';
        }
    } catch (e) {
        if (dot) dot.style.background = 'var(--accent-red)';
        if (status) status.innerText = 'Server Disconnected';
    }
}

async function exportAuditTrail() {
    try {
        const res = await fetch(`${state.backendUrl}/audit`);
        const data = await res.json();
        const jsonlStr = (data.records || []).map(r => JSON.stringify(r)).join('\n');
        
        const blob = new Blob([jsonlStr], { type: 'application/x-jsonlines' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `audit_trail_${Date.now()}.jsonl`;
        a.click();
        URL.revokeObjectURL(url);
        
        showToast("Exported SHA-256 Audit Log!", "success");
    } catch (e) {
        showToast("Failed to export audit log.", "error");
    }
}

function showToast(message, type = "info") {
    const toast = document.getElementById('toast-notification');
    const text = document.getElementById('toast-text');
    const icon = document.getElementById('toast-icon');
    if (!toast) return;

    text.innerText = message;
    icon.innerText = type === "success" ? "✅" : (type === "error" ? "🚨" : "ℹ️");
    toast.style.display = 'flex';

    setTimeout(() => {
        toast.style.display = 'none';
    }, 2500);
}

function debounce(fn, ms) {
    let timer = null;
    return function(...args) {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), ms);
    };
}

// ------------------------------------------------------------------
// INITIALIZATION & EVENT BINDINGS
// ------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', async () => {
    await initHmacKey();
    await loadRejectionLedgerFromServer();
    bindEvents();
    renderAll();
    
    // Server Health Ping every 4s
    checkServerHealth();
    setInterval(checkServerHealth, 4000);
});

function bindEvents() {
    const debouncedGoalChange = debounce((e) => {
        state.goal = e.target.value.trim();
        broadcastDelta('UPDATE_GOAL', state.goal);
    }, 300);

    document.getElementById('goal-text').addEventListener('input', debouncedGoalChange);

    document.getElementById('btn-add-constraint').addEventListener('click', () => {
        const input = document.getElementById('new-constraint-input');
        const val = input.value.trim();
        if (val) {
            const newNode = { id: 'c_' + Date.now(), text: val, type: 'HARD' };
            state.constraints.push(newNode);
            input.value = '';
            broadcastDelta('ADD_CONSTRAINT', newNode);
            showToast("Added Constraint", "success");
        }
    });

    document.getElementById('btn-add-decision').addEventListener('click', () => {
        const input = document.getElementById('new-decision-input');
        const val = input.value.trim();
        if (val) {
            const newNode = { id: 'd_' + Date.now(), text: val };
            state.decisions.push(newNode);
            input.value = '';
            broadcastDelta('ADD_DECISION', newNode);
            showToast("Added Decision", "success");
        }
    });

    document.getElementById('btn-send-prompt').addEventListener('click', handlePromptExecution);
    document.getElementById('btn-export-audit').addEventListener('click', exportAuditTrail);

    document.getElementById('modal-btn-cancel').addEventListener('click', () => {
        document.getElementById('approval-modal').classList.remove('active');
    });

    document.getElementById('modal-btn-approve').addEventListener('click', () => {
        document.getElementById('approval-modal').classList.remove('active');
        executeApprovedSearch();
    });
}

// ------------------------------------------------------------------
// RENDERING PIPELINE
// ------------------------------------------------------------------
function renderAll() {
    if (document.activeElement !== document.getElementById('goal-text')) {
        document.getElementById('goal-text').value = state.goal || '';
    }

    const cList = document.getElementById('constraints-list');
    if (cList) {
        cList.innerHTML = '';
        state.constraints.forEach((c, idx) => {
            const li = document.createElement('li');
            li.className = 'node-item accepted';
            li.innerHTML = `
                <span><strong>[${c.type || 'HARD'}]</strong> ${escapeHtml(c.text)}</span>
                <button class="btn-action btn-reject" onclick="removeNode('constraints', ${idx})">✕</button>
            `;
            cList.appendChild(li);
        });
    }

    const dList = document.getElementById('decisions-list');
    if (dList) {
        dList.innerHTML = '';
        state.decisions.forEach((d, idx) => {
            const li = document.createElement('li');
            li.className = 'node-item accepted';
            li.innerHTML = `
                <span>${escapeHtml(d.text)}</span>
                <button class="btn-action btn-reject" onclick="removeNode('decisions', ${idx})">✕</button>
            `;
            dList.appendChild(li);
        });
    }

    const pList = document.getElementById('proposals-list');
    if (pList) {
        pList.innerHTML = '';
        if (state.proposals.length === 0) {
            pList.innerHTML = '<div style="font-size: 11px; color: var(--text-sub);">Conversational auto-extractor active. Rules from chat will appear here for 1-click curation.</div>';
        } else {
            state.proposals.forEach((p, idx) => {
                const li = document.createElement('li');
                li.className = 'node-item proposal';
                li.innerHTML = `
                    <span>${escapeHtml(p.text)}</span>
                    <div>
                        <button class="btn-action btn-accept" onclick="acceptProposal(${idx})">Accept ✅</button>
                        <button class="btn-action btn-reject" onclick="rejectProposal(${idx})">Reject ✕</button>
                    </div>
                `;
                pList.appendChild(li);
            });
        }
    }

    const rList = document.getElementById('rejections-list');
    if (rList) {
        rList.innerHTML = '';
        state.rejections.forEach((r, idx) => {
            const li = document.createElement('li');
            li.className = 'node-item rejected';
            li.innerHTML = `
                <span>${escapeHtml(r.text)}</span>
                <button class="btn-action" style="font-size: 10px;" onclick="removeNode('rejections', ${idx})">Purge</button>
            `;
            rList.appendChild(li);
        });
    }

    updateDirectivePreview();
}

function removeNode(category, index) {
    state[category].splice(index, 1);
    if (category === 'rejections') syncRejectionLedgerWithServer();
    broadcastDelta('REMOVE_NODE', { category, index }, index);
}

function acceptProposal(index) {
    broadcastDelta('ACCEPT_PROPOSAL', null, index);
    showToast("Proposal Accepted & Promoted", "success");
}

function rejectProposal(index) {
    broadcastDelta('REJECT_PROPOSAL', null, index);
    showToast("Proposal Saved to Rejection Ledger", "info");
}

function updateDirectivePreview() {
    const preview = document.getElementById('directive-preview');
    if (!preview) return;
    const header = 
`[SYSTEM INSTRUCTION & STRICT GOVERNANCE CONSTRAINTS]
1. MASTER GOAL: ${state.goal}
2. MANDATORY CONSTRAINTS:
${state.constraints.map(c => "   - [" + (c.type || 'HARD') + "] " + (c.text || c)).join('\n')}
3. VALIDATED DECISIONS:
${state.decisions.map(d => "   - " + (d.text || d)).join('\n')}
[END SYSTEM INSTRUCTIONS]`;
    
    preview.innerText = header;
}

let pendingPrompt = "";

async function handlePromptExecution() {
    const input = document.getElementById('prompt-input');
    const text = input.value.trim();
    if (!text) return;

    if (text.length > 100 || text.includes('\n')) {
        pendingPrompt = text;
        triggerPreFlightApprovalModal(text);
    } else {
        pendingPrompt = text;
        executeApprovedSearch();
    }
}

function triggerPreFlightApprovalModal(rawText) {
    const modal = document.getElementById('approval-modal');
    const incList = document.getElementById('modal-include-list');
    const rejList = document.getElementById('modal-reject-list');

    if (!modal) return;
    incList.innerHTML = '';
    rejList.innerHTML = '';

    const lines = rawText.split('\n').filter(l => l.trim().length > 5);
    
    lines.forEach((line) => {
        const lineLower = line.toLowerCase();
        let isViolation = false;

        for (const c of state.constraints) {
            const cText = (c.text || c).toLowerCase();
            if (cText.includes('eeg') || cText.includes('fmri')) {
                if (lineLower.includes('eeg') || lineLower.includes('fmri') || lineLower.includes('pet') || lineLower.includes('gsc')) {
                    isViolation = true;
                    break;
                }
            }
        }

        const li = document.createElement('li');
        li.className = 'node-item ' + (isViolation ? 'rejected' : 'accepted');
        li.innerHTML = `<span>${escapeHtml(line)}</span>`;

        if (isViolation) {
            rejList.appendChild(li);
        } else {
            incList.appendChild(li);
        }
    });

    modal.classList.add('active');
}

async function executeApprovedSearch() {
    const promptInput = document.getElementById('prompt-input');
    const stream = document.getElementById('chat-stream');
    const model = document.getElementById('model-select').value;
    const promptText = pendingPrompt;

    if (!promptText) return;

    const userMsg = document.createElement('div');
    userMsg.className = 'msg-bubble msg-user';
    userMsg.innerHTML = `<strong>User:</strong> ${escapeHtml(promptText)}`;
    stream.appendChild(userMsg);
    promptInput.value = '';

    const aiMsg = document.createElement('div');
    aiMsg.className = 'msg-bubble msg-ai';
    aiMsg.innerHTML = `⚡ <em>Inspecting payload & forwarding to live ${model.toUpperCase()} model...</em>`;
    stream.appendChild(aiMsg);
    stream.scrollTop = stream.scrollHeight;

    try {
        const res = await fetch(`${state.backendUrl}/inspect_prompt`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                prompt: promptText,
                goal: state.goal,
                constraints: state.constraints.map(c => typeof c === 'string' ? c : c.text),
                decisions: state.decisions.map(d => typeof d === 'string' ? d : d.text)
            })
        });

        const data = await res.json();

        if (data.latency_ms !== undefined) {
            const latEl = document.getElementById('telemetry-latency');
            if (latEl) latEl.innerText = `${data.latency_ms} ms`;
        }

        if (data.safe === false) {
            aiMsg.innerHTML = `🚨 <strong>HG-CLM INTRUSION BLOCKED:</strong><br><span style="color: var(--accent-red);">${escapeHtml(data.reason)}</span>`;
            document.getElementById('gauge-status').innerText = "BLOCKED";
            document.getElementById('gauge-status').style.color = "var(--accent-red)";
            document.getElementById('gauge-sub').innerText = "Intrusion rule triggered.";
            showToast("Cognitive Intrusion Blocked!", "error");
        } else {
            document.getElementById('gauge-status').innerText = "FOCUSED";
            document.getElementById('gauge-status').style.color = "var(--accent-green)";
            document.getElementById('gauge-sub').innerText = "Prompt aligned with Master Goal.";

            aiMsg.innerHTML = `✅ <strong>HG-CLM Payload Approved & Transmitted:</strong><br><br>` +
                `The governance interceptor approved your prompt and attached the <strong>[SYSTEM INSTRUCTION & STRICT GOVERNANCE CONSTRAINTS]</strong> header.<br><br>` +
                `👉 To see the authentic, unaltered <strong>GPT-OSS 120B / Live Model response</strong> without any local script modifications, switch to your open Tusk Central AI tab at <strong><a href="https://new.tusksearch.com/ai" target="_blank" style="color: #89b4fa;">new.tusksearch.com/ai</a></strong> (or view the response directly below if using extension mode).`;
        }
    } catch (e) {
        aiMsg.innerHTML = `⚠️ <strong>Control Plane Engine Error:</strong> Unable to reach local server on port 8080. Ensure local_server.js is running.`;
    }

    stream.scrollTop = stream.scrollHeight;
}

let workbenchRetryCount = 0;

async function inspectResponseInWorkbench(responseText, targetMsgElement) {
    try {
        const res = await fetch(`${state.backendUrl}/inspect_response`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                responseText: responseText,
                goal: state.goal,
                constraints: state.constraints.map(c => typeof c === 'string' ? c : c.text),
                decisions: state.decisions.map(d => typeof d === 'string' ? d : d.text)
            })
        });

        const data = await res.json();

        if (data.safe === false) {
            workbenchRetryCount++;
            targetMsgElement.style.filter = "blur(8px)";
            targetMsgElement.style.opacity = "0.6";

            const banner = document.createElement('div');
            banner.style.cssText = `
                background: #f38ba8;
                color: #11111b;
                padding: 10px;
                border-radius: 6px;
                margin-top: 8px;
                font-family: monospace;
                font-size: 12px;
            `;
            banner.innerHTML = `🚨 <strong>HG-CLM RESPONSE VIOLATION DETECTED:</strong><br>${escapeHtml(data.reason)}<br><br>` +
                `🛡️ <strong>Auto-Injecting Correction Prompt (Attempt ${workbenchRetryCount}/3)...</strong>`;
            
            targetMsgElement.parentNode.insertBefore(banner, targetMsgElement.nextSibling);

            if (workbenchRetryCount <= 3 && data.correction_prompt) {
                showToast(`Auto-Correcting AI Output (Attempt ${workbenchRetryCount}/3)`, "info");
                setTimeout(() => {
                    document.getElementById('prompt-input').value = data.correction_prompt;
                    handlePromptExecution();
                }, 1500);
            }
        } else {
            workbenchRetryCount = 0;
        }
    } catch (e) {}
}

function escapeHtml(str) {
    return (str || '').replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
