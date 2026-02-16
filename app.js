// App Logic
document.addEventListener('DOMContentLoaded', () => {
    console.log('App initialized');

    const SUPABASE_URL = 'https://pidkikybaimfqcdvzoew.supabase.co';
    const SUPABASE_KEY = 'sb_publishable_1sO5ONgAImG22qIS_v7P0w_bYC7N3mU'; // Provided by User

    const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

    // Check for dashboard greeting and logic
    const greetingElement = document.getElementById('user-greeting');
    const avatarElement = document.getElementById('user-avatar');
    const adminMenu = document.getElementById('admin-menu-item');

    // AUTH STATE CHANGE LISTENER
    _supabase.auth.onAuthStateChange((event, session) => {
        console.log('Auth Event:', event, session);
        if (event === 'SIGNED_IN' && session) {
            const user = session.user;
            const displayName = user.user_metadata.full_name || user.email.split('@')[0];

            // Sync with LocalStorage for compatibility with existing UI logic
            localStorage.setItem('currentUser', displayName);
            localStorage.setItem('userName', displayName);
            localStorage.setItem('userEmail', user.email);

            // Redirect if on login/register page
            if (window.location.pathname.includes('index.html') || window.location.pathname.includes('register.html')) {
                window.location.href = 'home.html';
            }
        } else if (event === 'SIGNED_OUT') {
            localStorage.removeItem('currentUser');
            localStorage.removeItem('userName');
            localStorage.removeItem('userEmail');
            if (!window.location.pathname.includes('index.html') && !window.location.pathname.includes('register.html')) {
                window.location.href = 'index.html';
            }
        }
    });

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

    // Helper to fetch content
    async function fetchContent() {
        const { data, error } = await _supabase.from('site_content').select('*');
        if (error) {
            console.error('Error fetching content:', error);
            return {};
        }
        // Convert array to object key-value
        return data.reduce((acc, item) => {
            acc[item.key] = item.value;
            return acc;
        }, {});
    }

    if (filesSection) {
        fetchContent().then(content => {
            // Load Intro Content
            const introTitle = content['home_introLink_title'];
            const introImage = content['home_introLink_image'];
            const introText = content['home_introLink_text'];

            if (introTitle) document.getElementById('intro-title').innerText = introTitle;
            if (introImage) document.getElementById('intro-image').src = introImage;
            if (introText) document.getElementById('intro-text').innerHTML = introText;

            // Load Info Content
            const infoText = content['home_info_text'];
            if (infoText) document.getElementById('info-content').innerHTML = infoText;
        });

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

        // Pre-fill forms from DB
        fetchContent().then(content => {
            document.getElementById('intro-title-input').value = content['home_introLink_title'] || '';
            document.getElementById('intro-image-input').value = content['home_introLink_image'] || '';
            document.getElementById('intro-content-input').value = content['home_introLink_text'] || '';
            document.getElementById('info-content-input').value = content['home_info_text'] || '';
        });

        // Save Intro
        adminContentForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const updates = [
                { key: 'home_introLink_title', value: document.getElementById('intro-title-input').value },
                { key: 'home_introLink_image', value: document.getElementById('intro-image-input').value },
                { key: 'home_introLink_text', value: document.getElementById('intro-content-input').value }
            ];

            const { error } = await _supabase.from('site_content').upsert(updates);

            if (error) alert('Hata: ' + error.message);
            else alert('Tanıtım Ayarları Kaydedildi!');
        });

        // Save Info
        document.getElementById('admin-info-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const { error } = await _supabase.from('site_content').upsert([
                { key: 'home_info_text', value: document.getElementById('info-content-input').value }
            ]);

            if (error) alert('Hata: ' + error.message);
            else alert('Bilgilendirme Metni Kaydedildi!');
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
            // Load Users from LocalStorage
            Object.keys(localStorage).forEach(key => {
                if (key.startsWith('user_')) {
                    try {
                        const user = JSON.parse(localStorage.getItem(key));
                        const tr = document.createElement('tr');
                        tr.className = "hover:bg-slate-800/30 transition-colors";
                        tr.innerHTML = `
                            <td class="p-4 font-medium text-white">${user.name}</td>
                            <td class="p-4 text-slate-400">${user.email}</td>
                            <td class="p-4 text-right">
                                <button onclick="deleteUser('${key}')" class="text-red-400 hover:text-red-300 text-sm font-medium px-3 py-1 rounded border border-red-500/30 hover:bg-red-500/10 transition-all">
                                    Sil
                                </button>
                            </td>
                        `;
                        userListBody.appendChild(tr);
                    } catch (e) {
                        console.error("Error parsing user data", e);
                    }
                }
            });
        }
    }

    // Expose deleteUser to window so onclick works
    window.deleteUser = function (key) {
        if (confirm('Bu kullanıcıyı silmek istediğinize emin misiniz?')) {
            localStorage.removeItem(key);
            window.location.reload();
        }
    };

    // Global Logout Function
    window.logout = async function () {
        if (confirm('Çıkış yapmak istediğinize emin misiniz?')) {
            const { error } = await _supabase.auth.signOut();
            if (error) {
                console.error('Error logging out:', error);
                // Force local cleanup anyway
                localStorage.removeItem('currentUser');
                localStorage.removeItem('userName');
                localStorage.removeItem('userEmail');
                window.location.href = 'index.html';
            }
            // onAuthStateChange will handle the redirect if successful
        }
    };

    // 5. Upload Form Handler - REDO for Admin only in future steps
    // Removed legacy upload logic

    // 6. Data Page Renderer - REDO
    // Removed legacy data-grid logic

    // Login Form Handler
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
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


                // SUPABASE LOGIN
                const btn = loginForm.querySelector('button');
                const originalText = btn.innerText;
                btn.innerText = 'Giriş Yapılıyor...';
                btn.disabled = true;

                const { data, error } = await _supabase.auth.signInWithPassword({
                    email: email,
                    password: password
                });

                if (error) {
                    alert('Giriş başarısız: ' + error.message);
                    btn.innerText = originalText;
                    btn.disabled = false;
                } else {
                    // Success is handled by onAuthStateChange
                    console.log('Login successful:', data);
                }
            }
        });
    }

    // Register Form Handler
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
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

            // SUPABASE REGISTER
            const btn = registerForm.querySelector('button');
            const originalText = btn.innerText;
            btn.innerText = 'Kayıt Olunuyor...';
            btn.disabled = true;

            const { data, error } = await _supabase.auth.signUp({
                email: email,
                password: password,
                options: {
                    data: {
                        full_name: nameInput ? nameInput.value : ''
                    }
                }
            });

            if (error) {
                alert('Kayıt başarısız: ' + error.message);
                btn.innerText = originalText;
                btn.disabled = false;
            } else {
                alert('Kayıt başarılı! Lütfen email adresinizi doğrulayın.');
                window.location.href = 'index.html';
            }
        });
    }

    // Dashboard visual effects
    const dashboardStats = document.querySelectorAll('.stat-card');
    dashboardStats.forEach((card, index) => {
        card.style.animationDelay = `${index * 0.1}s`;
        card.classList.add('fade-in');
    });
});

// --- HELPER FUNCTIONS FOR FILE SYSTEM (SUPABASE) ---

// 1. Fetch File System Structure
async function getFileSystem() {
    // Fetch Folders
    const { data: folders, error: folderError } = await _supabase.from('folders').select('*').order('created_at');
    // Fetch Files
    const { data: files, error: fileError } = await _supabase.from('files').select('*').order('created_at');

    if (folderError || fileError) {
        console.error('Error fetching FS:', folderError, fileError);
        return { root: { id: 'root', name: 'Ana Dizin', type: 'folder', children: [] } };
    }

    // Build Tree
    const root = { id: 'root', name: 'Ana Dizin', type: 'folder', children: [] };
    const folderMap = { 'root': root };

    // Initialize all folder objects
    folders.forEach(f => {
        folderMap[f.id] = { ...f, type: 'folder', children: [] };
    });

    // Link folders to parents
    folders.forEach(f => {
        const parentId = f.parent_id || 'root'; // Assuming null parent_id means root
        if (folderMap[parentId]) {
            folderMap[parentId].children.push(folderMap[f.id]);
        }
    });

    // Add files to folders
    files.forEach(f => {
        const parentId = f.folder_id || 'root';
        const fileObj = { ...f, type: 'file' };
        if (folderMap[parentId]) {
            folderMap[parentId].children.push(fileObj);
        }
    });

    return { root };
}

async function addFolder() {
    const name = document.getElementById('new-folder-name').value;
    if (!name) return alert('Klasör adı giriniz');

    // Create folder logic
    const { error } = await _supabase.from('folders').insert([{ name: name, parent_id: null }]); // null = root

    if (error) {
        alert('Hata: ' + error.message);
    } else {
        alert('Klasör eklendi');
        renderFileTree(true);
        populateFolderSelect();
        document.getElementById('new-folder-name').value = '';
    }
}

async function addNewFileFromAdmin() {
    const desc = document.getElementById('admin-upload-desc').value;
    const coverInput = document.getElementById('admin-upload-image');
    const contentInput = document.getElementById('admin-upload-file');
    const parentId = document.getElementById('target-folder-select').value;

    if (contentInput.files.length === 0) return alert('Lütfen asıl dosyayı (İçerik) seçiniz');

    const coverFile = coverInput.files.length > 0 ? coverInput.files[0] : null;
    const contentFile = contentInput.files[0];

    // 1. Upload Content
    // Sanitize filename
    const safeName = contentFile.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const contentPath = `files/${Date.now()}_${safeName}`;
    const { data: contentData, error: contentError } = await _supabase.storage
        .from('uploads')
        .upload(contentPath, contentFile);

    if (contentError) return alert('Dosya yükleme hatası: ' + contentError.message);

    const contentUrl = _supabase.storage.from('uploads').getPublicUrl(contentPath).data.publicUrl;

    // 2. Upload Cover (Optional)
    let coverUrl = null;
    if (coverFile) {
        const safeCoverName = coverFile.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const coverPath = `covers/${Date.now()}_${safeCoverName}`;
        const { error: coverError } = await _supabase.storage
            .from('uploads')
            .upload(coverPath, coverFile);

        if (!coverError) {
            coverUrl = _supabase.storage.from('uploads').getPublicUrl(coverPath).data.publicUrl;
        }
    }

    // 3. Insert into DB
    const { error: dbError } = await _supabase.from('files').insert([{
        name: contentFile.name,
        description: desc,
        folder_id: parentId === 'root' ? null : parentId,
        file_url: contentUrl,
        cover_url: coverUrl,
        mime_type: contentFile.type
    }]);

    if (dbError) {
        alert('Veritabanı hatası: ' + dbError.message);
    } else {
        alert('Dosya ve Kapak başarıyla yüklendi');
        renderFileTree(true);
        // Reset
        document.getElementById('admin-upload-desc').value = '';
        document.getElementById('admin-upload-image').value = '';
        document.getElementById('admin-upload-file').value = '';
    }
}

// Deprecated: findFolder sync logic replaced by getFileSystem async builder

async function deleteNode(id, type) {
    if (!confirm('Bu öğeyi silmek istediğinize emin misiniz?')) return;

    // If it's a folder, we might need recursive delete. 
    // Supabase Cascade Delete on foreign keys handles files if configured, 
    // but default schema might not.
    // Let's try simple delete.

    let error;
    if (type === 'folder') {
        // Warning: This implies we need to know the Type passed from the button
        const { error: err } = await _supabase.from('folders').delete().eq('id', id);
        error = err;
    } else {
        const { error: err } = await _supabase.from('files').delete().eq('id', id);
        error = err;
    }

    if (error) {
        alert('Silme hatası: ' + error.message);
    } else {
        renderFileTree(true);
        populateFolderSelect();
    }
}

function resetFileSystem() {
    alert('Bu özellik veritabanı modunda devre dışı bırakıldı (Güvenlik).');
}

// --- RENDER LOGIC ---

// Global state for User View current folder
let currentUserFolderId = 'root';

async function renderFileTree(isAdmin) {
    const fs = await getFileSystem();
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
        // Pass type to deleteNode
        const deleteBtn = `<button onclick="deleteNode('${node.id}', '${node.type}')" class="ml-2 text-red-500 hover:text-red-400 text-xs"><i class="fas fa-trash"></i></button>`;

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

    // Find the current active folder object
    let activeFolder = rootNode;
    // Helper traverse to find node in new async structure
    const findNode = (n, id) => {
        if (n.id === id) return n;
        for (let c of n.children) {
            const found = findNode(c, id);
            if (found) return found;
        }
        return null;
    }

    if (currentUserFolderId !== 'root') {
        const found = findNode(rootNode, currentUserFolderId);
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
    const grid = document.createElement('div');
    grid.className = "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6";

    const files = activeFolder.children.filter(c => c.type === 'file');

    if (files.length === 0) {
        grid.innerHTML = `<div class="col-span-full text-center py-10 text-slate-500 italic">Bu klasörde henüz dosya yok.</div>`;
    } else {
        files.forEach(file => {
            const card = document.createElement('div');
            card.className = "group relative bg-slate-800/30 border border-slate-700/50 rounded-xl overflow-hidden hover:shadow-xl hover:shadow-indigo-500/10 hover:border-indigo-500/30 transition-all duration-300 cursor-pointer";
            // Use file.file_url for detail view
            card.onclick = () => window.open(file.file_url, '_blank');

            // Image Area - Prefer Cover Image
            const imgUrl = file.cover_url || file.coverImg || 'https://placehold.co/600x400/1e293b/475569?text=No+Preview';

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
                    <p class="text-xs text-slate-400 line-clamp-2 h-8 mb-3">${file.description || file.desc || 'Açıklama yok...'}</p>
                    <div class="flex items-center justify-end border-t border-slate-700/50 pt-3">
                        <span class="text-[10px] text-slate-500">${new Date(file.created_at || Date.now()).toLocaleDateString('tr-TR')}</span>
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

async function populateFolderSelect() {
    const select = document.getElementById('target-folder-select');
    if (!select) return;

    select.innerHTML = '<option value="root">Ana Dizin</option>';
    const fs = await getFileSystem();

    // Helpers to recurse
    const traverse = (node, depth) => {
        if (node.type === 'folder' && node.id !== 'root') {
            const option = document.createElement('option');
            option.value = node.id;
            option.innerText = "-".repeat(depth) + " " + node.name;
            select.appendChild(option);
        }
        if (node.children) {
            node.children.forEach(c => traverse(c, depth + 1));
        }
    };

    traverse(fs.root, 0);
}

