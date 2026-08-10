/* =========================================================
   โหวตรูปภาพ — ข้อมูลกลางบน Firebase (Firestore + Storage)
   ทุกคนที่เข้าเว็บเห็นข้อมูลชุดเดียวกัน อัปเดตแบบเรียลไทม์

   หมายเหตุด้านความปลอดภัย:
   - รหัสผ่านผู้ใช้และรหัสแอดมินตรวจสอบฝั่ง client เท่านั้น (ยังไม่มี
     Firebase Authentication) เหมาะกับงานอีเวนต์/กลุ่มเล็ก ๆ ที่ไว้ใจกัน
     ไม่เหมาะกับระบบที่ต้องป้องกันการโกงระดับสูง เพราะผู้ที่เปิด devtools
     และรู้กติกา Firestore Rules แบบเปิด (ดูคู่มือที่แนบมา) จะแก้ไขข้อมูล
     ตรงได้ ถ้าต้องการความปลอดภัยสูงขึ้นควรเพิ่ม Firebase Authentication
     และ Cloud Functions ตรวจสอบฝั่งเซิร์ฟเวอร์
   ========================================================= */

const LS_SESSION_KEY = "vt_session"; // เก็บแค่ "ใครล็อกอินอยู่บนเครื่องนี้" ไว้ในเครื่อง (ไม่ใช่ข้อมูลกลาง)
const SS_ADMIN_KEY = "vt_admin_ok";
const ADMIN_PASSCODE = "PhaiZa080800272870";

/* ---------- element refs ---------- */
const el = (id) => document.getElementById(id);

const statusPill = el("statusPill");
const whoami = el("whoami");
const logoutBtn = el("logoutBtn");
const openAdminBtn = el("openAdminBtn");
const closeAdminBtn = el("closeAdminBtn");

const authScreen = el("authScreen");
const voteScreen = el("voteScreen");
const adminScreen = el("adminScreen");
const adminLoginModal = el("adminLoginModal");

const loginForm = el("loginForm");
const registerForm = el("registerForm");
const loginError = el("loginError");
const registerError = el("registerError");

const heroTitle = el("heroTitle");
const heroSub = el("heroSub");
const gallery = el("gallery");
const emptyGallery = el("emptyGallery");
const publicResultsSection = el("publicResultsSection");
const publicResults = el("publicResults");

const adminLoginForm = el("adminLoginForm");
const adminPassInput = el("adminPass");
const adminLoginError = el("adminLoginError");

const startTimeInput = el("startTime");
const endTimeInput = el("endTime");
const saveScheduleBtn = el("saveScheduleBtn");

const addImageForm = el("addImageForm");
const imgTitleInput = el("imgTitle");
const imgFileInput = el("imgFile");
const imgPreview = el("imgPreview");
const adminImageList = el("adminImageList");
const imgCount = el("imgCount");

const revealStatus = el("revealStatus");
const toggleRevealBtn = el("toggleRevealBtn");
const resultsBoard = el("resultsBoard");

/* ---------- live state (เติมจาก Firestore แบบเรียลไทม์) ---------- */
let liveImages = [];               // [{id, title, imageUrl, storagePath, votes, createdAt}]
let liveSettings = { start: null, end: null, revealed: false };
let myVotedIds = [];               // รูปที่ผู้ใช้ปัจจุบันโหวตแล้ว
let currentVotingStatus = null;    // 'open' | 'closed' | 'scheduled' | 'not-scheduled'
let addImageBusy = false;

/* =========================================================
   AUTH — ผู้โหวต (users collection ใน Firestore)
   ========================================================= */
function getCurrentUser() {
  return localStorage.getItem(LS_SESSION_KEY);
}

function showAuthTab(tab) {
  document.querySelectorAll(".tab-btn").forEach((b) =>
    b.classList.toggle("active", b.dataset.tab === tab)
  );
  loginForm.classList.toggle("hidden", tab !== "login");
  registerForm.classList.toggle("hidden", tab !== "register");
  loginError.textContent = "";
  registerError.textContent = "";
}

document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => showAuthTab(btn.dataset.tab));
});

registerForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const username = el("regUser").value.trim();
  const password = el("regPass").value;
  registerError.textContent = "";

  if (!username || !password) {
    registerError.textContent = "กรุณากรอกข้อมูลให้ครบ";
    return;
  }

  const submitBtn = registerForm.querySelector("button[type=submit]");
  submitBtn.disabled = true;
  try {
    const userRef = db.collection("users").doc(username);
    const existing = await userRef.get();
    if (existing.exists) {
      registerError.textContent = "มีชื่อผู้ใช้นี้อยู่แล้ว กรุณาใช้ชื่ออื่น";
      return;
    }
    await userRef.set({ password, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
    localStorage.setItem(LS_SESSION_KEY, username);
    enterVoteScreen();
  } catch (err) {
    console.error(err);
    registerError.textContent = "เกิดข้อผิดพลาด กรุณาลองใหม่ (" + err.message + ")";
  } finally {
    submitBtn.disabled = false;
  }
});

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const username = el("loginUser").value.trim();
  const password = el("loginPass").value;
  loginError.textContent = "";

  const submitBtn = loginForm.querySelector("button[type=submit]");
  submitBtn.disabled = true;
  try {
    const snap = await db.collection("users").doc(username).get();
    if (!snap.exists || snap.data().password !== password) {
      loginError.textContent = "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง";
      return;
    }
    localStorage.setItem(LS_SESSION_KEY, username);
    enterVoteScreen();
  } catch (err) {
    console.error(err);
    loginError.textContent = "เกิดข้อผิดพลาด กรุณาลองใหม่ (" + err.message + ")";
  } finally {
    submitBtn.disabled = false;
  }
});

logoutBtn.addEventListener("click", () => {
  localStorage.removeItem(LS_SESSION_KEY);
  location.reload();
});

function enterVoteScreen() {
  authScreen.classList.add("hidden");
  voteScreen.classList.remove("hidden");
  whoami.textContent = "สวัสดี, " + getCurrentUser();
  whoami.classList.remove("hidden");
  logoutBtn.classList.remove("hidden");
  subscribeMyVotes();
  renderAll();
}

/* =========================================================
   ตารางเวลาการโหวต (settings/main ใน Firestore, ฟังแบบเรียลไทม์)
   ========================================================= */
function computeVotingStatus() {
  const s = liveSettings;
  if (!s.start || !s.end) return "not-scheduled";
  const now = new Date();
  const start = new Date(s.start);
  const end = new Date(s.end);
  if (now < start) return "scheduled";
  if (now > end) return "closed";
  return "open";
}

function fmtDate(d) {
  return new Date(d).toLocaleString("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function updateStatusUI() {
  const status = computeVotingStatus();
  const s = liveSettings;
  currentVotingStatus = status;

  statusPill.className = "status-pill";
  if (status === "open") {
    statusPill.classList.add("status-open");
    statusPill.textContent = "🟢 กำลังเปิดโหวต";
    heroTitle.textContent = "โหวตรูปภาพที่คุณชื่นชอบ";
    heroSub.textContent = "ปิดโหวต " + fmtDate(s.end);
  } else if (status === "scheduled") {
    statusPill.classList.add("status-scheduled");
    statusPill.textContent = "🕒 ยังไม่เปิดโหวต";
    heroTitle.textContent = "การโหวตยังไม่เริ่ม";
    heroSub.textContent = "จะเปิดโหวต " + fmtDate(s.start);
  } else if (status === "closed") {
    statusPill.classList.add("status-closed");
    statusPill.textContent = "🔴 ปิดโหวตแล้ว";
    heroTitle.textContent = "การโหวตปิดแล้ว";
    heroSub.textContent = "ขอบคุณทุกคะแนนโหวต";
  } else {
    statusPill.classList.add("status-scheduled");
    statusPill.textContent = "⏳ รอแอดมินตั้งเวลา";
    heroTitle.textContent = "ยังไม่มีการเปิดโหวตในขณะนี้";
    heroSub.textContent = "กรุณากลับมาใหม่ภายหลัง";
  }
}

/* =========================================================
   แกลเลอรีรูปภาพ + การโหวต
   ========================================================= */
function userHasVotedFor(imageId) {
  return myVotedIds.includes(imageId);
}

async function castVote(imageId) {
  const user = getCurrentUser();
  if (!user) return;
  if (currentVotingStatus !== "open") return;
  if (userHasVotedFor(imageId)) return;

  const imageRef = db.collection("images").doc(imageId);
  const voteRef = db.collection("votes").doc(user);

  try {
    await db.runTransaction(async (tx) => {
      const voteSnap = await tx.get(voteRef);
      const votedIds = voteSnap.exists ? (voteSnap.data().votedIds || []) : [];
      if (votedIds.includes(imageId)) return; // กันโหวตซ้ำ (เช่นกดถี่ ๆ)

      const imgSnap = await tx.get(imageRef);
      if (!imgSnap.exists) return;

      tx.update(imageRef, {
        votes: firebase.firestore.FieldValue.increment(1),
      });
      tx.set(
        voteRef,
        { votedIds: firebase.firestore.FieldValue.arrayUnion(imageId) },
        { merge: true }
      );
    });
  } catch (err) {
    console.error(err);
    alert("โหวตไม่สำเร็จ กรุณาลองใหม่ (" + err.message + ")");
  }
}

function renderGallery() {
  gallery.innerHTML = "";
  emptyGallery.classList.toggle("hidden", liveImages.length > 0);

  liveImages.forEach((img) => {
    const card = document.createElement("div");
    card.className = "vote-card";

    const already = userHasVotedFor(img.id);
    const canVote = currentVotingStatus === "open";

    let btnLabel = "โหวต";
    let btnClass = "vote-btn";
    let disabled = false;

    if (already) {
      btnLabel = "✓ โหวตแล้ว";
      btnClass += " voted";
      disabled = true;
    } else if (!canVote) {
      btnLabel =
        currentVotingStatus === "closed" ? "ปิดโหวตแล้ว" : "ยังไม่เปิดโหวต";
      disabled = true;
    }

    card.innerHTML = `
      <div class="thumb-wrap"><img src="${img.imageUrl}" alt="${escapeHtml(img.title)}"></div>
      <div class="card-body">
        <p class="card-title">${escapeHtml(img.title)}</p>
        <button class="${btnClass}" ${disabled ? "disabled" : ""}>${btnLabel}</button>
      </div>
    `;
    card.querySelector("button").addEventListener("click", () => castVote(img.id));
    gallery.appendChild(card);
  });
}

function escapeHtml(str) {
  const d = document.createElement("div");
  d.textContent = str == null ? "" : str;
  return d.innerHTML;
}

/* =========================================================
   ผลโหวต (สาธารณะ + แอดมิน)
   ========================================================= */
function computeRanking() {
  const images = [...liveImages];
  images.sort((a, b) => (b.votes || 0) - (a.votes || 0));
  const maxVotes = images.length ? images[0].votes || 0 : 0;
  return { images, maxVotes };
}

function renderResultsInto(container, { alwaysShow } = { alwaysShow: false }) {
  if (!alwaysShow && !liveSettings.revealed) {
    container.innerHTML = `<p class="no-items">ผลโหวตยังไม่เปิดเผย</p>`;
    return;
  }
  const { images, maxVotes } = computeRanking();
  if (!images.length) {
    container.innerHTML = `<p class="no-items">ยังไม่มีรูปภาพ</p>`;
    return;
  }
  container.innerHTML = images
    .map((img, i) => {
      const isTop = (img.votes || 0) === maxVotes && maxVotes > 0;
      return `
        <div class="result-row ${isTop ? "rank-1" : ""}">
          <span class="result-rank">${i + 1}</span>
          <img class="result-thumb" src="${img.imageUrl}" alt="">
          <span class="result-title">${escapeHtml(img.title)}${isTop ? ' <span class="crown">👑</span>' : ""}</span>
          <span class="result-votes">${img.votes || 0} คะแนน</span>
        </div>`;
    })
    .join("");
}

function renderPublicResults() {
  publicResultsSection.classList.toggle("hidden", !liveSettings.revealed);
  if (liveSettings.revealed) renderResultsInto(publicResults, { alwaysShow: true });
}

/* =========================================================
   แอดมิน — เข้าสู่ระบบ (รหัสผ่านตรวจฝั่ง client เหมือนเดิม)
   ========================================================= */
function isAdminUnlocked() {
  return sessionStorage.getItem(SS_ADMIN_KEY) === "1";
}

openAdminBtn.addEventListener("click", () => {
  if (isAdminUnlocked()) {
    openAdminPanel();
  } else {
    adminLoginModal.classList.remove("hidden");
    adminPassInput.value = "";
    adminLoginError.textContent = "";
    adminPassInput.focus();
  }
});

adminLoginForm.addEventListener("submit", (e) => {
  e.preventDefault();
  if (adminPassInput.value === ADMIN_PASSCODE) {
    sessionStorage.setItem(SS_ADMIN_KEY, "1");
    adminLoginModal.classList.add("hidden");
    openAdminPanel();
  } else {
    adminLoginError.textContent = "รหัสผ่านแอดมินไม่ถูกต้อง";
  }
});

document.querySelectorAll("[data-close]").forEach((btn) => {
  btn.addEventListener("click", () => {
    el(btn.dataset.close).classList.add("hidden");
  });
});

closeAdminBtn.addEventListener("click", () => {
  adminScreen.classList.add("hidden");
});

function openAdminPanel() {
  adminScreen.classList.remove("hidden");
  renderAdminScreen();
}

/* ---------- ตั้งเวลาโหวต ---------- */
function loadScheduleIntoInputs() {
  const s = liveSettings;
  startTimeInput.value = s.start ? toLocalInputValue(s.start) : "";
  endTimeInput.value = s.end ? toLocalInputValue(s.end) : "";
}
function toLocalInputValue(isoStr) {
  const d = new Date(isoStr);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

saveScheduleBtn.addEventListener("click", async () => {
  const startVal = startTimeInput.value;
  const endVal = endTimeInput.value;
  if (!startVal || !endVal) {
    alert("กรุณาเลือกทั้งเวลาเปิดและเวลาปิด");
    return;
  }
  if (new Date(endVal) <= new Date(startVal)) {
    alert("เวลาปิดโหวตต้องอยู่หลังเวลาเปิดโหวต");
    return;
  }
  saveScheduleBtn.disabled = true;
  try {
    await db.collection("settings").doc("main").set(
      {
        start: new Date(startVal).toISOString(),
        end: new Date(endVal).toISOString(),
      },
      { merge: true }
    );
    alert("บันทึกเวลาการโหวตเรียบร้อยแล้ว");
  } catch (err) {
    console.error(err);
    alert("บันทึกไม่สำเร็จ (" + err.message + ")");
  } finally {
    saveScheduleBtn.disabled = false;
  }
});

/* ---------- เพิ่มรูปภาพ (อัปโหลดไฟล์จริงขึ้น Firebase Storage) ---------- */
imgFileInput.addEventListener("change", () => {
  const file = imgFileInput.files[0];
  if (!file) {
    imgPreview.classList.add("hidden");
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    imgPreview.src = reader.result;
    imgPreview.classList.remove("hidden");
  };
  reader.readAsDataURL(file);
});

addImageForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (addImageBusy) return;
  const title = imgTitleInput.value.trim();
  const file = imgFileInput.files[0];
  if (!title || !file) return;

  const submitBtn = addImageForm.querySelector("button[type=submit]");
  addImageBusy = true;
  submitBtn.disabled = true;
  submitBtn.textContent = "กำลังอัปโหลด…";

  try {
    const id = "img_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7);
    const storagePath = "images/" + id + "_" + file.name;
    const storageRef = storage.ref(storagePath);
    await storageRef.put(file);
    const imageUrl = await storageRef.getDownloadURL();

    await db.collection("images").doc(id).set({
      title,
      imageUrl,
      storagePath,
      votes: 0,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    });

    addImageForm.reset();
    imgPreview.classList.add("hidden");
  } catch (err) {
    console.error(err);
    alert("เพิ่มรูปภาพไม่สำเร็จ (" + err.message + ")");
  } finally {
    addImageBusy = false;
    submitBtn.disabled = false;
    submitBtn.textContent = "เพิ่มรูปภาพ";
  }
});

/* ---------- รายการรูปภาพในแอดมิน ---------- */
function renderAdminImageList() {
  imgCount.textContent = liveImages.length;

  if (!liveImages.length) {
    adminImageList.innerHTML = `<p class="no-items">ยังไม่มีรูปภาพ เพิ่มรูปภาพด้านบนได้เลย</p>`;
    return;
  }
  adminImageList.innerHTML = liveImages
    .map(
      (img) => `
      <div class="admin-image-row" data-id="${img.id}">
        <img src="${img.imageUrl}" alt="">
        <span class="row-title">${escapeHtml(img.title)}</span>
        <span class="row-votes">${img.votes || 0} คะแนน</span>
        <button class="row-delete" data-id="${img.id}">ลบ</button>
      </div>`
    )
    .join("");

  adminImageList.querySelectorAll(".row-delete").forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (!confirm("ยืนยันการลบรูปภาพนี้ออกจากการประกวด?")) return;
      const id = btn.dataset.id;
      const img = liveImages.find((i) => i.id === id);
      btn.disabled = true;
      try {
        await db.collection("images").doc(id).delete();
        if (img && img.storagePath) {
          storage.ref(img.storagePath).delete().catch((err) => {
            console.warn("ลบไฟล์ใน Storage ไม่สำเร็จ (ไม่กระทบข้อมูลหลัก):", err);
          });
        }
      } catch (err) {
        console.error(err);
        alert("ลบไม่สำเร็จ (" + err.message + ")");
        btn.disabled = false;
      }
    });
  });
}

/* ---------- เปิดเผยผลโหวต ---------- */
toggleRevealBtn.addEventListener("click", async () => {
  toggleRevealBtn.disabled = true;
  try {
    await db.collection("settings").doc("main").set(
      { revealed: !liveSettings.revealed },
      { merge: true }
    );
  } catch (err) {
    console.error(err);
    alert("เปลี่ยนสถานะไม่สำเร็จ (" + err.message + ")");
  } finally {
    toggleRevealBtn.disabled = false;
  }
});

function renderAdminScreen() {
  loadScheduleIntoInputs();
  renderAdminImageList();
  revealStatus.textContent = liveSettings.revealed
    ? "ผลโหวต: เปิดเผยแล้ว (สาธารณะเห็นผลได้)"
    : "ผลโหวต: ซ่อนอยู่";
  toggleRevealBtn.textContent = liveSettings.revealed ? "ซ่อนผลโหวตอีกครั้ง" : "เปิดเผยผลโหวต";
  renderResultsInto(resultsBoard, { alwaysShow: true });
}

/* =========================================================
   RENDER ALL
   ========================================================= */
function renderAll() {
  updateStatusUI();
  renderGallery();
  renderPublicResults();
  if (!adminScreen.classList.contains("hidden")) {
    renderAdminScreen();
  }
}

/* =========================================================
   FIRESTORE REALTIME SUBSCRIPTIONS
   ========================================================= */
function subscribeImages() {
  db.collection("images")
    .orderBy("createdAt", "asc")
    .onSnapshot(
      (snap) => {
        liveImages = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        renderAll();
      },
      (err) => console.error("images listener error:", err)
    );
}

function subscribeSettings() {
  db.collection("settings")
    .doc("main")
    .onSnapshot(
      (snap) => {
        liveSettings = snap.exists
          ? { start: null, end: null, revealed: false, ...snap.data() }
          : { start: null, end: null, revealed: false };
        renderAll();
      },
      (err) => console.error("settings listener error:", err)
    );
}

let unsubscribeMyVotes = null;
function subscribeMyVotes() {
  const user = getCurrentUser();
  if (!user) return;
  if (unsubscribeMyVotes) unsubscribeMyVotes();
  unsubscribeMyVotes = db
    .collection("votes")
    .doc(user)
    .onSnapshot(
      (snap) => {
        myVotedIds = snap.exists ? snap.data().votedIds || [] : [];
        renderGallery();
      },
      (err) => console.error("votes listener error:", err)
    );
}

/* =========================================================
   INIT
   ========================================================= */
function init() {
  const user = getCurrentUser();
  if (user) {
    authScreen.classList.add("hidden");
    voteScreen.classList.remove("hidden");
    whoami.textContent = "สวัสดี, " + user;
    whoami.classList.remove("hidden");
    logoutBtn.classList.remove("hidden");
    subscribeMyVotes();
  } else {
    authScreen.classList.remove("hidden");
    voteScreen.classList.add("hidden");
  }

  subscribeImages();
  subscribeSettings();

  // เช็คสถานะทุก 15 วินาที เผื่อเวลาที่ตั้งไว้ผ่านไปขณะเปิดหน้าอยู่ (ไม่ต้องรอ event จาก Firestore)
  setInterval(() => {
    const prev = currentVotingStatus;
    updateStatusUI();
    if (prev !== currentVotingStatus) {
      renderGallery();
    }
  }, 15000);
}

document.addEventListener("DOMContentLoaded", init);
