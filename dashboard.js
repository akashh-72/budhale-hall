// --- CONFIG ---
const IMGBB_API_KEY = "b554bb2934a02cbde6db02045cfbc3f3";

// Ensure DOM is fully loaded before attaching events
document.addEventListener('DOMContentLoaded', () => {
    
    // --- AUTH CHECK ---
    const user = JSON.parse(sessionStorage.getItem('adminUser'));
    if (!user) {
        window.location.href = "index.html";
        return;
    }

    // --- UI HELPERS ---
    window.toggleSidebar = function() {
        const sidebar = document.getElementById('sidebar');
        if(sidebar) sidebar.classList.toggle('hidden');
    };

    window.showSection = function(id) {
        // Hide all sections
        document.querySelectorAll('.section').forEach(el => el.classList.add('hidden'));
        // Show selected
        const selected = document.getElementById(id);
        if(selected) selected.classList.remove('hidden');
        
        // Update Active Nav State
        document.querySelectorAll('.nav-link').forEach(el => el.classList.remove('active'));
        const activeLink = document.getElementById('nav-' + id);
        if(activeLink) activeLink.classList.add('active');

        // Update Header Title
        const titles = {
            'dashboard': 'Dashboard Overview',
            'halls': 'Venue Management',
            'bookings': 'Booking Requests',
            'gallery': 'Media Gallery',
            'users': 'Customer Database'
        };
        const titleEl = document.getElementById('pageTitle');
        if(titleEl) titleEl.innerText = titles[id] || 'Dashboard';
    };

    window.logout = function() {
        sessionStorage.removeItem('adminUser');
        window.location.href = "index.html";
    };

    window.openModal = function(id) { 
        const el = document.getElementById(id);
        if(el) el.classList.remove('hidden'); 
    };
    
    window.closeModal = function(id) { 
        const el = document.getElementById(id);
        if(el) el.classList.add('hidden'); 
    };

    // --- STATS LOGIC ---
    window.updateStats = function(bookings, users, halls) {
        // Calculate Revenue
        const revenue = bookings.filter(b => b.status === 'Confirmed').length * 50000;
        
        const revEl = document.getElementById("stat-revenue");
        if(revEl) revEl.innerText = revenue.toLocaleString();
        
        const bookEl = document.getElementById("stat-bookings");
        if(bookEl) bookEl.innerText = bookings.length;
        
        const hallEl = document.getElementById("stat-halls");
        if(hallEl) hallEl.innerText = halls.length;
        
        const userEl = document.getElementById("stat-users");
        if(userEl) userEl.innerText = users.length;
    };

    // --- HALLS MANAGER ---
    const hallsGrid = document.getElementById('hallsGrid');
    
    // Open Modal (Add Mode)
    window.showAddHallModal = function() {
        const title = document.getElementById('modal-title-hall');
        if(title) title.innerText = "Add New Venue";
        
        const hallId = document.getElementById('hallId');
        if(hallId) hallId.value = ""; // Clear ID
        
        const form = document.getElementById('addHallForm');
        if(form) form.reset();
        
        const previewCont = document.getElementById('previewContainer');
        if(previewCont) {
            previewCont.innerHTML = "";
            previewCont.classList.add('hidden');
        }
        
        document.getElementById('hallImageUrls').value = "[]"; 
        
        const btn = document.getElementById('btnSubmitHall');
        if(btn) btn.innerText = "Publish Venue";
        
        openModal('hallModal');
    };

    // Open Modal (Edit Mode)
    window.editHall = function(id) {
        db.ref('halls/' + id).once('value').then(snap => {
            const h = snap.val();
            if(!h) return;

            const title = document.getElementById('modal-title-hall');
            if(title) title.innerText = "Edit Venue";
            
            document.getElementById('hallId').value = id; // Set ID
            
            document.getElementById('hallName').value = h.name;
            document.getElementById('hallCapacity').value = h.capacity;
            document.getElementById('hallPrice').value = h.price;
            document.getElementById('hallSize').value = h.size || "";
            document.getElementById('hallParking').value = h.parking || "";
            document.getElementById('hallAmenities').value = h.amenities || "";
            document.getElementById('hallDesc').value = h.description || "";
            
            // Handle Images (Legacy support for single imageUrl, new array imageUrls)
            let images = [];
            if(h.imageUrls && Array.isArray(h.imageUrls)) {
                images = h.imageUrls;
            } else if (h.imageUrl) {
                images = [h.imageUrl];
            }
            
            document.getElementById('hallImageUrls').value = JSON.stringify(images);
            renderImagePreviews(images);

            document.getElementById('btnSubmitHall').innerText = "Update Venue";
            openModal('hallModal');
        });
    };

    // Helper to render image grid
    function renderImagePreviews(images) {
        const container = document.getElementById('previewContainer');
        if (!container) return;
        container.innerHTML = "";
        
        if(images.length > 0) {
            container.classList.remove('hidden');
            images.forEach((url, index) => {
                const div = document.createElement('div');
                div.className = "relative group aspect-square rounded-lg overflow-hidden border border-slate-200";
                div.innerHTML = `
                    <img src="${url}" class="w-full h-full object-cover">
                    <button type="button" onclick="removeImageAtIndex(${index})" class="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition shadow-sm cursor-pointer">
                        <i class="fas fa-times"></i>
                    </button>
                `;
                container.appendChild(div);
            });
        } else {
            container.classList.add('hidden');
        }
    }

    // Remove specific image
    window.removeImageAtIndex = function(index) {
        let images = JSON.parse(document.getElementById('hallImageUrls').value || "[]");
        images.splice(index, 1);
        document.getElementById('hallImageUrls').value = JSON.stringify(images);
        renderImagePreviews(images);
    };

    // ImgBB Upload (Multiple)
    const hallUpload = document.getElementById('hallImageUpload');
    if(hallUpload) {
        hallUpload.addEventListener('change', async (e) => {
            const files = Array.from(e.target.files);
            if(files.length === 0) return;
            
            const status = document.getElementById('uploadStatus');
            const submitBtn = document.getElementById('btnSubmitHall');
            
            if(status) status.innerText = `Uploading ${files.length} images...`;
            if(submitBtn) submitBtn.disabled = true;

            let currentImages = JSON.parse(document.getElementById('hallImageUrls').value || "[]");

            try {
                for (const file of files) {
                    const formData = new FormData();
                    formData.append('image', file);
                    const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { method: 'POST', body: formData });
                    const data = await res.json();
                    
                    if(data.success) {
                        currentImages.push(data.data.url);
                    }
                }
                
                document.getElementById('hallImageUrls').value = JSON.stringify(currentImages);
                renderImagePreviews(currentImages);
                if(status) status.innerText = "Upload Complete";
                
            } catch(err) {
                alert('Upload Failed for some images');
                if(status) status.innerText = "Failed";
            } finally {
                if(submitBtn) submitBtn.disabled = false;
                // Clear input so same file can be selected again if needed
                hallUpload.value = ""; 
            }
        });
    }

    const hallForm = document.getElementById('addHallForm');
    if(hallForm) {
        hallForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const id = document.getElementById('hallId').value;
            const images = JSON.parse(document.getElementById('hallImageUrls').value || "[]");
            
            const hallData = {
                name: document.getElementById('hallName').value,
                capacity: document.getElementById('hallCapacity').value,
                price: document.getElementById('hallPrice').value,
                size: document.getElementById('hallSize').value,
                parking: document.getElementById('hallParking').value,
                amenities: document.getElementById('hallAmenities').value,
                description: document.getElementById('hallDesc').value,
                imageUrls: images,
                imageUrl: images.length > 0 ? images[0] : "https://via.placeholder.com/400", // Backwards compatibility cover
                updatedAt: Date.now()
            };

            if(id) {
                // Update Existing
                db.ref('halls/' + id).update(hallData).then(() => {
                    closeModal('hallModal');
                    alert('Venue Updated! ✅');
                });
            } else {
                // Create New
                hallData.createdAt = Date.now();
                db.ref('halls').push(hallData).then(() => {
                    closeModal('hallModal');
                    alert('Venue Published! 🚀');
                });
            }
        });
    }

    // Load Halls
    db.ref('halls').on('value', snap => {
        if(!hallsGrid) return;
        hallsGrid.innerHTML = "";
        const halls = [];
        snap.forEach(child => {
            const h = child.val();
            h.id = child.key;
            halls.push(h);
            
            hallsGrid.innerHTML += `
            <div class="group bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-xl transition-all duration-300 relative">
                <div class="relative h-56 overflow-hidden">
                    <img src="${h.imageUrl}" class="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700" loading="lazy">
                    <div class="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent opacity-60 group-hover:opacity-80 transition-opacity"></div>
                    
                    <div class="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-[-10px] group-hover:translate-y-0 z-10">
                        <button onclick="editHall('${h.id}')" class="w-9 h-9 flex items-center justify-center bg-white/90 backdrop-blur text-blue-600 rounded-full hover:bg-blue-600 hover:text-white shadow-lg transition-colors cursor-pointer" title="Edit Venue">
                            <i class="fas fa-pen text-xs"></i>
                        </button>
                        <button onclick="deleteHall('${h.id}')" class="w-9 h-9 flex items-center justify-center bg-white/90 backdrop-blur text-red-500 rounded-full hover:bg-red-500 hover:text-white shadow-lg transition-colors cursor-pointer" title="Delete Venue">
                            <i class="fas fa-trash text-xs"></i>
                        </button>
                    </div>

                    <div class="absolute bottom-4 left-4 text-white">
                        <h3 class="text-lg font-bold shadow-black drop-shadow-md leading-tight">${h.name}</h3>
                        <div class="flex items-center gap-3 mt-1 text-xs font-medium text-slate-200">
                            <span><i class="fas fa-users mr-1"></i> ${h.capacity}</span>
                            <span>•</span>
                            <span>₹${parseInt(h.price).toLocaleString()}</span>
                        </div>
                    </div>
                </div>
                
                <div class="p-5">
                    <p class="text-sm text-slate-500 line-clamp-2 h-10 mb-4">${h.description || 'No description available for this venue.'}</p>
                    <button onclick="editHall('${h.id}')" class="w-full py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs uppercase tracking-wide hover:bg-slate-50 hover:text-blue-600 hover:border-blue-200 transition-colors cursor-pointer">
                        Manage Details
                    </button>
                </div>
            </div>
            `;
        });
        
        // Load bookings after halls (for stats)
        loadBookings(halls);
    });

    window.deleteHall = function(id) { 
        if(confirm('Are you sure you want to delete this venue?')) db.ref('halls/'+id).remove(); 
    };

    // --- BOOKINGS MANAGER ---
    const bookingsList = document.getElementById('allBookingsList');
    const recentList = document.getElementById('recentBookingsList');

    function loadBookings(halls) {
        db.ref('bookings').on('value', snap => {
            const bookings = [];
            snap.forEach(c => {
                const val = c.val();
                // Fallback for missing fields to prevent JS errors
                bookings.push({
                    id: c.key,
                    userName: val.userName || val.customerName || 'Guest',
                    phone: val.phone || val.customerPhone || '-',
                    hallName: val.hallName || 'Unknown Venue',
                    date: val.date || '-',
                    status: val.status || 'Pending',
                    guestCount: val.guestCount || 0,
                    createdAt: val.createdAt || 0
                });
            });
            
            bookings.sort((a,b) => (b.createdAt || 0) - (a.createdAt || 0));
            
            // Update Badge
            const pendingCount = bookings.filter(b => b.status === 'Pending').length;
            const badge = document.getElementById('badge-bookings');
            const banner = document.getElementById('stat-pending-banner');
            
            if(badge) {
                if(pendingCount > 0) {
                    badge.innerText = pendingCount + ' NEW';
                    badge.classList.remove('hidden');
                } else {
                    badge.classList.add('hidden');
                }
            }
            
            if(banner) {
                banner.innerText = pendingCount > 0 ? `You have ${pendingCount} pending bookings to review.` : "You are all caught up!";
            }

            renderBookings(bookings);
            
            // Update Stats (Now we have halls and bookings)
            db.ref('users').once('value').then(uSnap => {
                const u = []; uSnap.forEach(c => u.push(c.val()));
                updateStats(bookings, u, halls);
            });
        });
    }

    function renderBookings(list) {
        if(!bookingsList || !recentList) return;

        const getStatusBadge = (s) => {
            const map = {
                'Confirmed': 'bg-emerald-100 text-emerald-700 border-emerald-200',
                'Pending': 'bg-amber-100 text-amber-700 border-amber-200',
                'Cancelled': 'bg-red-100 text-red-700 border-red-200'
            };
            const cls = map[s] || 'bg-slate-100 text-slate-600';
            return `<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${cls} uppercase tracking-wide">${s || 'Pending'}</span>`;
        };

        const row = (b, full) => `
            <tr class="hover:bg-slate-50/80 transition-colors group border-b border-slate-50 last:border-0">
                <td class="px-6 py-4">
                    <div class="flex items-center">
                        <div class="h-9 w-9 rounded-full bg-gradient-to-br from-blue-100 to-blue-50 flex items-center justify-center text-blue-600 font-bold text-xs mr-3 border border-blue-100">
                            ${b.userName ? b.userName.charAt(0) : 'G'}
                        </div>
                        <div>
                            <div class="font-bold text-slate-800 text-sm">${b.userName || 'Guest'}</div>
                            <div class="text-[10px] font-medium text-slate-400">#${b.id.substring(1,6).toUpperCase()}</div>
                        </div>
                    </div>
                </td>
                ${full ? `<td class="px-6 py-4 text-slate-500 text-sm font-medium">${b.phone || '-'}</td>` : ''}
                <td class="px-6 py-4 text-slate-600 text-sm font-medium">${b.hallName}</td>
                <td class="px-6 py-4 text-slate-500 text-sm">${b.date}</td>
                ${full ? `<td class="px-6 py-4"><span class="${b.status}">` + getStatusBadge(b.status) + `</span></td>` : `<td class="px-6 py-4">` + getStatusBadge(b.status) + `</td>`}
                <td class="px-6 py-4 text-right">
                     <button onclick="viewBookingDetails('${b.id}')" class="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 hover:border-blue-300 hover:text-blue-600 transition-all text-[10px] font-bold uppercase tracking-wide shadow-sm cursor-pointer">
                        View
                    </button>
                </td>
            </tr>
        `;

        recentList.innerHTML = list.slice(0, 5).map(b => row(b, false)).join('');
        bookingsList.innerHTML = list.map(b => row(b, true)).join('');
    }

    // VIEW DETAILS
    window.viewBookingDetails = function(id) {
        db.ref('bookings/' + id).once('value').then(snap => {
            const b = snap.val();
            if(!b) return;

            document.getElementById('modal-booking-id').innerText = "#" + id.substring(1,8).toUpperCase();
            document.getElementById('modal-user-name').innerText = b.userName;
            document.getElementById('modal-user-phone').innerText = b.phone;
            document.getElementById('modal-hall-name').innerText = b.hallName;
            document.getElementById('modal-date').innerText = b.date;
            document.getElementById('modal-guests').innerText = (b.guestCount || 0) + " Guests";
            
            const statusEl = document.getElementById('modal-status');
            statusEl.innerText = b.status || 'Pending';

            // Actions
            const actionsDiv = document.getElementById('modal-actions');
            if(b.status === 'Pending') {
                actionsDiv.innerHTML = `
                    <button onclick="updateStatus('${id}', 'Confirmed'); closeModal('bookingModal')" class="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl font-bold shadow-lg shadow-emerald-500/30 transition text-sm">Confirm</button>
                    <button onclick="updateStatus('${id}', 'Cancelled'); closeModal('bookingModal')" class="flex-1 bg-white border border-slate-200 text-red-600 hover:bg-red-50 py-3 rounded-xl font-bold transition text-sm">Reject</button>
                `;
            } else {
                actionsDiv.innerHTML = `<button class="w-full py-3 bg-slate-100 text-slate-400 rounded-xl font-bold text-sm cursor-not-allowed" disabled>Booking is ${b.status}</button>`;
            }

            const waLink = `https://wa.me/91${b.phone}?text=Hello ${b.userName}, regarding your booking...`;
            document.getElementById('btn-whatsapp').href = waLink;
            document.getElementById('btn-call').href = `tel:${b.phone}`;

            openModal('bookingModal');
        });
    };

    window.updateStatus = function(id, s) { db.ref('bookings/'+id).update({status: s}); };

    // --- SEARCH ---
    const searchInput = document.getElementById('bookingSearch');
    if(searchInput) {
        searchInput.addEventListener('keyup', (e) => {
            const val = e.target.value.toLowerCase();
            const rows = bookingsList.getElementsByTagName('tr');
            Array.from(rows).forEach(row => {
                const text = row.innerText.toLowerCase();
                row.style.display = text.includes(val) ? '' : 'none';
            });
        });
    }

    // --- GALLERY ---
    const galleryGrid = document.getElementById('galleryGrid');
    const dropZone = document.getElementById('galleryDropZone');
    const fileInput = document.getElementById('galleryUploadInput');

    if(dropZone && fileInput) {
        dropZone.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', handleFiles);
        
        dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('border-blue-500', 'bg-blue-50'); });
        dropZone.addEventListener('dragleave', (e) => { e.preventDefault(); dropZone.classList.remove('border-blue-500', 'bg-blue-50'); });
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('border-blue-500', 'bg-blue-50');
            handleFiles({ target: { files: e.dataTransfer.files } });
        });
    }

    async function handleFiles(e) {
        const files = Array.from(e.target.files);
        if(files.length === 0) return;
        
        for(const file of files) {
            const formData = new FormData();
            formData.append('image', file);
            try {
                const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { method: 'POST', body: formData });
                const data = await res.json();
                if(data.success) {
                    db.ref('gallery').push({ url: data.data.url, createdAt: Date.now() });
                }
            } catch(err) { console.error(err); }
        }
        alert('Uploads Complete!');
    }

    db.ref('gallery').on('value', snap => {
        if(!galleryGrid) return;
        galleryGrid.innerHTML = "";
        snap.forEach(c => {
            const img = c.val();
            galleryGrid.innerHTML += `
                <div class="relative group aspect-square bg-slate-100 rounded-xl overflow-hidden cursor-pointer shadow-sm hover:shadow-md transition-all">
                    <img src="${img.url}" class="w-full h-full object-cover">
                    <div class="absolute inset-0 bg-slate-900/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-sm">
                        <button onclick="db.ref('gallery/${c.key}').remove()" class="w-10 h-10 rounded-full bg-white text-red-500 flex items-center justify-center hover:scale-110 transition-transform"><i class="fas fa-trash"></i></button>
                        <button onclick="window.open('${img.url}')" class="w-10 h-10 rounded-full bg-white text-blue-600 flex items-center justify-center hover:scale-110 transition-transform"><i class="fas fa-expand"></i></button>
                    </div>
                </div>
            `;
        });
    });

    // --- USERS ---
    db.ref('users').on('value', snap => {
        const list = document.getElementById('usersList');
        if(!list) return;
        list.innerHTML = "";
        snap.forEach(c => {
            const u = c.val();
            list.innerHTML += `
            <tr class="hover:bg-slate-50 border-b border-slate-50 last:border-0">
                <td class="px-6 py-4">
                    <div class="flex items-center">
                        <img src="https://ui-avatars.com/api/?name=${u.name}" class="h-8 w-8 rounded-full ring-2 ring-white shadow-sm">
                        <div class="ml-3 font-bold text-slate-800 text-sm">${u.name}</div>
                    </div>
                </td>
                <td class="px-6 py-4 text-slate-500 text-sm font-medium">${u.email}</td>
                <td class="px-6 py-4 text-slate-500 text-sm font-medium">${u.phone || '-'}</td>
                <td class="px-6 py-4"><span class="px-2.5 py-1 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold uppercase tracking-wide">Customer</span></td>
            </tr>
            `;
        });
    });

    // --- FAKE DATA ---
    window.generateFakeData = function() {
        if(!confirm("Generate Demo Data?")) return;
        
        // Seed Halls
        const halls = [
            { name: "Royal Grand Ballroom", capacity: "1000 Guests", price: "75000", imageUrl: "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=800&q=80", description: "Premium AC hall with crystal chandeliers." },
            { name: "Sunset Garden Lawn", capacity: "2000 Guests", price: "120000", imageUrl: "https://images.unsplash.com/photo-1469334031218-e382a71b716b?auto=format&fit=crop&w=800&q=80", description: "Open air luxury lawn for grand receptions." }
        ];
        halls.forEach(h => db.ref('halls').push(h));

        // Seed Bookings
        const names = ["Rohan Patil", "Sneha Deshmukh", "Amit Joshi"];
        for(let i=0; i<3; i++) {
            db.ref('bookings').push({
                userName: names[i],
                phone: "987654321"+i,
                hallName: halls[i%2].name,
                date: "12/08/2026",
                status: "Pending",
                guestCount: 500,
                createdAt: Date.now() - (i*100000)
            });
        }
        alert("Data Seeded! 🚀");
    };

}); // End DOMContentLoaded