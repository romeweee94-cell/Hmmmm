/* =========================================================
   โหวตรูปภาพ — ระบบทำงานฝั่ง client ทั้งหมด (localStorage)
   หมายเหตุด้านความปลอดภัย:
   - รหัสผ่านผู้ใช้และรหัสแอดมินเก็บ/ตรวจสอบฝั่ง client เท่านั้น
     เหมาะกับงานอีเวนต์/ใช้ภายในกลุ่มเล็ก ๆ ไม่เหมาะกับระบบที่ต้อง
     ป้องกันการโกงระดับสูง (ผู้ใช้ที่เปิด devtools สามารถแก้ไขข้อมูลได้)
   ========================================================= */

const ADMIN_PASSCODE = "PhaiZa080800272870";

const LS_KEYS = {
  users: "vt_users",        // { username: password }
  session: "vt_session",    // "username" ของผู้ที่ล็อกอินอยู่
  images: "vt_images",      // [{id, title, dataUrl, votes}]
  votes: "vt_votes",        // { username: [imageId, ...] }
  settings: "vt_settings",  // { start, end, revealed }
};
const SS_ADMIN_KEY = "vt_admin_ok";

/* ---------- storage helpers ---------- */
function getJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    console.error("อ่านข้อมูลผิดพลาด:", key, e);
    return fallback;
  }
}
function setJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

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

let currentVotingStatus = null; // 'open' | 'closed' | 'scheduled' | 'not-scheduled'

/* =========================================================
   AUTH — ผู้โหวต
   ========================================================= */
function getCurrentUser() {
  return localStorage.getItem(LS_KEYS.session);
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

registerForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const username = el("regUser").value.trim();
  const password = el("regPass").value;
  registerError.textContent = "";

  if (!username || !password) {
    registerError.textContent = "กรุณากรอกข้อมูลให้ครบ";
    return;
  }
  const users = getJSON(LS_KEYS.users, {});
  if (users[username]) {
    registerError.textContent = "มีชื่อผู้ใช้นี้อยู่แล้ว กรุณาใช้ชื่ออื่น";
    return;
  }
  users[username] = password;
  setJSON(LS_KEYS.users, users);
  localStorage.setItem(LS_KEYS.session, username);
  enterVoteScreen();
});

loginForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const username = el("loginUser").value.trim();
  const password = el("loginPass").value;
  loginError.textContent = "";

  const users = getJSON(LS_KEYS.users, {});
  if (!users[username] || users[username] !== password) {
    loginError.textContent = "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง";
    return;
  }
  localStorage.setItem(LS_KEYS.session, username);
  enterVoteScreen();
});

logoutBtn.addEventListener("click", () => {
  localStorage.removeItem(LS_KEYS.session);
  location.reload();
});

function enterVoteScreen() {
  authScreen.classList.add("hidden");
  voteScreen.classList.remove("hidden");
  whoami.textContent = "สวัสดี, " + getCurrentUser();
  whoami.classList.remove("hidden");
  logoutBtn.classList.remove("hidden");
  renderAll();
}

/* =========================================================
   ตารางเวลาการโหวต (เปิด/ปิด)
   ========================================================= */
function getSettings() {
  return getJSON(LS_KEYS.settings, { start: null, end: null, revealed: false });
}
function setSettings(s) {
  setJSON(LS_KEYS.settings, s);
}

function computeVotingStatus() {
  const s = getSettings();
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
  const s = getSettings();
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
function getImages() {
  return getJSON(LS_KEYS.images, []);
}
function setImages(imgs) {
  setJSON(LS_KEYS.images, imgs);
}
function getVotesMap() {
  return getJSON(LS_KEYS.votes, {});
}
function setVotesMap(v) {
  setJSON(LS_KEYS.votes, v);
}

function userHasVotedFor(username, imageId) {
  const votes = getVotesMap();
  return (votes[username] || []).includes(imageId);
}

function castVote(imageId) {
  const user = getCurrentUser();
  if (!user) return;
  if (currentVotingStatus !== "open") return;
  if (userHasVotedFor(user, imageId)) return;

  const votes = getVotesMap();
  votes[user] = votes[user] || [];
  votes[user].push(imageId);
  setVotesMap(votes);

  const images = getImages();
  const img = images.find((i) => i.id === imageId);
  if (img) {
    img.votes = (img.votes || 0) + 1;
    setImages(images);
  }
  renderGallery();
}

function renderGallery() {
  const images = getImages();
  const user = getCurrentUser();

  gallery.innerHTML = "";
  emptyGallery.classList.toggle("hidden", images.length > 0);

  images.forEach((img) => {
    const card = document.createElement("div");
    card.className = "vote-card";

    const already = userHasVotedFor(user, img.id);
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
      <div class="thumb-wrap"><img src="${img.dataUrl}" alt="${escapeHtml(img.title)}"></div>
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
  const images = [...getImages()];
  images.sort((a, b) => (b.votes || 0) - (a.votes || 0));
  const maxVotes = images.length ? images[0].votes || 0 : 0;
  return { images, maxVotes };
}

function renderResultsInto(container, { alwaysShow } = { alwaysShow: false }) {
  const s = getSettings();
  if (!alwaysShow && !s.revealed) {
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
          <img class="result-thumb" src="${img.dataUrl}" alt="">
          <span class="result-title">${escapeHtml(img.title)}${isTop ? ' <span class="crown">👑</span>' : ""}</span>
          <span class="result-votes">${img.votes || 0} คะแนน</span>
        </div>`;
    })
    .join("");
}

function renderPublicResults() {
  const s = getSettings();
  publicResultsSection.classList.toggle("hidden", !s.revealed);
  if (s.revealed) renderResultsInto(publicResults, { alwaysShow: true });
}

/* =========================================================
   แอดมิน — เข้าสู่ระบบ
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
  const s = getSettings();
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

saveScheduleBtn.addEventListener("click", () => {
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
  const s = getSettings();
  s.start = new Date(startVal).toISOString();
  s.end = new Date(endVal).toISOString();
  setSettings(s);
  renderAll();
  alert("บันทึกเวลาการโหวตเรียบร้อยแล้ว");
});

/* ---------- เพิ่มรูปภาพ ---------- */
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

addImageForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const title = imgTitleInput.value.trim();
  const file = imgFileInput.files[0];
  if (!title || !file) return;

  const reader = new FileReader();
  reader.onload = () => {
    const images = getImages();
    images.push({
      id: "img_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7),
      title,
      dataUrl: reader.result,
      votes: 0,
    });
    setImages(images);
    addImageForm.reset();
    imgPreview.classList.add("hidden");
    renderAdminScreen();
    renderAll();
  };
  reader.readAsDataURL(file);
});

/* ---------- รายการรูปภาพในแอดมิน ---------- */
function renderAdminImageList() {
  const images = getImages();
  imgCount.textContent = images.length;

  if (!images.length) {
    adminImageList.innerHTML = `<p class="no-items">ยังไม่มีรูปภาพ เพิ่มรูปภาพด้านบนได้เลย</p>`;
    return;
  }
  adminImageList.innerHTML = images
    .map(
      (img) => `
      <div class="admin-image-row" data-id="${img.id}">
        <img src="${img.dataUrl}" alt="">
        <span class="row-title">${escapeHtml(img.title)}</span>
        <span class="row-votes">${img.votes || 0} คะแนน</span>
        <button class="row-delete" data-id="${img.id}">ลบ</button>
      </div>`
    )
    .join("");

  adminImageList.querySelectorAll(".row-delete").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (!confirm("ยืนยันการลบรูปภาพนี้ออกจากการประกวด?")) return;
      const id = btn.dataset.id;
      setImages(getImages().filter((i) => i.id !== id));
      renderAdminScreen();
      renderAll();
    });
  });
}

/* ---------- เปิดเผยผลโหวต ---------- */
toggleRevealBtn.addEventListener("click", () => {
  const s = getSettings();
  s.revealed = !s.revealed;
  setSettings(s);
  renderAdminScreen();
  renderAll();
});

function renderAdminScreen() {
  loadScheduleIntoInputs();
  renderAdminImageList();
  const s = getSettings();
  revealStatus.textContent = s.revealed
    ? "ผลโหวต: เปิดเผยแล้ว (สาธารณะเห็นผลได้)"
    : "ผลโหวต: ซ่อนอยู่";
  toggleRevealBtn.textContent = s.revealed ? "ซ่อนผลโหวตอีกครั้ง" : "เปิดเผยผลโหวต";
  renderResultsInto(resultsBoard, { alwaysShow: true });
}

/* =========================================================
   RENDER ALL / INIT
   ========================================================= */
function renderAll() {
  updateStatusUI();
  renderGallery();
  renderPublicResults();
}

function init() {
  const user = getCurrentUser();
  if (user) {
    enterVoteScreen();
  } else {
    authScreen.classList.remove("hidden");
    voteScreen.classList.add("hidden");
  }
  updateStatusUI();

  // อัปเดตสถานะทุก 15 วินาที เผื่อเวลาที่ตั้งไว้ผ่านไปขณะเปิดหน้าอยู่
  setInterval(() => {
    const prev = currentVotingStatus;
    updateStatusUI();
    if (prev !== currentVotingStatus) {
      renderGallery();
    }
  }, 15000);
}

document.addEventListener("DOMContentLoaded", init);
