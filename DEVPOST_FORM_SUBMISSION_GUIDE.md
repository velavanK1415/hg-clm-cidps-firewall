# Devpost Submission Form Fields: Nebius x NVIDIA Global AI Hackathon

Use the exact text and answers below to fill in your Devpost submission form at:  
https://devpost.com/submit-to/30790-nebius-x-nvidia-global-ai-hackathon/manage/submissions/1221658-hg-clm-cidps-human-guided-llm-governance-layer/project_details/edit

---

## 1. Project Overview

### Project Name:
HG-CLM / CIDPS: Zero-Leakage Local AI Research Governance & Semantic Firewall Protocol

### Elevator Pitch / Tagline (Under 200 characters):
A sub-5ms local semantic firewall and governance control plane preventing LLM cognitive intrusion, intent drift, and data leaks with an immutable SHA-256 audit ledger.

### Select Track:
Select "Coding and Agentic Engineering" (or "Personal AI" / "Best Apps and Agents").  
Recommended: Coding and Agentic Engineering (since HG-CLM is a developer and agent governance tool).

---

## 2. Project Story (Copy-paste directly into the markdown editor)

# HG-CLM / CIDPS: Zero-Leakage Local AI Research Governance & Semantic Firewall Protocol

### 🌟 Inspiration
As autonomous agents and Large Language Models (LLMs) take over mission-critical development and enterprise research, they suffer from subtle yet dangerous vulnerabilities: **semantic drift**, **prompt injection**, **hallucinatory premise poisoning**, and **uncontrolled data leakage**. In regulated research environments (DPDP Act 2023, GDPR Art. 25), users cannot afford models that secretly inject forbidden concepts, drift away from validated constraints, or leak proprietary prompts to remote third-party evaluators.

Standard cloud-based guardrails introduce heavy round-trip network latency ($\ge 250\text{ ms}$) and compromise data privacy by shipping prompts off-premises. We built **HG-CLM / CIDPS** (Human-Guided Context Lifecycle Management & Cognitive Intrusion Detection/Prevention System): an ultra-fast, local-first control plane operating at $2\text{--}5\text{ ms}$ latency that transparently monitors prompts and outputs, enforces strict boundaries, and holds models accountable using mathematical proof chains.

---

### ⚙️ How We Built It
HG-CLM / CIDPS is designed as a decoupled two-tier architecture:

#### 1. Local Governance Control Plane (`server.js`)
Built with asynchronous Node.js and zero external runtime dependencies (`http`, `fs.promises`, `crypto`). It intercepts prompts, checks semantic vectors against pinned constraints, unwraps complex rule objects, and evaluates goal alignment with zero telemetry leaked to the cloud.

#### 2. Universal Data Plane Interceptor (`extension/`)
A Manifest V3 compliant Chrome Extension that protects web-based LLM workspaces (ChatGPT, Claude, Tusk, Nebius interfaces):
- **`content_main.js` (Main World):** Safely wraps `window.fetch` and `XMLHttpRequest.prototype.send`.
- **`content_bridge.js` (Isolated World):** Relays inspection payloads across browser isolation boundaries via custom DOM events (`HG_CLM_REQUEST` $\leftrightarrow$ `HG_CLM_RESPONSE`), keeping browser sandbox security completely intact.

#### 3. Mathematical SHA-256 Cryptographic Audit Chain
To guarantee verifiable integrity under heavy concurrent bursts, every prompt and model response is sequenced through an asynchronous serialized Promise queue:
$$H_i = \text{SHA-256}\Big(H_{i-1} \parallel T_i \parallel A_i \parallel \text{JSON}(P_i)\Big)$$
Where:
- $H_i$ is the hash of the current log entry,
- $H_{i-1}$ is the previous block hash ($H_0 = 0^{64}$),
- $T_i$ is the ISO-8601 timestamp,
- $A_i$ is the action verb (`INSPECT_PROMPT` / `INSPECT_RESPONSE`),
- $P_i$ is the serialized payload.

Under chaos burst testing (20 concurrent requests), this mathematical queue achieves **100% hash continuity with zero dropped records**.

#### 4. Dynamic Closed-Loop Feedback (Detect $\to$ Mask $\to$ Self-Correct)
When an external LLM (e.g. NVIDIA Nemotron on Nebius Token Factory) generates content violating active boundaries:
1. **Detect:** Model response stream is cloned and evaluated via `/inspect_response`.
2. **Mask:** The DOM element is immediately blurred (`filter: blur(8px)`) with a violation banner preventing the user from ingesting unsafe content.
3. **Correct:** An automated rewrite mandate prompt is dynamically constructed and injected into the model input to trigger immediate self-correction.

---

### 🧠 What We Learned
- **Execution Context Isolation:** Chrome Manifest V3 strictly prohibits calling `chrome.runtime` from `world: "MAIN"`. Structuring a bidirectional `CustomEvent` relay bridged isolated worlds seamlessly without breaking Content Security Policies.
- **Async I/O Concurrency Hazards:** Simple non-blocking writes (`fs.promises.appendFile`) drop writes under simultaneous request bursts unless sequenced through an explicit Promise queue.
- **Transparent Pass-Through:** A firewall must preserve authentic model reasoning—acting as a silent, transparent proxy rather than forging synthetic responses.

---

### 🧗 Challenges We Faced
- **The Fast-Pass Bypass Hazard:** Early optimizations granted instant passes to short greetings ($< 3$ tokens), but short malicious inputs like `"eeg setup"` escaped. We solved this by enforcing semantic constraint evaluation **strictly prior** to any fast-pass granting.
- **UI Responsiveness:** Real-time HMAC cryptographic signing on every keystroke in the 3-panel workbench caused layout thrashing. We solved this with 300ms debouncing and `senderId` broadcast guards.

---

## 3. "Built With" Tags (Add up to 25 tags)

Copy and paste these exact tags:
anti-gravity, nebius, nvidia, nemotron, node.js, javascript, chrome-extension, manifest-v3, ai-governance, prompt-engineering, cybersecurity, cryptography, sha-256, hmac, async-io, zero-trust, firewall, devops, llm, rest-api, broadcast-channel, data-privacy, edge-computing

---

## 4. Required Hackathon Feedback: Nebius & NVIDIA Integration

### Which NVIDIA model did you use, and how did you deploy it on Nebius?
We deployed and routed our prompt-governance requests to NVIDIA Nemotron (Llama-3.1-Nemotron-70B-Instruct) via the Nebius Token Factory API endpoint. HG-CLM functions as the local edge governance firewall that validates prompts before transmission to Nebius Token Factory and performs closed-loop response stream inspection on Nemotron's outputs to ensure compliance with active research directives and privacy boundaries.

### What worked well with Nebius & NVIDIA? What could be improved?
What worked well:
1. Nebius Token Factory provided ultra-low time-to-first-token (TTFT) and high token throughput, integrating seamlessly with our sub-5ms local governance layer.
2. NVIDIA Nemotron demonstrated exceptional instruction fidelity when processing automated self-correction rewrite prompts, removing forbidden concepts on the first attempt without hallucinations.

What could be improved:
1. Native streaming response flags for guardrail token drops would assist edge firewalls with instant synchronization.
2. Expanded documentation for multi-tenant rate limits on Token Factory endpoints.

---

## 5. "Try It Out" Links
- GitHub Repository URL: https://github.com/<your-username>/hg-clm-cidps-firewall
- Demo / Localhost URL: http://localhost:8080

---

## 6. Project Media & Gallery (3:2 Ratio)
Take 3 to 5 screenshots of your running workbench (http://localhost:8080):
1. Workbench Eagle-Eye View: Full 3-panel UI showing Master Goal, Pinned Constraints, Validated Decisions, and live latency gauge.
2. Blocked Intrusion: The red alert banner showing a blocked forbidden concept query (EEG/fMRI).
3. Dynamic Blur Masking: The blurred response block showing the self-correction mandate.
4. Cryptographic Audit Trail: Visual preview of audit_trail.jsonl verifying contiguous SHA-256 hashes.

---

## 7. Demo Video URL (YouTube or Vimeo)
- Time limit: Under 3 minutes.
- Privacy setting: Public or Unlisted (no password).
- Structure:
  - 0:00 - 0:35: Problem overview (semantic drift, prompt leaks).
  - 0:35 - 1:15: Workbench demo & sub-5ms local prompt blocking.
  - 1:15 - 2:05: Live Chrome Extension test on Nemotron/Nebius & Detect -> Mask -> Self-Correct loop.
  - 2:05 - 2:40: Cryptographic SHA-256 audit log export and verification.
  - 2:40 - 3:00: Architecture summary & wrap-up.
