const loginForm = document.getElementById("loginForm");

loginForm.addEventListener("submit", async function(event) {
    event.preventDefault();

    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    try {
        const response = await fetch("/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                username: username,
                password: password
            })
        });

        const data = await response.json();

        if (data.success) {
            alert("Login successful!");
            window.location.href = "/dashboard.html";
        } else {
            alert(data.message);
        }

    } catch (error) {
        console.error(error);
        alert("Server connection failed.");
    }
});