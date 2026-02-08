// Login Logic using Realtime DB 'admins' node
const loginForm = document.getElementById('loginForm');
const errorMsg = document.getElementById('errorMsg');

loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    errorMsg.innerText = "Checking credentials...";

    // We check the 'admins' node in Realtime DB
    // Structure: admins -> { pushId: { email: "...", password: "..." } }
    db.ref('admins').orderByChild('email').equalTo(email).once('value')
        .then((snapshot) => {
            if (snapshot.exists()) {
                let valid = false;
                snapshot.forEach((child) => {
                    const data = child.val();
                    if (data.password === password) {
                        valid = true;
                        // Store session
                        sessionStorage.setItem('adminUser', JSON.stringify(data));
                        window.location.href = "dashboard.html";
                    }
                });
                
                if (!valid) errorMsg.innerText = "Invalid password.";
            } else {
                // Auto-create first admin if none exists (Dev helper)
                // Remove this block in production
                /*
                if (email === 'admin@budhale.com' && password === 'admin123') {
                    db.ref('admins').push({ email, password, role: 'super' });
                    window.location.href = "dashboard.html";
                } else {
                    errorMsg.innerText = "Admin not found.";
                }
                */
                errorMsg.innerText = "Admin not found.";
            }
        })
        .catch((error) => {
            errorMsg.innerText = "Error: " + error.message;
        });
});
