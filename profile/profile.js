document.addEventListener("DOMContentLoaded", async () => {
    const nameEl = document.getElementById("profile-name");
    const emailEl = document.getElementById("profile-email");

    // Protect profile page
    const user = await checkAuth();
    if (!user) {
        window.location.href = "index.html";
        return;
    }

    // Get name/email from user metadata
    const fullName = user.user_metadata?.full_name || "No name set";
    const email = user.email;

    nameEl.textContent = fullName;
    emailEl.textContent = email;
});

function goBack() {
  window.location.href = "/dashboard.html"; 
}

window.addEventListener("DOMContentLoaded", () => {
  const savedTheme = localStorage.getItem("theme");
  if (savedTheme === "dark") {
    document.body.classList.add("dark-mode");
  }
});
