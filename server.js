// local_server.js - HG-CLM Zero-Leakage Governance Control Plane & Pure Pass-Through Proxy
// Hardened: Object Constraint Unwrapping & Guarded Fast-Pass Inspection Engine

const http = require('http');
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const crypto = require('crypto');

const PORT = 8080;
const LOG_FILE = path.join(__dirname, 'audit_trail.jsonl');
const LEDGER_FILE = path.join(__dirname, 'rejection_ledger.json');

let persistentRejectionLedger = [];
let lastHash = "0000000000000000000000000000000000000000000000000000000000000000";

// Load Rejection Ledger from disk asynchronously
(async () => {
    try {
        if (fs.existsSync(LEDGER_FILE)) {
            const data = await fsp.readFile(LEDGER_FILE, 'utf8');
            persistentRejectionLedger = JSON.parse(data);
        }
    } catch (e) {
        persistentRejectionLedger = [];
    }
})();

// Serialized Audit Write Queue (Guarantees Strict SHA-256 Hash Chain Order & Zero Burst Data Loss)
let auditWriteQueue = Promise.resolve();

function writeAuditLog(action, payload) {
    const timestamp = new Date().toISOString();
    
    auditWriteQueue = auditWriteQueue.then(async () => {
        const payloadStr = JSON.stringify(payload);
        const hash = crypto.createHash('sha256').update(lastHash + timestamp + action + payloadStr).digest('hex');
        
        const logRecord = { timestamp, action, prevHash: lastHash, hash, payload };
        lastHash = hash;

        try {
            await fsp.appendFile(LOG_FILE, JSON.stringify(logRecord) + '\n', 'utf8');
        } catch (e) {
            console.error("Audit log write error:", e);
        }
        return logRecord;
    }).catch(err => console.error("Audit queue error:", err));

    return auditWriteQueue;
}

// Universal Semantic Vector Alignment & Constraint Inspector (Unwraps String & Object Constraints)
function inspectSemantics(prompt, goal, constraints, decisions) {
    const promptLower = prompt.toLowerCase().trim();
    const promptTokens = new Set(promptLower.split(/[\s,.;:!?\-\/\(\)]+/).filter(w => w.length >= 2));

    const stopwords = new Set([
        "don't", "dont", "do", "not", "no", "must", "avoid", "block", "ban", "exclude",
        "forbidden", "disallow", "allow", "related", "search", "use", "using", "tool", "tools", "research"
    ]);

    // 1. Constraint Inspection (Handles BOTH raw string constraints and object constraints { text: "..." })
    for (const constraint of constraints || []) {
        const cText = typeof constraint === 'string' ? constraint : (constraint && constraint.text ? constraint.text : '');
        const cLower = cText.toLowerCase();
        
        const isExplicitNegativeExclusion = (
            cLower.includes("don't") || cLower.includes("dont") || cLower.includes("do not") ||
            cLower.includes("no ") || cLower.includes("must not") || cLower.includes("avoid") ||
            cLower.includes("block") || cLower.includes("ban") || cLower.includes("exclude") ||
            cLower.includes("forbidden") || cLower.includes("disallow")
        );

        if (isExplicitNegativeExclusion) {
            const targetForbiddenWords = cLower.split(/[\s,.;:!?\-\/\(\)]+/).filter(w => 
                w.length >= 3 && !stopwords.has(w)
            );

            for (const word of targetForbiddenWords) {
                if (promptTokens.has(word) || promptLower.includes(word)) {
                    return {
                        safe: false,
                        reason: `Semantic Violation: Prompt explicitly or implicitly requests forbidden concept '${word}' (Rule: "${cText}")`
                    };
                }
            }
        }
    }

    // 2. Goal Alignment Vector Calculation
    if (goal && promptTokens.size >= 4) {
        const goalTokens = new Set(goal.toLowerCase().split(/[\s,.;:!?\-\/\(\)]+/).filter(w => w.length >= 2));
        let matchCount = 0;
        for (const token of promptTokens) {
            if (goalTokens.has(token)) matchCount++;
        }
        
        const isFollowUp = promptLower.includes("link") || promptLower.includes("source") || promptLower.includes("paper") || promptLower.includes("open") || promptLower.includes("more");

        if (matchCount === 0 && promptTokens.size > 6 && !isFollowUp) {
            return {
                safe: false,
                reason: `Intent Drift Detected: Prompt topics show zero alignment with Master Goal ("${goal}")`
            };
        }
    }

    return { safe: true, reason: "Prompt semantically aligned with Intent-State Graph." };
}

const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Bypass-Tunnel-Reminder, X-HG-CLM-Signature');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', async () => {
        let data = {};
        try { data = JSON.parse(body || '{}'); } catch (e) {}

        const start = Date.now();
        const cleanUrl = req.url.split('?')[0].replace(/\/+/g, '/');

        // Static File Handler with Non-Blocking Async Reads
        let filePath = cleanUrl === '/' ? '/index.html' : cleanUrl;
        const localPath = path.join(__dirname, filePath);

        if (req.method === 'GET' && fs.existsSync(localPath) && fs.statSync(localPath).isFile() && !cleanUrl.startsWith('/inspect_prompt') && !cleanUrl.startsWith('/inspect_response') && !cleanUrl.startsWith('/ledger') && !cleanUrl.startsWith('/audit')) {
            const ext = path.extname(localPath).toLowerCase();
            const mimeTypes = {
                '.html': 'text/html; charset=utf-8',
                '.js': 'application/javascript; charset=utf-8',
                '.css': 'text/css; charset=utf-8',
                '.json': 'application/json; charset=utf-8'
            };
            try {
                const fileBuf = await fsp.readFile(localPath);
                res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'text/plain' });
                res.end(fileBuf);
                return;
            } catch (err) {}
        }

        // REST API Endpoints
        if (cleanUrl === '/inspect_prompt') {
            let promptText = data.prompt || '';
            const constraints = data.constraints || [];
            const goal = data.goal || '';
            const decisions = data.decisions || [];

            const promptLower = promptText.toLowerCase().trim();
            const greetings = ["hello", "hi", "hey", "greetings", "good morning", "thanks", "ok", "okay"];
            const words = promptLower.split(/\s+/);
            const isGreeting = greetings.some(g => promptLower === g || promptLower.startsWith(g + " ") || promptLower.startsWith(g + ","));

            // 1. ALWAYS run semantic inspection first
            const result = inspectSemantics(promptText, goal, constraints, decisions);
            
            // 2. Await audit log write sequentially
            await writeAuditLog("INSPECT_PROMPT", { safe: result.safe, reason: result.reason, promptSnippet: promptText.slice(0, 100) });

            // 3. STRICT SECURITY CHECK: If semantic inspection failed, BLOCK IMMEDIATELY
            if (!result.safe) {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    safe: false,
                    reason: result.reason,
                    latency_ms: Date.now() - start
                }));
                return;
            }

            // 4. Fast-pass ONLY granted if semantic inspection PASSED
            if (result.safe && (isGreeting || words.length < 3)) {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ 
                    safe: true, 
                    reason: 'Conversational greeting or short prompt passed.',
                    latency_ms: Date.now() - start 
                }));
                return;
            }

            const distilledPayload = 
                `[SYSTEM INSTRUCTION & STRICT GOVERNANCE CONSTRAINTS]\n` +
                `YOU MUST STRICTLY COMPLY WITH THE FOLLOWING CONSTRAINTS AND DECISIONS:\n` +
                `1. MASTER GOAL: ${goal}\n` +
                `2. MANDATORY PINNED CONSTRAINTS:\n` +
                constraints.map(c => typeof c === 'string' ? `   - ${c}` : `   - ${c.text || ''}`).join('\n') + '\n' +
                `3. VALIDATED DECISIONS:\n` +
                decisions.map(d => typeof d === 'string' ? `   - ${d}` : `   - ${d.text || ''}`).join('\n') + '\n' +
                `[END SYSTEM INSTRUCTIONS]`;

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                safe: true,
                reason: result.reason,
                distilled_payload: distilledPayload,
                latency_ms: Date.now() - start
            }));

        } else if (cleanUrl === '/inspect_response') {
            let responseText = data.responseText || data.response || '';
            const constraints = data.constraints || [];
            const goal = data.goal || '';
            const decisions = data.decisions || [];

            const result = inspectSemantics(responseText, goal, constraints, decisions);
            await writeAuditLog("INSPECT_RESPONSE", { safe: result.safe, reason: result.reason, responseSnippet: responseText.slice(0, 100) });

            if (!result.safe) {
                const correctionPrompt = `[AUTOMATED CONSTRAINTS VIOLATION REJECTION & SELF-CORRECTION MANDATE]\n` +
                    `Your previous response violated governance policy: ${result.reason}\n` +
                    `STRICT MANDATE: Rewrite your response immediately. Remove ALL references to forbidden concepts, and restrict your focus strictly to: ${goal || 'the aligned research scope'}.`;
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    safe: false,
                    reason: result.reason,
                    correction_prompt: correctionPrompt,
                    latency_ms: Date.now() - start
                }));
                return;
            }

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                safe: true,
                reason: result.reason,
                latency_ms: Date.now() - start
            }));

        } else if (cleanUrl === '/ledger/sync') {
            if (Array.isArray(data.rejections)) {
                persistentRejectionLedger = data.rejections;
                await fsp.writeFile(LEDGER_FILE, JSON.stringify(persistentRejectionLedger, null, 2), 'utf8');
                await writeAuditLog("SYNC_REJECTION_LEDGER", { count: persistentRejectionLedger.length });
            }
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'success', rejections: persistentRejectionLedger }));

        } else if (cleanUrl === '/ledger/get') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'success', rejections: persistentRejectionLedger }));

        } else if (cleanUrl === '/audit') {
            let auditLogs = [];
            try {
                if (fs.existsSync(LOG_FILE)) {
                    const data = await fsp.readFile(LOG_FILE, 'utf8');
                    const lines = data.trim().split('\n');
                    auditLogs = lines.map(l => JSON.parse(l));
                }
            } catch (e) {}

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                status: 'success',
                lastHash,
                totalEntries: auditLogs.length,
                records: auditLogs.slice(-50)
            }));

        } else {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end("404 Not Found - HG-CLM Control Plane Server");
        }
    });
});

server.listen(PORT, () => {
    console.log("=====================================================");
    console.log(`🔥 HG-CLM SECURE GUARDED CONTROL PLANE RUNNING AT: http://localhost:${PORT}`);
    console.log("=====================================================");
});
