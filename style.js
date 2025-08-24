function login() {
  let email = document.getElementById("email").value;
  let password = document.getElementById("password").value;

  fetch("backend/login.php", {
    method: "POST",
    body: new URLSearchParams({ email, password }),
  })
    .then((res) => res.text())
    .then((data) => {
      if (data === "success") {
        window.location.href = "dashboard.html";
      } else {
        alert(data);
      }
    });
}

function signup() {
  let name = document.getElementById("name").value;
  let email = document.getElementById("email").value;
  let password = document.getElementById("password").value;

  fetch("backend/signup.php", {
    method: "POST",
    body: new URLSearchParams({ name, email, password }),
  })
    .then((res) => res.text())
    .then((data) => {
      alert(data);
      if (data === "Account created!") {
        window.location.href = "index.html";
      }
    });
}
