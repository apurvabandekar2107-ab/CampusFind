document.addEventListener("DOMContentLoaded", async () => {

    const accountIcon = document.querySelector(".account-icon");
    const accountMenu = document.querySelector("#accountMenu");
    const logoutBtn = document.querySelector("#logoutBtn");

    const loginLink = document.querySelector('a[href="login.html"]');
    const registerLink = document.querySelector('a[href="register.html"]');

    try {

        const response = await fetch("/api/account");

        if (response.ok) {

            // User is logged in
            const user = await response.json();

            if (loginLink) {
                loginLink.style.display = "none";
            }

            if (registerLink) {
                registerLink.style.display = "none";
            }

            if (accountIcon) {

                accountIcon.style.display = "inline-flex";

                accountIcon.title = user.name + "'s Account";

                // Open / close account menu
                accountIcon.addEventListener("click", (event) => {

                    event.stopPropagation();

                    accountMenu.classList.toggle("show");

                });

            }

        } else {

            // User is not logged in
            if (accountIcon) {
                accountIcon.style.display = "none";
            }

        }

    } catch (error) {

        console.log("Account check failed:", error);

        if (accountIcon) {
            accountIcon.style.display = "none";
        }

    }


    // Close menu when clicking elsewhere
    document.addEventListener("click", () => {

        if (accountMenu) {
            accountMenu.classList.remove("show");
        }

    });


    // Logout
    if (logoutBtn) {

        logoutBtn.addEventListener("click", async () => {

            try {

                const response = await fetch("/logout");

                if (response.ok) {

                    window.location.href = "login.html";

                } else {

                    alert("Logout failed");

                }

            } catch (error) {

                console.error("Logout error:", error);

                alert("Logout failed");

            }

        });

    }

});