// App Logic
document.addEventListener('DOMContentLoaded', () => {
    console.log('App initialized');

    // Check for dashboard greeting and logic
    const greetingElement = document.getElementById('user-greeting');
    const avatarElement = document.getElementById('user-avatar');
    const adminMenu = document.getElementById('admin-menu-item');

    // Get Current User
    const currentUser = localStorage.getItem('currentUser');
    const storedUserName = currentUser || localStorage.getItem('userName') || 'Kullanıcı';

    // 1. Set Greeting
    if (greetingElement) {
        greetingElement.innerText = `Merhaba, ${storedUserName} 👋`;
    }

    // 2. Set Avatar Initials logic
    if (avatarElement) {
        let initials = "K";
        if (storedUserName) {
            const parts = storedUserName.trim().split(' ');
            if (parts.length >= 2) {
                // First char of First Name + First char of Last Name
                initials = (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
            } else if (parts.length === 1) {
                initials = parts[0].substring(0, 2).toUpperCase();
            }
        }
        avatarElement.innerText = initials;
    }

    // 3. Admin Checks
    if (storedUserName === 'Süper Admin') {
        // Show Admin Menu
        if (adminMenu) {
            adminMenu.classList.remove('hidden');
        }
    }

    // --- HOME PAGE DYNAMIC CONTENT ---
    const filesSection = document.getElementById('file-tree-root');
    if (filesSection) {
        // Load Intro Content
        const introTitle = localStorage.getItem('home_introLink_title');
        const introImage = localStorage.getItem('home_introLink_image');
        const introText = localStorage.getItem('home_introLink_text');

        if (introTitle) document.getElementById('intro-title').innerText = introTitle;
        if (introImage) document.getElementById('intro-image').src = introImage;
        if (introText) document.getElementById('intro-text').innerHTML = introText;

        // Load Info Content
        const infoText = localStorage.getItem('home_info_text');
        if (infoText) document.getElementById('info-content').innerHTML = infoText;

        // Load File Tree
        renderFileTree(false); // false = read-only mode
    }

    // --- ADMIN CONTENT PAGE LOGIC ---
    const adminContentForm = document.getElementById('admin-intro-form');
    if (adminContentForm) {
        // Verify Admin Access
        if (storedUserName !== 'Süper Admin') {
            alert('Bu sayfaya erişim yetkiniz yok!');
            window.location.href = 'home.html';
            return;
        }

        // Pre-fill forms
        document.getElementById('intro-title-input').value = localStorage.getItem('home_introLink_title') || '';
        document.getElementById('intro-image-input').value = localStorage.getItem('home_introLink_image') || '';
        document.getElementById('intro-content-input').value = localStorage.getItem('home_introLink_text') || '';
        document.getElementById('info-content-input').value = localStorage.getItem('home_info_text') || '';

        // Save Intro
        adminContentForm.addEventListener('submit', (e) => {
            e.preventDefault();
            localStorage.setItem('home_introLink_title', document.getElementById('intro-title-input').value);
            localStorage.setItem('home_introLink_image', document.getElementById('intro-image-input').value);
            localStorage.setItem('home_introLink_text', document.getElementById('intro-content-input').value);
            alert('Tanıtım Ayarları Kaydedildi!');
        });

        // Save Info
        document.getElementById('admin-info-form').addEventListener('submit', (e) => {
            e.preventDefault();
            localStorage.setItem('home_info_text', document.getElementById('info-content-input').value);
            alert('Bilgilendirme Metni Kaydedildi!');
        });

        // Load File Tree (Admin Mode)
        renderFileTree(true);
        populateFolderSelect();
    }


    // 4. Admin User List Handling (for admin.html, admin-users.html)
    const userListBody = document.getElementById('user-list-body');
    if (userListBody) {
        if (storedUserName !== 'Süper Admin') {
            alert('Bu sayfaya erişim yetkiniz yok!');
            window.location.href = 'home.html';
        } else {
            // Load Users from API
            fetch('/api/users')
                .then(res => res.json())
                .then(users => {
                    if (Array.isArray(users)) {
                        users.forEach(user => {
                            const tr = document.createElement('tr');
                            tr.className = "hover:bg-slate-800/30 transition-colors";

                            // Status Badge
                            const statusBadge = user.isVerified
                                ? '<span class="px-2 py-1 rounded text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">Onaylı</span>'
                                : '<span class="px-2 py-1 rounded text-xs font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30">Onay Bekliyor</span>';

                            // Action Button (Approve if not verified)
                            let actionBtn = '';
                            if (!user.isVerified) {
                                actionBtn = `<button onclick="approveUser('${user.email}')" class="mr-2 text-emerald-400 hover:text-emerald-300 text-sm font-medium px-3 py-1 rounded border border-emerald-500/30 hover:bg-emerald-500/10 transition-all">Onayla</button>`;
                            }

                            tr.innerHTML = `
                                <td class="p-4 font-medium text-white">${user.name}</td>
                                <td class="p-4 text-slate-400">${user.email}</td>
                                <td class="p-4">${statusBadge}</td>
                                <td class="p-4 text-right">
                                    ${actionBtn}
                                    <button onclick="deleteUser('${user.email}')" class="text-red-400 hover:text-red-300 text-sm font-medium px-3 py-1 rounded border border-red-500/30 hover:bg-red-500/10 transition-all">
                                        Sil
                                    </button>
                                </td>
                            `;
                            userListBody.appendChild(tr);
                        });
                    }
                })
                .catch(err => console.error('Failed to load users:', err));
        }
    }

    // Expose actions to window
    window.deleteUser = function (email) {
        if (confirm('Bu kullanıcıyı silmek istediğinize emin misiniz?')) {
            fetch('/api/users', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            }).then(res => {
                if (res.ok) window.location.reload();
                else alert('Silme işlemi başarısız');
            });
        }
    };

    window.approveUser = function (email) {
        if (confirm('Bu kullanıcıyı onaylamak istiyor musunuz?')) {
            fetch('/api/users', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, action: 'approve' })
            }).then(res => {
                if (res.ok) window.location.reload();
                else alert('Onaylama işlemi başarısız');
            });
        }
    };

    // Expose deleteUser to window so onclick works
    window.deleteUser = function (key) {
        if (confirm('Bu kullanıcıyı silmek istediğinize emin misiniz?')) {
            localStorage.removeItem(key);
            window.location.reload();
        }
    };

    // 5. Upload Form Handler - REDO for Admin only in future steps
    // Removed legacy upload logic

    // 6. Data Page Renderer - REDO
    // Removed legacy data-grid logic

    // Login Form Handler
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            console.log('Login attempt:', email);

            if (email && password) {
                // SUPER ADMIN CHECK
                const ADMIN_HASH = "d7d09bc3c4ef900cd03a2050fa4db7edab16d9b6016a30b5c03bc520fb42fba1"; // SHA-256 of '603040***'

                if (email === "admin") {
                    // Using Web Crypto API for hashing
                    const msgBuffer = new TextEncoder().encode(password);
                    crypto.subtle.digest('SHA-256', msgBuffer).then(hashBuffer => {
                        const hashArray = Array.from(new Uint8Array(hashBuffer));
                        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

                        if (hashHex === ADMIN_HASH) {
                            localStorage.setItem('currentUser', 'Süper Admin');
                            localStorage.setItem('userName', 'Süper Admin');

                            const btn = loginForm.querySelector('button');
                            btn.innerText = 'Yönetici Girişi...';
                            btn.disabled = true;

                            setTimeout(() => {
                                window.location.href = 'admin.html';
                            }, 1000);
                        } else {
                            alert('Hatalı Yönetici Şifresi!');
                        }
                    });
                    return; // Stop execution here for admin flow
                }

                // Get stored user data (Mock Database) - REPLACED WITH API LOGIN
                fetch('/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                })
                    .then(res => res.json().then(data => ({ status: res.status, body: data })))
                    .then(({ status, body }) => {
                        if (status === 200) {
                            // Login Success
                            localStorage.setItem('currentUser', body.user.name);
                            localStorage.setItem('userName', body.user.name);

                            const btn = loginForm.querySelector('button');
                            btn.innerText = 'Giriş Yapılıyor...';
                            btn.disabled = true;

                            setTimeout(() => {
                                window.location.href = 'home.html';
                            }, 1000);
                        } else {
                            // Error (Invalid credentials or Not Verified)
                            alert(body.error || 'Giriş başarısız!');
                        }
                    })
                    .catch(err => {
                        console.error('Login error:', err);
                        alert('Bir hata oluştu. Lütfen tekrar deneyin.');
                    });
            }
        });
    }

    // Register Form Handler
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const nameInput = document.getElementById('name');
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const passwordConfirm = document.getElementById('password-confirm').value;

            // 1. Password Match Validation
            if (password !== passwordConfirm) {
                alert("Şifreler eşleşmiyor!");
                return;
            }

            // 2. Password Length Validation
            if (password.length < 6) {
                alert("Şifre en az 6 karakter olmalıdır!");
                return;
            }

            // 3. User Existence Check
            if (localStorage.getItem('user_' + email)) {
                alert("Bu email adresi ile zaten bir kayıt mevcut!");
                return;
            }

            // 4. Save User to API
            const btn = registerForm.querySelector('button');
            const originalText = btn.innerText;
            btn.innerText = 'Kayıt Olunuyor...';
            btn.disabled = true;

            fetch('/api/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: nameInput ? nameInput.value : 'Kullanıcı',
                    email: email,
                    password: password
                })
            })
                .then(res => res.json().then(data => ({ status: res.status, body: data })))
                .then(({ status, body }) => {
                    if (status === 201) {
                        // Success
                        alert('Kayıt başarılı! Yönetici onayı bekleniyor. Onaylandığında giriş yapabileceksiniz.');
                        window.location.href = 'index.html';
                    } else {
                        // Error
                        alert('Kayıt hatası: ' + (body.error || 'Bilinmeyen hata'));
                        btn.innerText = originalText;
                        btn.disabled = false;
                    }
                })
                .catch(err => {
                    console.error('Register error:', err);
                    alert('Kayıt işlemi sırasında bir hata oluştu.');
                    btn.innerText = originalText;
                    btn.disabled = false;
                });
        });
    }

    // Dashboard visual effects
    const dashboardStats = document.querySelectorAll('.stat-card');
    dashboardStats.forEach((card, index) => {
        card.style.animationDelay = `${index * 0.1}s`;
        card.classList.add('fade-in');
    });
});

// --- HELPER FUNCTIONS FOR FILE SYSTEM ATTRIBUTES (GLOBAL) ---
const mockFileSystemKey = 'mock_file_system';

function getFileSystem() {
    const fs = localStorage.getItem(mockFileSystemKey);
    return fs ? JSON.parse(fs) : {
        "root": {
            id: "root",
            name: "Ana Dizin",
            type: "folder",
            children: []
        }
    };
}

function saveFileSystem(fs) {
    localStorage.setItem(mockFileSystemKey, JSON.stringify(fs));
}

function addFolder() {
    const name = document.getElementById('new-folder-name').value;
    // For simplicity, we just add to root for now, or need a way to select parent
    if (!name) return alert('Klasör adı giriniz');

    const fs = getFileSystem();
    const newFolder = {
        id: 'folder_' + Date.now(),
        name: name,
        type: 'folder',
        children: []
    };

    fs.root.children.push(newFolder);
    saveFileSystem(fs);
    alert('Klasör eklendi');
    renderFileTree(true);
    populateFolderSelect();
    document.getElementById('new-folder-name').value = '';
}

function addNewFileFromAdmin() {
    const desc = document.getElementById('admin-upload-desc').value;
    const coverInput = document.getElementById('admin-upload-image');
    const contentInput = document.getElementById('admin-upload-file');
    const parentId = document.getElementById('target-folder-select').value;

    if (contentInput.files.length === 0) return alert('Lütfen asıl dosyayı (İçerik) seçiniz');

    const coverFile = coverInput.files.length > 0 ? coverInput.files[0] : null;
    const contentFile = contentInput.files[0];

    // Read Both Files Helper
    const readFile = (file) => {
        return new Promise((resolve) => {
            if (!file) { resolve(null); return; }
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.readAsDataURL(file);
        });
    };

    Promise.all([readFile(coverFile), readFile(contentFile)]).then(([coverBase64, contentBase64]) => {
        const fs = getFileSystem();

        const newFile = {
            id: 'file_' + Date.now(),
            name: contentFile.name,
            type: 'file',

            // New structure
            coverImg: coverBase64, // Thumbnail
            contentData: contentBase64, // Actual Content
            contentType: contentFile.type,

            // Legacy/Fallback
            url: '#',
            img: coverBase64,

            desc: desc,
            uploadDate: new Date().toLocaleDateString('tr-TR')
        };

        if (parentId === 'root') {
            fs.root.children.push(newFile);
        } else {
            const parent = findFolder(fs.root, parentId);
            if (parent) {
                parent.children.push(newFile);
            } else {
                return alert('Klasör bulunamadı');
            }
        }

        saveFileSystem(fs);
        alert('Dosya ve Kapak başarıyla yüklendi');
        renderFileTree(true);

        // Reset
        document.getElementById('admin-upload-desc').value = '';
        document.getElementById('admin-upload-image').value = '';
        document.getElementById('admin-upload-file').value = '';
    });
}

function findFolder(node, id) {
    if (node.id === id) return node;
    if (node.children) {
        for (let child of node.children) {
            if (child.type === 'folder') {
                const found = findFolder(child, id);
                if (found) return found;
            }
        }
    }
    return null;
}

function deleteNode(id) {
    if (!confirm('Bu öğeyi silmek istediğinize emin misiniz?')) return;
    const fs = getFileSystem();
    deleteNodeRecursive(fs.root, id);
    saveFileSystem(fs);
    renderFileTree(true);
    populateFolderSelect();
}

function deleteNodeRecursive(parent, id) {
    if (!parent.children) return;
    const idx = parent.children.findIndex(x => x.id === id);
    if (idx > -1) {
        parent.children.splice(idx, 1);
        return;
    }
    parent.children.forEach(child => {
        if (child.type === 'folder') deleteNodeRecursive(child, id);
    });
}

function resetFileSystem() {
    if (confirm('Tüm dosya sistemi silinecek! Onaylıyor musunuz?')) {
        localStorage.removeItem(mockFileSystemKey);
        renderFileTree(true);
        populateFolderSelect();
    }
}

// --- RENDER LOGIC ---

// Global state for User View current folder
let currentUserFolderId = 'root';

function renderFileTree(isAdmin) {
    const fs = getFileSystem();
    const container = isAdmin ? document.getElementById('admin-file-tree') : document.getElementById('file-tree-root');
    if (!container) return;

    container.innerHTML = '';

    if (isAdmin) {
        // ADMIN: Tree View
        container.appendChild(renderNodeAdmin(fs.root));
    } else {
        // USER: Gallery / Folder View
        renderUserView(fs.root, container);
    }
}

// ADMIN VIEW: Recursive Tree
function renderNodeAdmin(node) {
    const el = document.createElement('div');
    el.className = 'ml-4 mt-1 border-l border-slate-700 pl-2';

    if (node.id === 'root') {
        el.className = ''; // Root wrapper
    } else {
        // Item UI
        const isFolder = node.type === 'folder';
        const icon = isFolder ? '<i class="fas fa-folder text-yellow-500 mr-2"></i>' : '<i class="fas fa-file-alt text-blue-400 mr-2"></i>';
        const deleteBtn = `<button onclick="deleteNode('${node.id}')" class="ml-2 text-red-500 hover:text-red-400 text-xs"><i class="fas fa-trash"></i></button>`;

        const contentDiv = document.createElement('div');
        contentDiv.className = `flex items-center group ${isFolder ? 'cursor-pointer hover:bg-slate-800/50 rounded p-1' : ''}`;
        if (isFolder) contentDiv.onclick = () => toggleFolder(node.id);

        contentDiv.innerHTML = `
            <span class="flex-1 text-sm text-slate-300">
                ${icon} ${node.name}
            </span>
            ${deleteBtn}
        `;
        el.appendChild(contentDiv);
    }

    // Children
    if (node.children) {
        const childrenContainer = document.createElement('div');
        childrenContainer.id = `children-${node.id}`;
        childrenContainer.className = node.id === 'root' ? '' : 'hidden';

        node.children.forEach(child => {
            childrenContainer.appendChild(renderNodeAdmin(child));
        });
        el.appendChild(childrenContainer);
    }

    return el;
}

// USER VIEW: Folders Top, Grid Below
function renderUserView(rootNode, container) {
    // 1. Breadcrumb / Folder Navigation
    const navBar = document.createElement('div');
    navBar.className = "flex items-center space-x-2 mb-6 overflow-x-auto pb-2 border-b border-slate-800";

    // Flatten folders to find current path? 
    // For simplicity: Root -> [List of Top Folders] -> [Selected Folder Content]
    // We will render all Root Children that are FOLDERS as tabs.
    // And render the content of the 'currentUserFolderId'.

    // Find the current active folder object
    let activeFolder = rootNode;
    if (currentUserFolderId !== 'root') {
        const found = findFolder(rootNode, currentUserFolderId);
        if (found) activeFolder = found;
    }

    // Render "Root" Folders as Navigation Tabs
    const folders = rootNode.children.filter(c => c.type === 'folder');

    // "All" / Root Tab
    const rootBtn = document.createElement('button');
    rootBtn.className = `px-4 py-2 rounded-lg text-sm font-medium transition-all ${currentUserFolderId === 'root' ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-600/30' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`;
    rootBtn.innerHTML = '<i class="fas fa-home mr-2"></i> Tümü';
    rootBtn.onclick = () => { currentUserFolderId = 'root'; renderFileTree(false); };
    navBar.appendChild(rootBtn);

    folders.forEach(folder => {
        const btn = document.createElement('button');
        const isActive = currentUserFolderId === folder.id;
        btn.className = `px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${isActive ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-600/30' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`;
        btn.innerHTML = `<i class="fas fa-folder mr-2 ${isActive ? 'text-indigo-400' : 'text-yellow-500/80'}"></i> ${folder.name}`;
        btn.onclick = () => { currentUserFolderId = folder.id; renderFileTree(false); };
        navBar.appendChild(btn);
    });

    container.appendChild(navBar);

    // 2. Grid Content (Files in active folder)
    // If root, maybe show all files? Or just files in root? Let's show files in active folder.
    const grid = document.createElement('div');
    grid.className = "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6";

    const files = activeFolder.children.filter(c => c.type === 'file');

    if (files.length === 0) {
        grid.innerHTML = `<div class="col-span-full text-center py-10 text-slate-500 italic">Bu klasörde henüz dosya yok.</div>`;
    } else {
        files.forEach(file => {
            const card = document.createElement('div');
            card.className = "group relative bg-slate-800/30 border border-slate-700/50 rounded-xl overflow-hidden hover:shadow-xl hover:shadow-indigo-500/10 hover:border-indigo-500/30 transition-all duration-300 cursor-pointer";
            card.onclick = () => window.open(`detail.html?id=${file.id}`, 'FileDetail', 'width=1000,height=800');

            // Image Area - Prefer Cover Image
            const imgUrl = file.coverImg || file.img || 'https://placehold.co/600x400/1e293b/475569?text=No+Preview';

            card.innerHTML = `
                <div class="h-48 overflow-hidden relative">
                    <img src="${imgUrl}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">
                    <div class="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/20 to-transparent"></div>
                    <div class="absolute bottom-3 left-3 right-3">
                         <h4 class="text-white font-medium truncate shadow-sm">${file.name}</h4>
                    </div>
                    <div class="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <span class="bg-indigo-600 text-white text-xs px-2 py-1 rounded shadow"><i class="fas fa-external-link-alt"></i> İncele</span>
                    </div>
                </div>
                <div class="p-4">
                    <p class="text-xs text-slate-400 line-clamp-2 h-8 mb-3">${file.desc || 'Açıklama yok...'}</p>
                    <div class="flex items-center justify-end border-t border-slate-700/50 pt-3">
                        <span class="text-[10px] text-slate-500">${file.uploadDate || ''}</span>
                    </div>
                </div>
            `;
            grid.appendChild(card);
        });
    }

    container.appendChild(grid);
}


function toggleFolder(id) {
    const el = document.getElementById(`children-${id}`);
    if (el) el.classList.toggle('hidden');
}

function populateFolderSelect() {
    const select = document.getElementById('target-folder-select');
    if (!select) return;

    select.innerHTML = '<option value="root">Ana Dizin</option>';
    const fs = getFileSystem();

    // Flat traverse for options
    traverseFolders(fs.root, (folder) => {
        if (folder.id !== 'root') {
            const option = document.createElement('option');
            option.value = folder.id;
            option.innerText = folder.name;
            select.appendChild(option);
        }
    });
}

function traverseFolders(node, callback) {
    if (node.type === 'folder') {
        callback(node);
        if (node.children) {
            node.children.forEach(child => traverseFolders(child, callback));
        }
    }
}
