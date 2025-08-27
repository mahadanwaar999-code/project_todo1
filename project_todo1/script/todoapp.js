 const sidebar = document.getElementById('sidebar');

        let sidebarto = document.getElementById("sidebarToggleBtn");
        let moved = false; // track state

        sidebarto.addEventListener("click", () => {
            if (!moved) {
                sidebarto.style.left = "10px";   // move to left of screen
                moved = true;
                 sidebar.classList.toggle('active');
            } else {
                sidebarto.style.left = "260px";  // move back near sidebar
                moved = false;
                 sidebar.classList.toggle('active');
            }
        });

        