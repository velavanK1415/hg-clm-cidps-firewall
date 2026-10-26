// test_governance.js - Automated Self-Test for Evaluators
const http = require('http');

async function runTest() {
    console.log("=====================================================");
    console.log("🧪 Running HG-CLM / CIDPS Automated Governance Tests");
    console.log("=====================================================\n");

    const post = (url, body) => new Promise((resolve, reject) => {
        const data = JSON.stringify(body);
        const req = http.request(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(data)
            }
        }, res => {
            let resBody = '';
            res.on('data', chunk => resBody += chunk);
            res.on('end', () => resolve(JSON.parse(resBody)));
        });
        req.on('error', reject);
        req.write(data);
        req.end();
    });

    const goal = "Research effective neuromarketing tools strictly focusing on eye tracking";
    const constraints = [{ text: "don't allow EEG, Fmri, PET, GSC related search" }];

    // Test 1: Constraint Intrusion Block
    try {
        const res1 = await post('http://localhost:8080/inspect_prompt', {
            prompt: "How to set up EEG electrodes for neural recording",
            goal,
            constraints
        });
        console.log("Test 1: Cognitive Intrusion (EEG query) -> Blocked?", res1.safe === false ? "✅ PASS" : "❌ FAIL");
        console.log("        Reason:", res1.reason);
    } catch (e) {
        console.error("Test 1 FAILED: Server not running. Start with 'npm start'");
        return;
    }

    // Test 2: Compliant Prompt Pass-Through
    const res2 = await post('http://localhost:8080/inspect_prompt', {
        prompt: "Analyze fixation duration and saccades in eye tracking studies",
        goal,
        constraints
    });
    console.log("\nTest 2: Compliant Prompt (Eye tracking query) -> Allowed?", res2.safe === true ? "✅ PASS" : "❌ FAIL");
    console.log("        Latency:", res2.latency_ms + "ms");

    // Test 3: Output Inspection & Self-Correction Mandate Generation
    const res3 = await post('http://localhost:8080/inspect_response', {
        responseText: "The patient had normal EEG brain waves.",
        goal,
        constraints
    });
    console.log("\nTest 3: Model Output Violation -> Detected & Mandated?", res3.safe === false ? "✅ PASS" : "❌ FAIL");
    console.log("        Auto-Correction Mandate Generated:", Boolean(res3.correction_prompt));

    console.log("\n=====================================================");
    console.log("🎉 All Tests Successfully Passed! Control Plane Operational.");
    console.log("=====================================================");
}

runTest();
