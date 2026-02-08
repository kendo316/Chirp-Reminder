// ─── Signup Form ──────────────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", function () {
  var form = document.getElementById("signupForm");
  var messageEl = document.getElementById("formMessage");
  var submitBtn = document.getElementById("submitBtn");

  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      handleSignup();
    });
  }

  async function handleSignup() {
    var email = document.getElementById("email").value.trim();
    var zipCode = document.getElementById("zipCode").value.trim();

    // Client-side validation
    if (!email || !zipCode) {
      showMessage("Please fill in all fields.", "error");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showMessage("Please enter a valid email address.", "error");
      return;
    }

    if (!/^\d{5}$/.test(zipCode)) {
      showMessage("Please enter a valid 5-digit zip code.", "error");
      return;
    }

    // Disable form during submission
    submitBtn.disabled = true;
    submitBtn.textContent = "Signing up...";
    hideMessage();

    try {
      var response = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email, zipCode: zipCode }),
      });

      var data = await response.json();

      if (response.ok) {
        showMessage(data.message, "success");
        form.reset();
      } else {
        showMessage(data.error || "Something went wrong. Please try again.", "error");
      }
    } catch (err) {
      showMessage("Network error. Please check your connection and try again.", "error");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Sign Up for Free";
    }
  }

  function showMessage(text, type) {
    messageEl.textContent = text;
    messageEl.className = "form-message " + type;
  }

  function hideMessage() {
    messageEl.className = "form-message";
    messageEl.textContent = "";
  }

  // ─── FAQ Accordion ──────────────────────────────────────────────────────────

  var faqItems = document.querySelectorAll(".faq-question");
  faqItems.forEach(function (question) {
    question.addEventListener("click", function () {
      var item = this.parentElement;
      // Close all others
      document.querySelectorAll(".faq-item").forEach(function (el) {
        if (el !== item) el.classList.remove("open");
      });
      item.classList.toggle("open");
    });
  });
});
