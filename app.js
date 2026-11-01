import { db } from "./firebase.js";

import {
  collection,
  onSnapshot,
  query,
  getCountFromServer,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  increment,
 
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

/* =========================
   DOM ELEMENTS (IMPORTANT)
========================= */
const liveList = document.getElementById("live-list");
const leaderboardList = document.getElementById("leaderboard-list");
const upcomingList = document.getElementById("upcoming-list");
const rewardsList = document.getElementById("rewards-list");

const tournamentsRef = collection(db, "tournaments");
/* =========================
   LIVE CONNECTION STATUS
========================= */
console.log("🔥 FX Arena Live Engine Started");

window.addEventListener("DOMContentLoaded", () => {

  updateTraderCount();
  updateDownloadCount();
  trackOnlineUsers();

});
onSnapshot(tournamentsRef,(snap)=>{
  document.getElementById("tournament-count").innerText =
  snap.size + "+";
});

let selectedTournament = null;



/* =========================
   LIVE TOURNAMENTS (REAL-TIME COUNTDOWN FIXED)
========================= */



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

function formatDuration(minutes) {
  if (!Number.isFinite(minutes) || minutes <= 0) return "0 minutes";

  const months = Math.floor(minutes / 43200);
  const weeks = Math.floor((minutes % 43200) / 10080);
  const days = Math.floor((minutes % 10080) / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const mins = minutes % 60;

  const parts = [];

  if (months) parts.push(`${months} month${months > 1 ? "s" : ""}`);
  if (weeks) parts.push(`${weeks} week${weeks > 1 ? "s" : ""}`);
  if (days) parts.push(`${days} day${days > 1 ? "s" : ""}`);
  if (hours) parts.push(`${hours} hour${hours > 1 ? "s" : ""}`);
  if (mins) parts.push(`${mins} minute${mins > 1 ? "s" : ""}`);

  return parts.join(" ");
}
function getTournamentStatus(startTime, endTime) {
  const start = startTime?.toMillis?.() ?? Number(startTime);
  const end = endTime?.toMillis?.() ?? Number(endTime);
  const now = Date.now();

  if (!Number.isFinite(start) || !Number.isFinite(end)) {
    return { text: "UNKNOWN", color: "#94a3b8" };
  }

  if (now < start) {
    return { text: "🟡 UPCOMING", color: "#facc15" };
  }

  if (now < end) {
    return { text: "🔴 ONGOING", color: "#22c55e" };
  }

  return { text: "⚫ FINISHED", color: "#9ca3af" };
}

function tournamentStatusBadge(t) {
  const start = t.startTime?.toMillis?.() ?? Number(t.startTime);
  const end = t.endTime?.toMillis?.() ?? Number(t.endTime);
  const status = getTournamentStatus(start, end);

  return `
    <span
      class="tournament-status-badge"
      data-start="${start}"
      data-end="${end}"
      style="
        display:inline-block;
        padding:5px 10px;
        border-radius:20px;
        background:#1e293b;
        color:${status.color};
        font-size:11px;
        font-weight:800;
        white-space:nowrap;
      "
    >${status.text}</span>
  `;
}

setInterval(() => {
  document.querySelectorAll(".tournament-status-badge").forEach(badge => {
    const status = getTournamentStatus(
      Number(badge.dataset.start),
      Number(badge.dataset.end)
    );

    badge.textContent = status.text;
    badge.style.color = status.color;
  });
}, 1000);
/* =========================
   1. FIRESTORE LISTENER (DATA ONLY)
========================= */

onSnapshot(tournamentsRef, (snap) => {

  tournamentsCache = [];
  const tournamentElement = document.getElementById("tournament-count");
if (tournamentElement) {
  tournamentElement.innerText = snap.size + "+";
}

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
updateStats(snap);
});

/* =========================
   2. REAL LIVE UI RENDER LOOP (EVERY 1s)
========================= */
/* =========================
   2. LIVE + UPCOMING TOURNAMENTS
========================= */


/* =========================
   2. LIVE + UPCOMING TOURNAMENTS
========================= */


setInterval(() => {
  const now = Date.now();

  let liveHTML = "";
  let upcomingHTML = "";
  let liveCount = 0;
  let upcomingCount = 0;

  tournamentsCache.forEach((t) => {

    // Support both Firestore Timestamps and numeric timestamps
    const start = t.startTime?.toMillis?.() ?? Number(t.startTime);
    const end = t.endTime?.toMillis?.() ?? Number(t.endTime);

    if (!Number.isFinite(start) || !Number.isFinite(end)) return;

    const isLive = now >= start && now < end;
    const isUpcoming = now < start;
    const isEnded = now >= end;

    if (isEnded) return;

    const countdown = isLive
      ? `Ends in: ${formatTime(end - now)}`
      : `Starts in: ${formatTime(start - now)}`;

    const duration = Number(t.durationMinutes ?? 0);
    const rebuyFee = Number(t.rebuyFee ?? 0);
    const entryFee = Number(t.entryFee ?? 0);
    const startingBalance = Number(t.startingBalance ?? 0);

    const prizePool = t.prizeModel === "dynamic"
      ? Number(t.collectedFunds ?? 0)
      : Number(t.prizePool ?? 0);

    const tournamentInfo = `
      <div style="margin-top:12px;color:#cbd5e1;font-size:13px;">
        <p>📅 Start: ${new Date(start).toLocaleString()}</p>
        <p>🏁 End: ${new Date(end).toLocaleString()}</p>
        <p>⏱ Duration: ${formatDuration(duration)}</p>
        <p>🎟️ Entry Fee: $${entryFee.toFixed(2)}</p>
        <p>🔁 Rebuy Fee: $${rebuyFee.toFixed(2)}</p>
        <p>💼 Starting Balance: $${startingBalance.toFixed(2)}</p>
        <p>👥 Participants: ${t.participantsCount ?? 0}</p>
      </div>
    `;

    const card = `
      <div class="public-tournament-card ${isLive ? "live-tournament-card" : "upcoming-tournament-card"}">
        <div class="public-tournament-heading">
          <h3>${t.name || "FX ARENA Tournament"}</h3>
          <span class="${isLive ? "public-tournament-live" : "public-tournament-upcoming"}">
            ${isLive ? "🔴 LIVE" : "🟡 UPCOMING"}
          </span>
        </div>

        <div class="public-tournament-prize">
          🏆 ${t.prizeModel === "dynamic" ? "Generated Prize Pool" : "Prize Pool"}: $${prizePool.toFixed(2)}
        </div>

        ${tournamentInfo}

        <div class="public-tournament-countdown">
          ⏱ ${countdown}
        </div>

        ${isUpcoming ? `
          <div class="upcoming-notice">
            Get ready! This tournament is coming soon.
            Download FX ARENA and prepare to participate.
          </div>
        ` : ""}
      </div>
    `;

    if (isLive) {
      liveCount++;
      liveHTML += card;
    } else if (isUpcoming) {
      upcomingCount++;
      upcomingHTML += card;
    }
  });

  // Render live tournaments
  if (liveList) {
    liveList.innerHTML = liveHTML || `
      <div class="empty-tournament-message">
        No live tournaments right now.
      </div>
    `;
  }

  // Render upcoming tournaments
  if (upcomingList) {
    upcomingList.innerHTML = upcomingHTML || `
      <div class="empty-tournament-message">
        No upcoming tournaments at the moment.
      </div>
    `;
  }

  // UPDATE LIVE COUNTS
  const liveCountElement = document.getElementById("live-tournament-count");
  const liveMarqueeElement = document.getElementById("live-tournament-count-marquee");

  if (liveCountElement) {
    liveCountElement.textContent = liveCount;
  }

  if (liveMarqueeElement) {
    liveMarqueeElement.textContent = liveCount;
  }

  // UPDATE UPCOMING COUNTS
  const upcomingCountElement = document.getElementById("upcoming-tournament-count");
  const upcomingMarqueeElement = document.getElementById("upcoming-tournament-count-marquee");

  if (upcomingCountElement) {
    upcomingCountElement.textContent = upcomingCount;
  }

  if (upcomingMarqueeElement) {
    upcomingMarqueeElement.textContent = upcomingCount;
  }

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

       const performance =
  Number(d.performance?.pnl ?? 0);
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
    <div style="
  display:flex;
  justify-content:space-between;
  align-items:center;
  gap:10px;
  flex-wrap:wrap;
  margin-bottom:12px;
">
  <h3 style="color:#facc15;margin:0;">🏆 ${t.name}</h3>

  ${tournamentStatusBadge(t)}
</div>

  <div style="
display:flex;
padding:8px;
background:#111827;
border-radius:8px;
color:#94a3b8;
font-size:12px;
font-weight:700;
">
  <span style="width:60px;text-align:center;">Rank</span>

  <span style="flex:1;text-align:center;">
    Participant
  </span>

  <span style="width:120px;text-align:center;">
    Performance
  </span>
</div>

    <div style="max-height:320px;overflow-y:auto;padding-right:6px;">
      ${list.slice(0,10).map((u,i)=>`
       <div style="
display:flex;
align-items:center;
padding:10px;
border-bottom:1px solid #1f2937;
">

  <span style="
    width:60px;
    text-align:center;
  ">
    #${i+1}
  </span>

  <span style="
    flex:1;
    text-align:center;
    overflow:hidden;
    text-overflow:ellipsis;
    white-space:nowrap;
  ">
    ${u.name}
  </span>

  <span style="
    width:120px;
    text-align:center;
    color:${u.performance >= 0 ? "#22c55e" : "#ef4444"};
    font-weight:700;
  ">
   ${u.performance >= 0 ? "+" : ""}${u.performance.toFixed(2)}$
  </span>

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

         <div style="
  display:flex;
  justify-content:space-between;
  align-items:center;
  gap:10px;
  flex-wrap:wrap;
  margin-bottom:12px;
">
  <h3 style="
    color:#facc15;
    margin:0;
    font-size:16px;
  ">
    🏆 ${t.name}
  </h3>

  ${tournamentStatusBadge(t)}
</div>

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
            <span>🥇Ranks</span>
            <span>🏆 Prize Distribution ($)</span>
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
function updateStats(tournamentsSnap){

  let liveCups = 0;

  const now = Date.now();


  tournamentsSnap.forEach(doc=>{

    const t = doc.data();

    const start = t.startTime?.toMillis?.() ?? t.startTime;
    const end = t.endTime?.toMillis?.() ?? t.endTime;


    if(now >= start && now <= end){
      liveCups++;
    }

  });
}

function updateTraderCount() {

  const counterRef = doc(db, "meta", "userCounter");

  onSnapshot(counterRef, (snap) => {

    console.log("USER COUNTER:", snap.data());

    const count = snap.data().count || 0;

    const traderElement = document.getElementById("trader-count");

    console.log("ELEMENT:", traderElement);

    if (traderElement) {
      traderElement.innerText = count.toLocaleString() + "+";
    }

  });

}

async function updateDownloadCount(){

  const statsRef = doc(db,"websiteStats","downloads");

  onSnapshot(statsRef,(snap)=>{

    if(snap.exists()){

      const count = snap.data().count || 0;

      const el = document.getElementById("download-count");

      if(el){
        el.innerText = count.toLocaleString() + "+";
      }

    }

  });

}

async function trackOnlineUsers(){

  const sessionId = crypto.randomUUID();

  const onlineRef = doc(
    db,
    "websiteStats",
    "online",
    "sessions",
    sessionId
  );


  // create session
  await setDoc(onlineRef,{
    active:true,
    lastSeen:Date.now()
  });


  // heartbeat every 20 seconds
  setInterval(async()=>{

    await setDoc(
      onlineRef,
      {
        active:true,
        lastSeen:Date.now()
      },
      {
        merge:true
      }
    );

 },30000);


  // listen online count
  const sessionsRef = collection(
    db,
    "websiteStats",
    "online",
    "sessions"
  );


  onSnapshot(sessionsRef,(snap)=>{

    const now = Date.now();

    let online = 0;


    snap.forEach(doc=>{

      const data = doc.data();

      // active within last 60 seconds
      if(
        data.active === true &&
  now - data.lastSeen < 60000
      ){
        online++;
      }

    });


    const el = document.getElementById(
      "online-count"
    );


    if(el){
      el.innerText = online;
    }

  });

}

window.selectTournament = function(id) {

  selectedTournament = tournamentsCache.find(t => t.id === id);

  console.log("Selected tournament:", selectedTournament);

  // re-render home so selected can be highlighted later
  renderHome();

  // optional: update other tabs later
};

window.trackDownload = async function(){

 const statsRef = doc(db,"websiteStats","downloads");

 updateDoc(statsRef,{
   count: increment(1)
 }).catch(async()=>{

   await setDoc(statsRef,{
     count:1
   });

 });

};
/* =========================================
   GODSPEED TECHNOLOGIES WEBSITE ENGAGEMENT
========================================= */

// WEBSITE VIEWS
function trackWebsiteViews() {
  const viewRef = doc(db, "websiteStats", "views");

  if (!sessionStorage.getItem("gsWebsiteViewed")) {
    setDoc(viewRef, {
      count: increment(1)
    }, { merge: true })
      .then(() => sessionStorage.setItem("gsWebsiteViewed", "true"))
      .catch(error => console.error("Website view tracking failed:", error));
  }

  onSnapshot(viewRef, snap => {
    const el = document.getElementById("website-view-count");
    if (el) {
      el.textContent = (snap.data()?.count || 0).toLocaleString();
    }
  });
}


// WEBSITE LIKES
function trackWebsiteLikes() {
  const likesRef = doc(db, "websiteStats", "likes");

  onSnapshot(likesRef, snap => {
    const el = document.getElementById("website-like-count");
    if (el) {
      el.textContent = (snap.data()?.count || 0).toLocaleString();
    }
  });
}

window.likeWebsite = async function() {
  const likeKey = "gsWebsiteLiked";

  if (localStorage.getItem(likeKey)) {
    alert("You have already liked our website. Thank you!");
    return;
  }

  const likesRef = doc(db, "websiteStats", "likes");

  try {
    await setDoc(likesRef, {
      count: increment(1)
    }, { merge: true });

    localStorage.setItem(likeKey, "true");
  } catch (error) {
    console.error("Like failed:", error);
    alert("Could not register your like. Please try again.");
  }
};


// WEBSITE SHARING
window.shareWebsite = async function() {
  const shareData = {
    title: "GodSpeed Technologies",
    text: "Discover GodSpeed Technologies — Innovating Today. Transforming Tomorrow.",
    url: "https://www.republic.beauty/"
  };

  try {
    if (navigator.share) {
      await navigator.share(shareData);
    } else {
      await navigator.clipboard.writeText(shareData.url);
      alert("Website link copied. Share it with others!");
    }
  } catch (error) {
    if (error.name !== "AbortError") {
      console.error("Sharing failed:", error);
      alert("Could not share the website. Please copy the website link.");
    }
  }
};


// WEBSITE COMMENTS
function loadWebsiteComments() {
  const commentsRef = collection(db, "websiteComments");

  onSnapshot(commentsRef, snap => {
    const container = document.getElementById("website-comment-list");
    if (!container) return;

    container.replaceChildren();

    const comments = snap.docs
      .map(item => item.data())
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
      .slice(0, 30);

    if (comments.length === 0) {
      container.textContent = "Be the first to share your thoughts.";
      return;
    }

    comments.forEach(comment => {
      const card = document.createElement("div");
      const name = document.createElement("strong");
      const message = document.createElement("p");

      name.textContent = comment.name || "Visitor";
      message.textContent = comment.message || "";

      card.append(name, message);
      container.appendChild(card);
    });
  }, error => {
    console.error("Could not load comments:", error);
  });
}

window.submitWebsiteComment = async function() {
  const nameInput = document.getElementById("comment-name");
  const messageInput = document.getElementById("comment-message");

  const name = nameInput.value.trim();
  const message = messageInput.value.trim();

  if (!name || !message) {
    alert("Please enter your name and comment.");
    return;
  }

  if (name.length > 40 || message.length > 500) {
    alert("Your comment is too long.");
    return;
  }

  try {
    const commentRef = doc(
      db,
      "websiteComments",
      crypto.randomUUID()
    );

    await setDoc(commentRef, {
      name,
      message,
      createdAt: Date.now()
    });

    nameInput.value = "";
    messageInput.value = "";

    alert("Your comment has been posted. Thank you!");
  } catch (error) {
    console.error("Comment submission failed:", error);
    alert("Could not post your comment. Please try again.");
  }
};


// START WEBSITE ENGAGEMENT
window.addEventListener("DOMContentLoaded", () => {
  trackWebsiteViews();
  trackWebsiteLikes();
  loadWebsiteComments();
});