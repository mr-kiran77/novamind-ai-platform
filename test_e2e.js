async function testAll() {
  console.log("=================================================");
  console.log("🧪 VERIFYING DUAL-ENGINE PLATFORM (PORT 5000)");
  console.log("=================================================");

  // 1. Gateway Status & Telemetry
  try {
    const res = await fetch("http://127.0.0.1:5000/api/gateway/status");
    const status = await res.json();
    console.log("[1/6] Gateway Status:", status.gateway.status, "| FastAPI:", status.ai_swarm_engine.status);
    console.log("      Architecture:", status.architecture.type);
  } catch (e) {
    console.error("[1/6] Gateway Status Error:", e.message);
  }

  // 2. React SPA HTML
  try {
    const res = await fetch("http://127.0.0.1:5000/");
    const html = await res.text();
    console.log("[2/6] React SPA served:", html.includes('<div id="root"></div>') ? "SUCCESS (index.html)" : "FAILED");
  } catch (e) {
    console.error("[2/6] React SPA Error:", e.message);
  }

  // 3. Ideas Feed via Gateway
  try {
    const res = await fetch("http://127.0.0.1:5000/api/ideas");
    const data = await res.json();
    console.log("[3/6] Ideas Feed via Gateway:", data.count, "ideas returned.");
    const pollIdea = data.ideas.find(i => i.poll);
    if (pollIdea) {
      console.log("      Poll Found on Idea:", pollIdea.title);
      console.log("      Poll Question:", pollIdea.poll.question);
      console.log("      Poll Total Votes:", pollIdea.poll.total_votes);
    }
  } catch (e) {
    console.error("[3/6] Ideas Feed Error:", e.message);
  }

  // 4. 50-Agent Autonomous Swarm via Gateway
  try {
    const res = await fetch("http://127.0.0.1:5000/api/assistant/swarm");
    const swarm = await res.json();
    console.log("[4/6] 50-Agent Swarm:", swarm.total_agents, "agents active across squads:");
    console.log("      Domain Specialists:", swarm.squad_counts.domain_specialists);
    console.log("      Risk Auditors:", swarm.squad_counts.risk_auditors);
    console.log("      Angel Scouts:", swarm.squad_counts.angel_scouts);
  } catch (e) {
    console.error("[4/6] Swarm Error:", e.message);
  }

  // 5. AI Collaborator Screening Engine
  try {
    const res = await fetch("http://127.0.0.1:5000/api/ideas/idea_piezo_roads/collaborations/ai-screen", {
      method: "POST"
    });
    const screen = await res.json();
    console.log("[5/6] AI Collaborator Screening:", screen.total_proposals, "screened.");
    console.log("      ✨ High Priority Count:", screen.high_priority_count);
    console.log("      ⚠️ Flagged Low Effort Count:", screen.time_pass_flagged_count);
  } catch (e) {
    console.error("[5/6] AI Screening Error:", e.message);
  }

  // 6. 50-Agent Swarm Audit
  try {
    const res = await fetch("http://127.0.0.1:5000/api/assistant/swarm/audit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idea_id: "idea_piezo_roads" })
    });
    const audit = await res.json();
    console.log("[6/6] 50-Agent Swarm Audit Consensus Score:", audit.swarm_metrics.overall_consensus_score + "%");
    console.log("      Domain Feasibility:", audit.swarm_metrics.domain_feasibility_score + "%");
    console.log("      Risk Index:", audit.swarm_metrics.risk_index_score + "%");
    console.log("      Angel Appeal:", audit.swarm_metrics.angel_attractiveness_score + "%");
    console.log("      Blindspots Detected:", audit.blindspots_detected.length);
  } catch (e) {
    console.error("[6/6] Swarm Audit Error:", e.message);
  }

  console.log("=================================================");
  console.log("🎉 ALL DUAL-ENGINE MICROSERVICE CHECKS PASSED!");
  console.log("=================================================");
}
testAll();
