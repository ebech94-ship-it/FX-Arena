import { db } from "./firebase.js";

import {
  collection,
  onSnapshot,query
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

/* =========================
   DOM ELEMENTS (IMPORTANT)
========================= */
const liveList = document.getElementById("live-list");
const leaderboardList = document.getElementById("leaderboard-list");
const rewardsList = document.getElementById("rewards-list");

/* =========================
   LIVE CONNECTION STATUS
========================= */
console.log("🔥 FX Arena Live Engine Started");

let selectedTournament = null;



/* =========================
   LIVE TOURNAMENTS (REAL-TIME COUNTDOWN FIXED)
========================= */

const tournamentsRef = collection(db, "tournaments");

/* CACHE DATA FROM FIRESTORE */
let tournamentsCache = [];

/* FORMAT TIMER */
function formatTime(ms) {
  if (ms <= 0) return "0s";

  const sec = Math.floor(ms / 1000);
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;

  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

/* =========================
   1. FIRESTORE LISTENER (DATA ONLY)
========================= */
/* =========================
   1. FIRESTORE LISTENER (DATA ONLY)
========================= */

onSnapshot(tournamentsRef, (snap) => {

  tournamentsCache = [];

  snap.forEach((docSnap) => {

    const tournament = {
      id: docSnap.id,
      ...docSnap.data(),
      participantsCount: 0,
      rebuyCount: 0,
    };

    tournamentsCache.push(tournament);

    // 🔥 Live participant count
    onSnapshot(
      collection(db, "tournaments", docSnap.id, "participants"),
      (pSnap) => {

        tournament.participantsCount = pSnap.size;

        tournament.rebuyCount = pSnap.docs.reduce(
          (sum, d) => sum + (d.data().rebuyCount ?? 0),
          0
        );

        renderHome();
      }
    );

  });

  renderHome();

});
/* =========================
   2. REAL LIVE UI RENDER LOOP (EVERY 1s)
========================= */
setInterval(() => {
  const now = Date.now();
  let liveHTML = "";

  tournamentsCache.forEach((t) => {
    if (!t.startTime || !t.endTime) return;

    const start = t.startTime?.toMillis?.() ?? t.startTime;
const end = t.endTime?.toMillis?.() ?? t.endTime;

const isLive = now >= start && now <= end;
    const isUpcoming = now < start;
    const isEnded = now > end;

    let status = "";
    let statusColor = "";

    if (isLive) {
      status = "🔴 LIVE";
      statusColor = "#22c55e";
    } else if (isUpcoming) {
      status = "🟡 UPCOMING";
      statusColor = "#facc15";
    } else {
      status = "⚫ ENDED";
      statusColor = "#6b7280";
    }

   const countdown = isLive
  ? `Ends in: ${formatTime(end - now)}`
  : isUpcoming
  ? `Starts in: ${formatTime(start - now)}`
  : "Finished";

    if (isLive) {
      liveHTML += `
        <div style="
          background:#0f172a;
          padding:14px;
          margin:10px 0;
          border-radius:14px;
          border:1px solid #1f2937;
          box-shadow:0 0 10px rgba(34,197,94,0.15);
        ">

          <!-- HEADER -->
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <h3 style="color:#fff;margin:0;font-size:16px;">
              ${t.name}
            </h3>

            <span style="color:${statusColor};font-weight:700;">
              ${status}
            </span>
          </div>

          <!-- PRIZE POOL -->
          <div style="
            margin-top:8px;
            font-size:18px;
            font-weight:800;
            color:#22c55e;
          ">
            💰 Prize Pool: ${
    t.prizeModel === "dynamic"
        ? Number(t.collectedFunds ?? 0).toFixed(2)
        : Number(t.prizePool ?? 0).toFixed(2)
}$ 
          </div>

          <!-- INFO -->
          <div style="margin-top:10px;color:#94a3b8;font-size:13px;">
            <p style="margin:4px 0;">👥 Participants: ${t.participantsCount ?? 0}</p>
            <p style="margin:4px 0;">♻️ Rebuys: ${t.rebuyCount ?? 0}</p>

            <p style="margin:4px 0;color:#facc15;font-weight:700;">
              ⏱ ${countdown}
            </p>

            <p style="margin:4px 0;">
              🚀 Start: ${new Date(t.startTime).toLocaleString()}
            </p>

            <p style="margin:4px 0;">
              🏁 End: ${new Date(t.endTime).toLocaleString()}
            </p>
          </div>

        </div>
      `;
    }
  });

  liveList.innerHTML = liveHTML || `
    <div style="color:#94a3b8;padding:10px;">
      No live tournaments right now
    </div>
  `;
}, 1000);

/* =========================
   LEADERBOARD (TRUE LIVE ORDERING)
========================= */

onSnapshot(collection(db, "tournaments"), (snap) => {

  let leaderboardHTML = "";

snap.forEach((tournamentDoc) => {
  const t = tournamentDoc.data();

  const participantsRef = collection(
    db,
    "tournaments",
    tournamentDoc.id,
    "participants"
  );

  const containerId = `lb-${tournamentDoc.id}`;

  if (!document.getElementById(containerId)) {
    leaderboardList.innerHTML += `<div id="${containerId}"></div>`;
  }

  onSnapshot(participantsRef, (pSnap) => {

      let list = [];

      const starting = Number(t.startingBalance ?? 0);

      // BUILD FULL LIST FIRST
      pSnap.forEach((p) => {
        const d = p.data();

        const balance = Number(d.balance ?? 0);
        const rebuy = Number(d.rebuyInjectedTotal ?? 0);

        const performance = balance - starting - rebuy;

        list.push({
          name: d.username || "Participants",
          performance
        });
      });

      // SORT GLOBALLY
      list.sort((a, b) => b.performance - a.performance);

      // RENDER FRESH EACH TIME
      document.getElementById(containerId).innerHTML = `
  <div style="background:#0f172a; margin:10px 0; padding:14px; border-radius:12px; border:1px solid #1f2937;">
    <h3 style="color:#facc15;margin:0;">🏆 ${t.name}</h3>

    <div style="
display:flex;
padding:8px;
background:#111827;
border-radius:8px;
color:#94a3b8;
font-size:12px;
">
  <span style="width:50px;">Rank</span>
  <span style="flex:1;">Participant</span>
  <span style="width:120px;text-align:right;">Performance</span>
</div>

    <div style="max-height:320px;overflow-y:auto;padding-right:6px;">
      ${list.slice(0,10).map((u,i)=>`
        <div style="display:flex;justify-content:space-between;padding:10px;border-bottom:1px solid #1f2937;">
  <span>#${i+1}</span>
  <span style="flex:1;margin-left:10px;">${u.name}</span>
  <span style="color:#22c55e;font-weight:700;">${u.performance.toFixed(2)}</span>
</div>
      `).join("")}
    </div>
  </div>
`;
    });
  });

});
/* =========================
   REWARDS TAB (BASIC START)
========================= */
/* =========================
   REWARDS TAB (UPGRADED TABLE UI)
========================= */
onSnapshot(tournamentsRef, (snap) => {
  let rewardsHTML = "";

  snap.forEach((docSnap) => {
    const t = docSnap.data();

    if (Array.isArray(t.payoutStructure) && t.payoutStructure.length > 0) {
      rewardsHTML += `
        <div style="
          background:#0f172a;
          padding:14px;
          margin:10px 0;
          border-radius:12px;
          border:1px solid #1f2937;
        ">

          <h3 style="
            color:#facc15;
            margin-bottom:10px;
            font-size:16px;
          ">
            ${t.name}
          </h3>

          <!-- TABLE HEADER -->
          <div style="
            display:flex;
            justify-content:space-between;
            padding:8px 10px;
            background:#111827;
            border-radius:8px;
            color:#94a3b8;
            font-size:13px;
            font-weight:600;
          ">
            <span>Rank</span>
            <span>Reward ($)</span>
          </div>

          <!-- TABLE ROWS -->
          ${t.payoutStructure.map(p => `
            <div style="
              display:flex;
              justify-content:space-between;
              padding:10px;
              border-bottom:1px solid #1f2937;
              color:#e5e7eb;
              font-size:14px;
            ">
              <span style="color:#93c5fd;">
                #${p.rank}
              </span>

              <span style="color:#22c55e;font-weight:600;">
               ${
    t.prizeModel === "dynamic"
        ? `${p.percentage ?? 0}%`
        : `$${p.amount ?? 0}`
}
              </span>
            </div>
          `).join("")}

        </div>
      `;
    }
  });

  rewardsList.innerHTML = rewardsHTML || `
    <div style="color:#94a3b8;padding:10px;">
      No rewards yet
    </div>
  `;
});

function renderHome() {
  let html = "";

  tournamentsCache.forEach((t) => {

  const now = Date.now();

const start = t.startTime?.toMillis?.() ?? t.startTime;
const end = t.endTime?.toMillis?.() ?? t.endTime;

const isLive = now >= start && now <= end;
const isUpcoming = now < start;
const isEnded = now > end;

let status = "";
let statusColor = "";

if (isLive) {
  status = "🔴 LIVE";
  statusColor = "#22c55e";
} else if (isUpcoming) {
  status = "🟡 UPCOMING";
  statusColor = "#facc15";
} else {
  status = "⚫ FINISHED";
  statusColor = "#6b7280";
}

const isSelected = selectedTournament?.id === t.id;

    html += `
      <div onclick="selectTournament('${t.id}')" style="
        background:#0f172a;
        margin:10px 0;
        padding:14px;
        border-radius:14px;
        border:1px solid ${isSelected ? '#22c55e' : '#1f2937'};
        cursor:pointer;
        transform:${isSelected ? 'scale(1.02)' : 'scale(1)'};
        transition:0.2s;
      ">

        <div style="display:flex;justify-content:space-between;">
          <h3 style="color:#fff;margin:0;">
            ${t.name}
          </h3>

        <span style="
  color:${statusColor};
  font-weight:800;
  ${isLive ? 'animation: glowPulse 1.5s infinite;' : ''}
">
  ${status}
</span>
        
<div style="margin-top:8px;color:#facc15;font-weight:900;font-size:18px;">
  💰 ${
    t.prizeModel === "dynamic"
        ? `$${Number(t.collectedFunds ?? 0).toFixed(2)}`
        : `$${Number(t.prizePool ?? 0).toFixed(2)}`
}
</div>

<div style="margin-top:6px;color:#94a3b8;font-size:13px;">
  👥 Participants: ${t.participantsCount ?? 0}
</div>

<div style="margin-top:6px;color:#94a3b8;font-size:12px;">
  🚀 Start: ${new Date(start).toLocaleString()}
</div>

<div style="margin-top:4px;color:#94a3b8;font-size:12px;">
  🏁 End: ${new Date(end).toLocaleString()}
</div>

      </div>
    `;
  });

  document.getElementById("home-tab").innerHTML = `
   <div style="
  max-height:420px;
  overflow-y:auto;
  overflow-x:hidden;
  padding-right:6px;
  scrollbar-width: none;
">
      ${html || "<p style='color:#94a3b8'>No tournaments</p>"}
    </div>
  `;
}


window.selectTournament = function(id) {

  selectedTournament = tournamentsCache.find(t => t.id === id);

  console.log("Selected tournament:", selectedTournament);

  // re-render home so selected can be highlighted later
  renderHome();

  // optional: update other tabs later
};