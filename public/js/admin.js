// ─── Firebase Config ─────────────────────────────────────────────────────────
// Replace with your actual Firebase config
var firebaseConfig = {
  apiKey: "AIzaSyD61t9dJWJGD1YTBTuIKH94-Td6RWX9SmA",
  authDomain: "chirp-reminder.firebaseapp.com",
  projectId: "chirp-reminder",
  storageBucket: "chirp-reminder.firebasestorage.app",
  messagingSenderId: "682234919069",
  appId: "1:682234919069:web:1657171d901664fb7b3c74",
};

firebase.initializeApp(firebaseConfig);
var auth = firebase.auth();

var authToken = null;

// ─── DOM References ──────────────────────────────────────────────────────────

var loginSection = document.getElementById("loginSection");
var adminSection = document.getElementById("adminSection");
var logoutBtn = document.getElementById("logoutBtn");
var loginForm = document.getElementById("loginForm");
var loginMessage = document.getElementById("loginMessage");
var adminUser = document.getElementById("adminUser");

// ─── Auth State ──────────────────────────────────────────────────────────────

auth.onAuthStateChanged(async function (user) {
  if (user) {
    authToken = await user.getIdToken();
    loginSection.style.display = "none";
    adminSection.style.display = "block";
    logoutBtn.style.display = "inline";
    adminUser.textContent = user.email;
    loadAllData();
  } else {
    authToken = null;
    loginSection.style.display = "block";
    adminSection.style.display = "none";
    logoutBtn.style.display = "none";
  }
});

loginForm.addEventListener("submit", async function (e) {
  e.preventDefault();
  var email = document.getElementById("adminEmail").value;
  var password = document.getElementById("adminPassword").value;

  try {
    await auth.signInWithEmailAndPassword(email, password);
  } catch (err) {
    loginMessage.textContent = err.message;
    loginMessage.className = "form-message error";
  }
});

logoutBtn.addEventListener("click", function (e) {
  e.preventDefault();
  auth.signOut();
});

// ─── API Helpers ─────────────────────────────────────────────────────────────

async function apiGet(path) {
  var res = await fetch(path, {
    headers: { Authorization: "Bearer " + authToken },
  });
  if (!res.ok) throw new Error("API error: " + res.status);
  return res.json();
}

async function apiPost(path, body) {
  var res = await fetch(path, {
    method: "POST",
    headers: {
      Authorization: "Bearer " + authToken,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("API error: " + res.status);
  return res.json();
}

async function apiDelete(path) {
  var res = await fetch(path, {
    method: "DELETE",
    headers: { Authorization: "Bearer " + authToken },
  });
  if (!res.ok) throw new Error("API error: " + res.status);
  return res.json();
}

// ─── Tab Navigation ──────────────────────────────────────────────────────────

document.querySelectorAll(".admin-tab").forEach(function (tab) {
  tab.addEventListener("click", function () {
    document.querySelectorAll(".admin-tab").forEach(function (t) {
      t.classList.remove("active");
    });
    document.querySelectorAll(".admin-panel").forEach(function (p) {
      p.classList.remove("active");
    });
    tab.classList.add("active");
    document.getElementById("panel-" + tab.dataset.panel).classList.add("active");
  });
});

// ─── Load All Data ───────────────────────────────────────────────────────────

async function loadAllData() {
  try {
    await Promise.all([loadSubscribers(), loadTips(), loadLogs()]);
  } catch (err) {
    showToast("Failed to load data: " + err.message, "error");
  }
}

// ─── Subscribers ─────────────────────────────────────────────────────────────

var subscribers = [];

async function loadSubscribers() {
  subscribers = await apiGet("/api/admin/subscribers");
  renderSubscribers();
  updateStats();
}

function renderSubscribers() {
  var tbody = document.getElementById("subscribersTableBody");

  if (subscribers.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="5" style="text-align:center;color:var(--text-light);">No subscribers yet.</td></tr>';
    return;
  }

  tbody.innerHTML = subscribers
    .map(function (user) {
      return (
        "<tr>" +
        "<td>" + escapeHtml(user.email) + "</td>" +
        "<td>" + escapeHtml(user.zipCode) + "</td>" +
        "<td>" + escapeHtml(user.region) + "</td>" +
        '<td><span class="badge ' + (user.active ? "badge-active" : "badge-inactive") + '">' +
        (user.active ? "Active" : "Inactive") +
        "</span></td>" +
        "<td>" +
        '<button class="btn btn-sm btn-secondary" onclick="toggleUser(\'' + user.id + "')\">" +
        (user.active ? "Pause" : "Resume") +
        "</button> " +
        '<button class="btn btn-sm btn-outline" onclick="testSend(\'' + user.id + "')\">" +
        "Test Send" +
        "</button>" +
        "</td>" +
        "</tr>"
      );
    })
    .join("");
}

async function toggleUser(id) {
  try {
    await apiPost("/api/admin/subscribers/" + id + "/toggle");
    showToast("Subscription status updated.", "success");
    await loadSubscribers();
  } catch (err) {
    showToast("Failed to toggle: " + err.message, "error");
  }
}

async function testSend(userId) {
  try {
    showToast("Sending test email...", "success");
    var result = await apiPost("/api/admin/test-send/" + userId);
    showToast("Test email sent to " + (result.email || "user"), "success");
    await loadLogs();
  } catch (err) {
    showToast("Test send failed: " + err.message, "error");
  }
}

// ─── Seasonal Tips ───────────────────────────────────────────────────────────

var tips = [];

async function loadTips() {
  tips = await apiGet("/api/admin/tips");
  renderTips();
}

function renderTips() {
  var tbody = document.getElementById("tipsTableBody");

  if (tips.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="5" style="text-align:center;color:var(--text-light);">No tips yet. Add one above.</td></tr>';
    return;
  }

  tbody.innerHTML = tips
    .map(function (tip) {
      return (
        "<tr>" +
        "<td>" + tip.weekOfYear + "</td>" +
        "<td>" + escapeHtml(tip.climateZone) + "</td>" +
        "<td>" + escapeHtml(tip.title) + "</td>" +
        "<td>" + escapeHtml(tip.category) + "</td>" +
        "<td>" +
        '<button class="btn btn-sm btn-secondary" onclick="editTip(\'' + tip.id + "')\">" +
        "Edit" +
        "</button> " +
        '<button class="btn btn-sm btn-danger" onclick="deleteTip(\'' + tip.id + "')\">" +
        "Delete" +
        "</button>" +
        "</td>" +
        "</tr>"
      );
    })
    .join("");
}

function editTip(id) {
  var tip = tips.find(function (t) { return t.id === id; });
  if (!tip) return;

  document.getElementById("tipId").value = tip.id;
  document.getElementById("tipWeek").value = tip.weekOfYear;
  document.getElementById("tipZone").value = tip.climateZone;
  document.getElementById("tipTitle").value = tip.title;
  document.getElementById("tipContent").value = tip.content;
  document.getElementById("tipCategory").value = tip.category;
}

async function deleteTip(id) {
  if (!confirm("Delete this tip?")) return;
  try {
    await apiDelete("/api/admin/tips/" + id);
    showToast("Tip deleted.", "success");
    await loadTips();
  } catch (err) {
    showToast("Failed to delete: " + err.message, "error");
  }
}

document.getElementById("saveTipBtn").addEventListener("click", async function () {
  var data = {
    id: document.getElementById("tipId").value || undefined,
    weekOfYear: parseInt(document.getElementById("tipWeek").value, 10),
    climateZone: document.getElementById("tipZone").value.trim(),
    title: document.getElementById("tipTitle").value.trim(),
    content: document.getElementById("tipContent").value.trim(),
    category: document.getElementById("tipCategory").value,
  };

  if (!data.weekOfYear || !data.title || !data.content) {
    showToast("Please fill in all required fields.", "error");
    return;
  }

  try {
    await apiPost("/api/admin/tips", data);
    showToast("Tip saved.", "success");
    clearTipForm();
    await loadTips();
  } catch (err) {
    showToast("Failed to save: " + err.message, "error");
  }
});

document.getElementById("clearTipBtn").addEventListener("click", clearTipForm);

function clearTipForm() {
  document.getElementById("tipId").value = "";
  document.getElementById("tipWeek").value = "";
  document.getElementById("tipZone").value = "6a";
  document.getElementById("tipTitle").value = "";
  document.getElementById("tipContent").value = "";
  document.getElementById("tipCategory").value = "feeding";
}

// ─── Email Logs ──────────────────────────────────────────────────────────────

var logs = [];

async function loadLogs() {
  logs = await apiGet("/api/admin/logs");
  renderLogs();
  updateStats();
}

function renderLogs() {
  var tbody = document.getElementById("logsTableBody");

  if (logs.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="5" style="text-align:center;color:var(--text-light);">No emails sent yet.</td></tr>';
    return;
  }

  tbody.innerHTML = logs
    .map(function (log) {
      var date = log.sentAt
        ? new Date(log.sentAt._seconds * 1000).toLocaleString()
        : "Unknown";
      return (
        "<tr>" +
        "<td>" + date + "</td>" +
        "<td>" + escapeHtml(log.email) + "</td>" +
        "<td>" + escapeHtml(log.region || "-") + "</td>" +
        '<td><span class="badge ' +
        (log.status === "success" ? "badge-success" : "badge-failed") +
        '">' +
        escapeHtml(log.status) +
        "</span></td>" +
        "<td>" + escapeHtml(log.error || log.resendId || "-") + "</td>" +
        "</tr>"
      );
    })
    .join("");
}

// ─── Stats ───────────────────────────────────────────────────────────────────

function updateStats() {
  var total = subscribers.length;
  var active = subscribers.filter(function (u) { return u.active; }).length;
  var sent = logs.filter(function (l) { return l.status === "success"; }).length;
  var failed = logs.filter(function (l) { return l.status === "failed"; }).length;

  document.getElementById("statTotal").textContent = total;
  document.getElementById("statActive").textContent = active;
  document.getElementById("statSent").textContent = sent;
  document.getElementById("statFailed").textContent = failed;
}

// ─── Toast ───────────────────────────────────────────────────────────────────

function showToast(message, type) {
  var toast = document.getElementById("toast");
  toast.textContent = message;
  toast.className = "toast " + type + " show";
  setTimeout(function () {
    toast.className = "toast";
  }, 3500);
}

// ─── Utility ─────────────────────────────────────────────────────────────────

function escapeHtml(str) {
  if (!str) return "";
  var div = document.createElement("div");
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}
