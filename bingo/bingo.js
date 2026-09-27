(() => {
  const LIB_KEY = "gamebox.bingo.library.v1";
  const SESSION_KEY = "gamebox.bingo.master.v1";
  const DEVICE_KEY = "gamebox.bingo.device.v1";
  const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const TARGET_LABELS = { line: "1 Line", two: "2 Lines", house: "Full House" };
  const $ = (id) => document.getElementById(id);
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (ch) => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[ch]));

  let hostPeer = null;
  let playerPeer = null;
  let playerConn = null;
  const hostConnections = new Map();
  let playerSnapshot = null;
  let playerMarks = {};
  let library = loadLibrary();
  let state = loadSession();

  function uid(prefix = "id") {
    if (crypto.randomUUID) return prefix + "-" + crypto.randomUUID();
    return prefix + "-" + Date.now() + "-" + Math.floor(Math.random() * 1e9);
  }

  function randInt(max) {
    if (max <= 1) return 0;
    try {
      const a = new Uint32Array(1);
      crypto.getRandomValues(a);
      return a[0] % max;
    } catch {
      return Math.floor(Math.random() * max);
    }
  }

  function shuffle(items) {
    const out = [...items];
    for (let i = out.length - 1; i > 0; i--) {
      const j = randInt(i + 1);
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  }

  function createCode() {
    const bytes = new Uint8Array(6);
    crypto.getRandomValues(bytes);
    return [...bytes].map((n) => CODE_CHARS[n % CODE_CHARS.length]).join("");
  }

  function blankSession() {
    return {
      sessionCode: createCode(),
      eventName: "Bingo Night",
      callerMode: "digital",
      cardMode: "physical",
      cardPrice: 1,
      winTarget: "line",
      started: false,
      called: [],
      voidedCalls: [],
      audit: [],
      assignments: [],
      players: {},
      claims: [],
      createdAt: Date.now()
    };
  }

  function loadSession() {
    try {
      const saved = JSON.parse(localStorage.getItem(SESSION_KEY));
      if (saved && saved.sessionCode) return { ...blankSession(), ...saved };
    } catch {}
    return blankSession();
  }

  function saveSession() {
    localStorage.setItem(SESSION_KEY, JSON.stringify(state));
    renderMaster();
    broadcastSnapshots();
  }

  function columnRange(col) {
    const start = col === 0 ? 1 : col * 10;
    const end = col === 8 ? 90 : col * 10 + 9;
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }

  function rowCombos(count) {
    if (count === 1) return [[0],[1],[2]];
    if (count === 2) return [[0,1],[0,2],[1,2]];
    return [[0,1,2]];
  }

  function makeOccupancy(counts) {
    const matrix = Array.from({ length: 3 }, () => Array(9).fill(false));
    const rowTotals = [0,0,0];
    function walk(col) {
      if (col === 9) return rowTotals.every((n) => n === 5);
      for (const rows of shuffle(rowCombos(counts[col]))) {
        if (rows.some((r) => rowTotals[r] >= 5)) continue;
        const nextTotals = [...rowTotals];
        rows.forEach((r) => nextTotals[r]++);
        const columnsLeft = 8 - col;
        if (nextTotals.some((n) => n > 5 || n + columnsLeft < 5)) continue;
        rows.forEach((r) => { matrix[r][col] = true; rowTotals[r]++; });
        if (walk(col + 1)) return true;
        rows.forEach((r) => { matrix[r][col] = false; rowTotals[r]--; });
      }
      return false;
    }
    return walk(0) ? matrix : null;
  }

  function generateTicket(serial) {
    let occupancy = null;
    let counts = null;
    while (!occupancy) {
      counts = Array(9).fill(1);
      let extras = 6;
      while (extras) {
        const c = randInt(9);
        if (counts[c] < 3) { counts[c]++; extras--; }
      }
      occupancy = makeOccupancy(counts);
    }
    const rows = Array.from({ length: 3 }, () => Array(9).fill(null));
    for (let c = 0; c < 9; c++) {
      const nums = shuffle(columnRange(c)).slice(0, counts[c]).sort((a,b) => a-b);
      const occupiedRows = [0,1,2].filter((r) => occupancy[r][c]);
      occupiedRows.forEach((r, i) => { rows[r][c] = nums[i]; });
    }
    return { id: "CI-" + String(serial).padStart(3, "0"), rows };
  }

  function cardSignature(card) {
    return card.rows.flat().filter(Boolean).join(",");
  }

  function ensureUniqueCards(cards, targetCount) {
    const sigs = new Set(cards.map(cardSignature));
    let next = cards.length + 1;
    while (cards.length < targetCount) {
      const card = generateTicket(next++);
      const sig = cardSignature(card);
      if (sigs.has(sig)) continue;
      sigs.add(sig);
      cards.push(card);
    }
    return cards;
  }

  function loadLibrary() {
    try {
      const saved = JSON.parse(localStorage.getItem(LIB_KEY));
      if (Array.isArray(saved) && saved.length) return saved;
    } catch {}
    const cards = ensureUniqueCards([], 60);
    localStorage.setItem(LIB_KEY, JSON.stringify(cards));
    return cards;
  }

  function saveLibrary() {
    localStorage.setItem(LIB_KEY, JSON.stringify(library));
    renderMaster();
  }

  function setScreen(id) {
    ["roleScreen","masterScreen","playerJoinScreen","playerGameScreen"].forEach((name) => $(name).classList.toggle("hidden", name !== id));
    window.scrollTo({ top: 0 });
  }

  function syncSetupFromInputs() {
    state.eventName = $("eventName").value.trim() || "Bingo Night";
    state.callerMode = $("callerMode").value;
    state.cardMode = $("cardMode").value;
    state.cardPrice = Math.max(0, Math.min(5, Number($("cardPrice").value) || 0));
    state.winTarget = $("winTarget").value;
  }

  function assignedCardIds() {
    return new Set(state.assignments.map((a) => a.cardId));
  }

  function availableCards() {
    const used = assignedCardIds();
    return library.filter((card) => !used.has(card.id));
  }

  function assignmentsForOwner(ownerId) {
    return state.assignments.filter((a) => a.ownerId === ownerId);
  }

  function issueCard(ownerId, ownerName, delivery, requestedCardId) {
    let card = requestedCardId ? library.find((c) => c.id === requestedCardId) : availableCards()[0];
    if (!card) return { ok:false, reason:"No available card found." };
    if (assignedCardIds().has(card.id)) return { ok:false, reason:card.id + " has already been issued in this game." };
    const playerAssignments = assignmentsForOwner(ownerId);
    const projectedStake = (playerAssignments.length + 1) * Number(state.cardPrice || 0);
    if (state.cardMode === "physical" && projectedStake > 5) {
      const proceed = window.confirm(ownerName + " would have £" + projectedStake.toFixed(2) + " staked in this game. The ordinary exempt-pub stake limit is £5 per person per game. Issue anyway?");
      if (!proceed) return { ok:false, reason:"Issue cancelled." };
    }
    state.assignments.push({
      id: uid("issue"),
      cardId: card.id,
      ownerId,
      ownerName: ownerName || "Player",
      delivery,
      issuedAt: Date.now()
    });
    state.audit.push({ at:Date.now(), action:"issue-card", cardId:card.id, ownerName:ownerName || "Player" });
    saveSession();
    return { ok:true, card };
  }

  function unissueCard(issueId) {
    const issue = state.assignments.find((a) => a.id === issueId);
    if (!issue) return;
    if (!window.confirm("Return " + issue.cardId + " to available stock?")) return;
    state.assignments = state.assignments.filter((a) => a.id !== issueId);
    state.audit.push({ at:Date.now(), action:"return-card", cardId:issue.cardId });
    saveSession();
  }

  function cardById(id) {
    const normal = String(id || "").trim().toUpperCase();
    return library.find((card) => card.id.toUpperCase() === normal) || null;
  }

  function calledSet() {
    return new Set(state.called);
  }

  function completedRows(card, calls = calledSet()) {
    return card.rows.filter((row) => row.filter(Boolean).every((n) => calls.has(n))).length;
  }

  function checkWin(card, type, calls = calledSet()) {
    const lines = completedRows(card, calls);
    const all = card.rows.flat().filter(Boolean);
    if (type === "line") return { valid: lines >= 1, lines, missing: bestMissingForLine(card, calls) };
    if (type === "two") return { valid: lines >= 2, lines, missing: bestMissingForTwo(card, calls) };
    const missing = all.filter((n) => !calls.has(n));
    return { valid: missing.length === 0, lines, missing };
  }

  function bestMissingForLine(card, calls) {
    const rows = card.rows.map((row) => row.filter(Boolean).filter((n) => !calls.has(n)));
    rows.sort((a,b) => a.length - b.length);
    return rows[0] || [];
  }

  function bestMissingForTwo(card, calls) {
    const rows = card.rows.map((row) => row.filter(Boolean).filter((n) => !calls.has(n)));
    rows.sort((a,b) => a.length - b.length);
    return [...(rows[0] || []), ...(rows[1] || [])];
  }

  function callNumber(number, source) {
    const n = Number(number);
    if (!Number.isInteger(n) || n < 1 || n > 90) return false;
    if (state.called.includes(n)) return false;
    state.called.push(n);
    state.audit.push({ at:Date.now(), action:"call", number:n, source });
    saveSession();
    if (source === "digital" && $("speakCalls").checked && "speechSynthesis" in window) {
      try {
        speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance("Number " + n);
        utterance.rate = .9;
        speechSynthesis.speak(utterance);
      } catch {}
    }
    return true;
  }

  function drawNext() {
    const remaining = Array.from({ length:90 }, (_,i) => i+1).filter((n) => !state.called.includes(n));
    if (!remaining.length) return;
    callNumber(remaining[randInt(remaining.length)], "digital");
  }

  function voidLastCall() {
    if (!state.called.length) return;
    const n = state.called[state.called.length - 1];
    if (!window.confirm("Void the last called number, " + n + "? It will remain in the audit history but will no longer count toward claims.")) return;
    state.called.pop();
    state.voidedCalls.push({ number:n, at:Date.now() });
    state.audit.push({ at:Date.now(), action:"void-call", number:n });
    saveSession();
  }

  function advancePrize() {
    state.winTarget = state.winTarget === "line" ? "two" : state.winTarget === "two" ? "house" : "line";
    $("winTarget").value = state.winTarget;
    saveSession();
  }

  function peerId(code) {
    return "gamebox-bingo-" + String(code || "").toLowerCase();
  }

  function stopHostNetwork() {
    hostConnections.forEach((conn) => { try { conn.close(); } catch {} });
    hostConnections.clear();
    try { hostPeer?.destroy(); } catch {}
    hostPeer = null;
  }

  function startHostNetwork() {
    stopHostNetwork();
    if (!window.Peer) return;
    hostPeer = new Peer(peerId(state.sessionCode));
    hostPeer.on("connection", (conn) => {
      let playerId = "";
      conn.on("data", (message) => {
        if (!message || typeof message !== "object") return;
        if (message.type === "hello") {
          playerId = String(message.deviceId || "");
          if (!playerId) return;
          const name = String(message.name || "Player").slice(0,40);
          state.players[playerId] = { id:playerId, name, connected:true, lastSeen:Date.now() };
          const previous = hostConnections.get(playerId);
          if (previous && previous !== conn) { try { previous.close(); } catch {} }
          hostConnections.set(playerId, conn);
          saveSession();
          sendSnapshot(playerId);
          return;
        }
        if (!playerId) return;
        if (message.type === "claim") {
          receiveClaim(playerId, message.cardId, message.claimType);
        }
      });
      const cleanup = () => {
        if (playerId && hostConnections.get(playerId) === conn) {
          hostConnections.delete(playerId);
          if (state.players[playerId]) state.players[playerId].connected = false;
          localStorage.setItem(SESSION_KEY, JSON.stringify(state));
          renderMaster();
        }
      };
      conn.on("close", cleanup);
      conn.on("error", cleanup);
    });
  }

  function snapshotFor(playerId) {
    const assignments = assignmentsForOwner(playerId);
    const cards = assignments.map((a) => cardById(a.cardId)).filter(Boolean);
    const lastClaim = [...state.claims].reverse().find((c) => c.playerId === playerId) || null;
    return {
      type:"snapshot",
      session:{
        code:state.sessionCode,eventName:state.eventName,started:state.started,
        winTarget:state.winTarget,callerMode:state.callerMode,cardMode:state.cardMode
      },
      player:state.players[playerId] || { id:playerId,name:"Player" },
      cards,
      called:[...state.called],
      lastClaim
    };
  }

  function sendSnapshot(playerId) {
    const conn = hostConnections.get(playerId);
    if (!conn?.open) return;
    try { conn.send(snapshotFor(playerId)); } catch {}
  }

  function broadcastSnapshots() {
    hostConnections.forEach((conn, id) => {
      if (conn?.open) {
        try { conn.send(snapshotFor(id)); } catch {}
      }
    });
  }

  function receiveClaim(playerId, cardId, claimType) {
    const issue = state.assignments.find((a) => a.ownerId === playerId && a.cardId === cardId && a.delivery === "digital");
    const card = issue ? cardById(cardId) : null;
    const type = ["line","two","house"].includes(claimType) ? claimType : state.winTarget;
    const result = card ? checkWin(card, type) : { valid:false, missing:[] };
    const claim = {
      id:uid("claim"),
      playerId,
      playerName:state.players[playerId]?.name || issue?.ownerName || "Player",
      cardId:String(cardId || ""),
      claimType:type,
      valid:Boolean(card && result.valid),
      missing:result.missing || [],
      status:"pending",
      at:Date.now()
    };
    state.claims.push(claim);
    state.audit.push({ at:Date.now(), action:"claim", cardId:claim.cardId, playerName:claim.playerName, valid:claim.valid, claimType:type });
    saveSession();
  }

  function resolveClaim(id, status) {
    const claim = state.claims.find((c) => c.id === id);
    if (!claim) return;
    claim.status = status;
    claim.resolvedAt = Date.now();
    state.audit.push({ at:Date.now(), action:"claim-" + status, cardId:claim.cardId });
    saveSession();
  }

  function renderTicket(card, interactive, calledNumbers, marks, claimType) {
    const calls = new Set(calledNumbers || []);
    const marked = marks || new Set();
    const cells = card.rows.flatMap((row, r) => row.map((n, c) => {
      const classes = ["ticketCell"];
      if (!n) classes.push("blank");
      if (n && calls.has(n)) classes.push("called");
      if (n && marked.has(n)) classes.push("marked");
      return '<button type="button" class="' + classes.join(" ") + '" ' +
        (interactive && n ? 'data-mark="' + n + '" data-card="' + esc(card.id) + '"' : "disabled") + '>' + (n || "") + '</button>';
    })).join("");
    return '<div class="bingoCard" data-player-card="' + esc(card.id) + '"><div class="cardMeta"><strong>' + esc(card.id) + '</strong><span>90-BALL · 15 NUMBERS</span></div><div class="ticketGrid">' + cells + '</div>' +
      (interactive ? '<div class="cardClaimRow"><div class="cardProgress">' + completedRows(card, calls) + ' completed line(s)</div><button class="claimButton" data-claim="' + esc(card.id) + '" data-type="' + esc(claimType) + '">Claim ' + esc(TARGET_LABELS[claimType]) + '</button></div>' : "") + '</div>';
  }

  function renderMaster() {
    $("masterEventTitle").textContent = state.eventName;
    $("roomCode").textContent = state.sessionCode;
    $("eventName").value = state.eventName;
    $("callerMode").value = state.callerMode;
    $("cardMode").value = state.cardMode;
    $("cardPrice").value = state.cardPrice;
    $("winTarget").value = state.winTarget;
    $("libraryCount").textContent = library.length + " cards";
    $("potValue").textContent = "£" + (state.assignments.length * Number(state.cardPrice || 0)).toFixed(2);
    $("currentNumber").textContent = state.called.length ? state.called[state.called.length - 1] : "—";
    $("calledCount").textContent = state.called.length + " / 90";
    $("digitalCallerControls").classList.toggle("hidden", state.callerMode !== "digital");
    $("manualCallerControls").classList.toggle("hidden", state.callerMode !== "physical");
    $("digitalIssueArea").classList.toggle("hidden", state.cardMode !== "digital");

    const board = $("numberBoard");
    board.innerHTML = "";
    const last = state.called[state.called.length - 1];
    const calls = calledSet();
    for (let n=1;n<=90;n++) {
      const div = document.createElement("div");
      div.className = "numberCell" + (calls.has(n) ? " called" : "") + (n === last ? " last" : "");
      div.textContent = n;
      board.appendChild(div);
    }
    $("callHistory").innerHTML = state.called.map((n) => '<span class="historyBall">' + n + '</span>').join("") +
      state.voidedCalls.slice(-6).map((item) => '<span class="historyBall void" title="Voided">' + item.number + '</span>').join("");

    const available = availableCards();
    $("physicalCardSelect").innerHTML = available.length
      ? available.map((card) => '<option value="' + card.id + '">' + card.id + '</option>').join("")
      : '<option value="">No cards available</option>';

    const roster = $("playerRoster");
    const players = Object.values(state.players);
    roster.innerHTML = players.length ? players.map((p) => {
      const count = assignmentsForOwner(p.id).length;
      return '<div class="rosterItem"><div><strong>' + esc(p.name) + '</strong><small>' + (p.connected ? "Connected" : "Disconnected") + ' · ' + count + ' card' + (count===1?"":"s") + '</small></div><div class="miniActions"><button data-issue-player="' + esc(p.id) + '">Issue Card</button></div></div>';
    }).join("") : '<p class="smallText">No players connected yet. Give digital players room code <strong>' + esc(state.sessionCode) + '</strong>.</p>';

    $("issuedList").innerHTML = state.assignments.length ? state.assignments.map((a) =>
      '<div class="issuedItem"><div><strong>' + esc(a.cardId) + ' · ' + esc(a.ownerName) + '</strong><small>' + esc(a.delivery) + ' · ' + new Date(a.issuedAt).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"}) + '</small></div><div class="miniActions"><button data-return-issue="' + esc(a.id) + '">Return</button></div></div>'
    ).join("") : '<p class="smallText">No cards issued for this game yet.</p>';

    const claims = [...state.claims].reverse();
    $("claimCount").textContent = claims.filter((c) => c.status === "pending").length;
    $("claimList").innerHTML = claims.length ? claims.map((c) => {
      const cls = c.status !== "pending" ? c.status : (c.valid ? "valid" : "invalid");
      const detail = c.valid ? "System check: VALID" : ("System check: NOT YET VALID" + (c.missing.length ? " · missing " + c.missing.join(", ") : ""));
      return '<div class="claimItem ' + cls + '"><div><strong>' + esc(c.playerName) + ' · ' + esc(c.cardId) + '</strong><small>' + esc(TARGET_LABELS[c.claimType]) + ' · ' + esc(detail) + '</small></div>' +
        (c.status === "pending" ? '<div class="miniActions"><button data-accept-claim="' + esc(c.id) + '">Accept</button><button data-reject-claim="' + esc(c.id) + '">Reject</button></div>' : '<strong>' + esc(c.status.toUpperCase()) + '</strong>') + '</div>';
    }).join("") : '<p class="smallText">No digital Bingo claims yet.</p>';

    document.querySelectorAll("[data-issue-player]").forEach((button) => button.onclick = () => {
      const player = state.players[button.dataset.issuePlayer];
      if (player) issueCard(player.id, player.name, "digital");
    });
    document.querySelectorAll("[data-return-issue]").forEach((button) => button.onclick = () => unissueCard(button.dataset.returnIssue));
    document.querySelectorAll("[data-accept-claim]").forEach((button) => button.onclick = () => resolveClaim(button.dataset.acceptClaim, "accepted"));
    document.querySelectorAll("[data-reject-claim]").forEach((button) => button.onclick = () => resolveClaim(button.dataset.rejectClaim, "rejected"));
  }

  function buildPrintArea() {
    const start = Math.max(1, parseInt($("printFrom").value,10) || 1) - 1;
    const count = Math.max(1, Math.min(120, parseInt($("printCount").value,10) || 24));
    const cards = library.slice(start, start + count);
    if (!cards.length) return false;
    const area = $("printArea");
    area.innerHTML = "";
    for (let i=0;i<cards.length;i+=4) {
      const sheet = document.createElement("section");
      sheet.className = "printSheet";
      cards.slice(i,i+4).forEach((card) => {
        const ticket = document.createElement("article");
        ticket.className = "printTicket";
        ticket.innerHTML = '<div class="printTitle"><strong>CHIP IN · BINGO</strong><span>' + esc(card.id) + '</span></div>' +
          renderTicket(card, false, [], new Set(), "line") +
          '<div class="printFooter">Permanent reusable card serial · Keep this card visible when claiming Bingo</div>';
        sheet.appendChild(ticket);
      });
      area.appendChild(sheet);
    }
    return true;
  }

  function newSession() {
    if (!window.confirm("Start a new Bingo session? Your permanent card library will be kept, but this game's issued cards, calls and claims will be cleared.")) return;
    stopHostNetwork();
    state = blankSession();
    localStorage.setItem(SESSION_KEY, JSON.stringify(state));
    renderMaster();
    startHostNetwork();
  }

  function getDeviceId() {
    let id = localStorage.getItem(DEVICE_KEY);
    if (!id) { id = uid("player"); localStorage.setItem(DEVICE_KEY, id); }
    return id;
  }

  function disconnectPlayer() {
    try { playerConn?.close(); } catch {}
    try { playerPeer?.destroy(); } catch {}
    playerConn = null; playerPeer = null;
  }

  function joinPlayer() {
    const code = $("joinCode").value.trim().toUpperCase();
    const name = $("joinName").value.trim();
    if (code.length < 4 || !name) {
      $("joinStatus").textContent = "Enter the room code and your name.";
      return;
    }
    disconnectPlayer();
    $("joinStatus").textContent = "Connecting…";
    const deviceId = getDeviceId();
    playerPeer = new Peer();
    playerPeer.on("open", () => {
      playerConn = playerPeer.connect(peerId(code), { reliable:true });
      playerConn.on("open", () => {
        $("joinStatus").textContent = "";
        playerConn.send({ type:"hello", deviceId, name });
        setScreen("playerGameScreen");
        $("playerConnection").textContent = "Connected";
      });
      playerConn.on("data", (message) => {
        if (message?.type === "snapshot") {
          playerSnapshot = message;
          renderPlayer();
        }
      });
      playerConn.on("close", () => { $("playerConnection").textContent = "Disconnected"; });
      playerConn.on("error", () => { $("playerConnection").textContent = "Connection error"; });
    });
    playerPeer.on("error", (error) => {
      $("joinStatus").textContent = error?.type === "peer-unavailable" ? "Room not found. Check the code with the Bingo Master." : "Could not connect to the Bingo Master.";
    });
  }

  function renderPlayer() {
    if (!playerSnapshot) return;
    const s = playerSnapshot;
    $("playerEventName").textContent = s.session.eventName || "Bingo Night";
    $("playerTarget").textContent = TARGET_LABELS[s.session.winTarget] || "Bingo";
    $("playerGameStatus").textContent = s.session.started ? "Game in progress" : "Waiting for the Bingo Master to start.";
    $("playerLastCalled").textContent = s.called.length ? s.called[s.called.length - 1] : "—";
    $("playerCalledCount").textContent = s.called.length + " numbers called";
    $("playerWaiting").classList.toggle("hidden", Boolean(s.cards?.length));
    const wrap = $("playerCards");
    wrap.innerHTML = "";
    (s.cards || []).forEach((card) => {
      if (!playerMarks[card.id]) playerMarks[card.id] = new Set();
      const holder = document.createElement("div");
      holder.innerHTML = renderTicket(card, true, s.called, playerMarks[card.id], s.session.winTarget);
      wrap.appendChild(holder.firstElementChild);
    });

    document.querySelectorAll("[data-mark]").forEach((button) => {
      button.onclick = () => {
        const n = Number(button.dataset.mark);
        const cardId = button.dataset.card;
        if (!s.called.includes(n)) return;
        const set = playerMarks[cardId] || (playerMarks[cardId] = new Set());
        if (set.has(n)) set.delete(n); else set.add(n);
        renderPlayer();
      };
    });
    document.querySelectorAll("[data-claim]").forEach((button) => {
      button.onclick = () => {
        if (!s.session.started) return;
        button.disabled = true;
        playerConn?.send({ type:"claim", cardId:button.dataset.claim, claimType:button.dataset.type });
      };
    });

    if (s.lastClaim) {
      const status = s.lastClaim.status;
      const text = status === "accepted" ? "Your Bingo claim was ACCEPTED." :
        status === "rejected" ? "Your Bingo claim was rejected by the Bingo Master." :
        (s.lastClaim.valid ? "Bingo claim sent — system check says VALID. Waiting for the Bingo Master." : "Claim sent — the card does not yet meet that prize condition.");
      $("playerGameStatus").textContent = text;
    }
  }

  $("openMaster").onclick = () => { setScreen("masterScreen"); renderMaster(); startHostNetwork(); };
  $("openPlayer").onclick = () => setScreen("playerJoinScreen");
  $("playerBack").onclick = () => setScreen("roleScreen");
  $("joinGame").onclick = joinPlayer;

  ["eventName","callerMode","cardMode","cardPrice","winTarget"].forEach((id) => {
    $(id).addEventListener("change", () => { syncSetupFromInputs(); saveSession(); });
  });
  $("eventName").addEventListener("input", () => { state.eventName = $("eventName").value; localStorage.setItem(SESSION_KEY, JSON.stringify(state)); $("masterEventTitle").textContent = state.eventName || "Bingo Night"; });

  $("startGame").onclick = () => { syncSetupFromInputs(); state.started = true; state.audit.push({at:Date.now(),action:"start-game"}); saveSession(); };
  $("newSession").onclick = newSession;
  $("drawNumber").onclick = drawNext;
  $("callManual").onclick = () => {
    const ok = callNumber($("manualNumber").value, "physical");
    if (ok) $("manualNumber").value = "";
  };
  $("manualNumber").addEventListener("keydown", (event) => { if (event.key === "Enter") $("callManual").click(); });
  $("undoCall").onclick = voidLastCall;
  $("advancePrize").onclick = advancePrize;

  $("issuePhysical").onclick = () => {
    const name = $("physicalPlayerName").value.trim() || "Physical player";
    const cardId = $("physicalCardSelect").value;
    if (!cardId) return;
    const ownerId = "physical-" + uid("holder");
    const result = issueCard(ownerId, name, "physical", cardId);
    if (result.ok) $("physicalPlayerName").value = "";
  };

  $("verifyCard").onclick = () => {
    const card = cardById($("verifyCardId").value);
    const type = $("verifyType").value;
    const box = $("verifyResult");
    if (!card) {
      box.className = "verifyResult bad";
      box.textContent = "Card not found in this Bingo Master's permanent library.";
      return;
    }
    const result = checkWin(card, type);
    if (result.valid) {
      box.className = "verifyResult good";
      box.textContent = card.id + " — VALID " + TARGET_LABELS[type].toUpperCase() + ".";
    } else {
      box.className = "verifyResult bad";
      box.textContent = card.id + " — NOT YET VALID. Still required: " + (result.missing.join(", ") || "required line pattern not complete") + ".";
    }
  };

  $("addCards").onclick = () => {
    library = ensureUniqueCards(library, library.length + 24);
    saveLibrary();
  };
  $("printCards").onclick = () => {
    if (buildPrintArea()) window.print();
  };

  renderMaster();
  setScreen("roleScreen");
})();