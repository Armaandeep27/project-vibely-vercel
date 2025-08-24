const SUPABASE_URL = "https://kirniwxzyelnvyopvxpe.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtpcm5pd3h6eWVsbnZ5b3B2eHBlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUzMjkyMjMsImV4cCI6MjA3MDkwNTIyM30.-w9uJoUWbBikANblg9DYLuSFEn_JMseoQtimg2kyAKQ";

// Initialize Supabase client
const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===== AUTH FUNCTIONS =====

// Login function
async function loginUser(email, password, rememberMe = false) {
  try {
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (error) throw error;

    if (rememberMe) {
      localStorage.setItem("vibely_remember", "true");
    }

    showMessage("Login successful! Redirecting...", "success");
    setTimeout(() => {
      window.location.href = "/dashboard.html";
    }, 1500);

    return data;
  } catch (error) {
    console.error("Login error:", error.message);
    showMessage(error.message, "error");
    return null;
  }
}

// Signup function
async function signupUser(email, password, fullName = "") {
  try {
    const { data, error } = await supabaseClient.auth.signUp({
      email: email,
      password: password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    if (error) throw error;

    showMessage(
      "Account created! Check your email to verify your account.",
      "success"
    );
    return data;
  } catch (error) {
    console.error("Signup error:", error.message);
    showMessage(error.message, "error");
    return null;
  }
}

// Logout function
async function logoutUser() {
  try {
    const { error } = await supabaseClient.auth.signOut();
    if (error) throw error;

    localStorage.removeItem("vibely_remember");
    showMessage("Logged out successfully", "success");
    window.location.href = "index.html";
  } catch (error) {
    console.error("Logout error:", error.message);
    showMessage(error.message, "error");
  }
}

// Check if user is authenticated
async function checkAuth() {
  try {
    const {
      data: { user },
      error,
    } = await supabaseClient.auth.getUser();
    if (error) throw error;
    return user;
  } catch (error) {
    console.error("Auth check error:", error.message);
    return null;
  }
}

// Password reset
async function resetPassword(email) {
  try {
    const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/update-password.html`,
    });
    if (error) throw error;
    showMessage("Password reset email sent! Check your inbox.", "success");
    return true;
  } catch (error) {
    console.error("Password reset error:", error.message);
    showMessage(error.message, "error");
    return false;
  }
}

// ===== UPDATE PASSWORD (TOAST VERSION) =====
async function updatePassword(event) {
  event.preventDefault();

  const newPassword = document.getElementById("new-password").value;
  const confirmPassword = document.getElementById("confirm-password").value;

  if (newPassword !== confirmPassword) {
    showMessage("Passwords do not match!", "error");
    return;
  }

  const { error } = await supabaseClient.auth.updateUser({
    password: newPassword,
  });

  if (error) {
    showMessage(error.message, "error");
  } else {
    showMessage("Password updated successfully! Redirecting...", "success");
    setTimeout(() => {
      window.location.href = "index.html";
    }, 2000);
  }
}

// ===== UTILITY FUNCTIONS =====
function showMessage(message, type = "info") {
  const existingMsg = document.querySelector(".auth-message");
  if (existingMsg) existingMsg.remove();

  const messageEl = document.createElement("div");
  messageEl.className = `auth-message ${type}`;
  messageEl.textContent = message;
  messageEl.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 8px;
        color: white;
        font-weight: bold;
        z-index: 9999;
        max-width: 300px;
        ${type === "success" ? "background-color: #22c55e;" : ""}
        ${type === "error" ? "background-color: #ef4444;" : ""}
        ${type === "info" ? "background-color: #3b82f6;" : ""}
    `;
  document.body.appendChild(messageEl);
  setTimeout(() => {
    if (messageEl.parentNode) messageEl.remove();
  }, 4000);
}

// Protect pages that require authentication
async function protectPage() {
  const user = await checkAuth();
  if (!user) {
    window.location.href = "index.html";
    return false;
  }
  return true;
}

// ===== EVENT LISTENERS =====
document.addEventListener("DOMContentLoaded", function () {
  // LOGIN PAGE
  if (
    window.location.pathname.includes("index.html") ||
    window.location.pathname.endsWith("/")
  ) {
    const loginForm = document.querySelector("form");
    if (loginForm) {
      loginForm.addEventListener("submit", async function (e) {
        e.preventDefault();
        const email = loginForm.querySelector('input[name="email"]').value;
        const password = loginForm.querySelector(
          'input[name="password"]'
        ).value;
        const rememberMe =
          loginForm.querySelector('input[name="remember"]')?.checked || false;
        if (!email || !password) {
          showMessage("Please fill in all fields", "error");
          return;
        }
        const submitBtn = loginForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = "Logging in...";
        submitBtn.disabled = true;
        await loginUser(email, password, rememberMe);
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
      });
    }
  }

  // SIGNUP PAGE
  if (window.location.pathname.includes("signup.html")) {
    const signupForm = document.querySelector("form");
    if (signupForm) {
      signupForm.addEventListener("submit", async function (e) {
        e.preventDefault();
        const fullName =
          signupForm.querySelector('input[name="name"]')?.value || "";
        const email = signupForm.querySelector('input[name="email"]').value;
        const password = signupForm.querySelector(
          'input[name="password"]'
        ).value;
        const confirmPassword =
          signupForm.querySelector('input[name="confirm_password"]')?.value ||
          "";
        if (!email || !password || !fullName) {
          showMessage("Please fill in all fields", "error");
          return;
        }
        if (password !== confirmPassword) {
          showMessage("Passwords do not match", "error");
          return;
        }
        if (password.length < 6) {
          showMessage("Password must be at least 6 characters", "error");
          return;
        }
        const submitBtn = signupForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = "Creating Account...";
        submitBtn.disabled = true;
        await signupUser(email, password, fullName);
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
      });
    }
  }

  // FORGOT PASSWORD
  if (window.location.pathname.includes("forgot-password.html")) {
    const forgotPasswordForm = document.querySelector("form");
    if (forgotPasswordForm) {
      forgotPasswordForm.addEventListener("submit", async function (e) {
        e.preventDefault();
        const email = forgotPasswordForm.querySelector(
          'input[name="email"]'
        ).value;
        if (!email) {
          showMessage("Please enter your email address", "error");
          return;
        }
        await resetPassword(email);
      });
    }
  }
});

// ===== SOCIAL LOGIN =====
async function loginWithGoogle() {
  try {
    const { error } = await supabaseClient.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/dashboard.html`,
      },
    });
    if (error) throw error;
  } catch (error) {
    console.error("Google login error:", error.message);
    showMessage("Google login failed", "error");
  }
}

async function loginWithFacebook() {
  try {
    const { error } = await supabaseClient.auth.signInWithOAuth({
      provider: "facebook",
      options: {
        redirectTo: `${window.location.origin}/dashboard.html`,
      },
    });
    if (error) throw error;
  } catch (error) {
    console.error("Facebook login error:", error.message);
    showMessage("Facebook login failed", "error");
  }
}
