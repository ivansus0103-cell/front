document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('pengaduan-list-container');
    const apiUrl = 'http://127.0.0.1:8000/api/pengaduan/';
    const apiWargaUrl = 'http://127.0.0.1:8000/api/warga/'; // Endpoint untuk mengambil data warga
    const token = localStorage.getItem('authToken');
    
    const pengaduanModal = new bootstrap.Modal(document.getElementById('pengaduanModal'));
    const deleteModal = new bootstrap.Modal(document.getElementById('deleteModal'));

    let currentEditId = null;
    let currentDeleteId = null;

    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    // --- FUNGSI BARU: LOAD WARGA KE DROPDOWN ---
    async function loadWargaOptions() {
        const selectPelapor = document.getElementById('pengaduan-pelapor');
        try {
            const resp = await fetch(apiWargaUrl, {
                headers: { 'Authorization': 'Token ' + token }
            });
            const data = await resp.json();
            const listWarga = Array.isArray(data) ? data : (data.results || []);

            selectPelapor.innerHTML = '<option value="">-- Pilih Pelapor --</option>';
            listWarga.forEach(warga => {
                const opt = document.createElement('option');
                opt.value = warga.id;
                opt.textContent = warga.nama_lengkap;
                selectPelapor.appendChild(opt);
            });
        } catch (err) {
            console.error("Gagal memuat data warga:", err);
        }
    }

    // Tombol Tambah Baru
    document.getElementById('add-pengaduan-btn').addEventListener('click', () => {
        currentEditId = null;
        document.getElementById('pengaduan-form').reset();
        document.getElementById('pengaduanModalLabel').innerText = 'Buat Pengaduan Baru';
        loadWargaOptions(); // Panggil agar dropdown terisi
        pengaduanModal.show();
    });

    // 1. FUNGSI LOAD DATA (READ)
    async function loadPengaduan() {
        container.innerHTML = '<div class="spinner-border"></div>';
        try {
            const resp = await fetch(apiUrl, {
                headers: { 'Authorization': 'Token ' + token }
            });
            const data = await resp.json();
            const list = Array.isArray(data) ? data : (data.results || []);

            container.innerHTML = '';
            if (list.length === 0) {
                container.innerHTML = '<p>Belum ada pengaduan.</p>';
                return;
            }

            list.forEach(item => {
                const card = document.createElement('div');
                card.className = 'card mb-3 shadow-sm';
                card.innerHTML = `
                    <div class="card-body">
                        <div class="d-flex justify-content-between">
                            <h5 class="card-title">${item.judul}</h5>
                            <span class="badge bg-info text-dark">${item.status}</span>
                        </div>
                        <h6 class="text-muted small">Pelapor: ${item.nama_pelapor}</h6>
                        <p class="card-text">${item.deskripsi}</p>
                        <div class="mt-2 text-end">
                            <button class="btn btn-sm btn-outline-warning edit-btn" data-id="${item.id}">Edit</button>
                            <button class="btn btn-sm btn-outline-danger delete-btn" data-id="${item.id}">Hapus</button>
                        </div>
                    </div>
                `;
                container.appendChild(card);
            });

            document.querySelectorAll('.edit-btn').forEach(btn => btn.addEventListener('click', prepareEdit));
            document.querySelectorAll('.delete-btn').forEach(btn => btn.addEventListener('click', prepareDelete));

        } catch (err) {
            console.error(err);
        }
    }

    // 2. FUNGSI PERSIAPAN EDIT
    async function prepareEdit(e) {
        const id = e.target.getAttribute('data-id');
        await loadWargaOptions(); // Pastikan dropdown warga terisi dulu
        
        try {
            const resp = await fetch(`${apiUrl}${id}/`, {
                headers: { 'Authorization': 'Token ' + token }
            });
            const data = await resp.json();
            
            currentEditId = id;
            document.getElementById('pengaduan-judul').value = data.judul;
            document.getElementById('pengaduan-deskripsi').value = data.deskripsi;
            document.getElementById('pengaduan-pelapor').value = data.pelapor; // Set value dropdown
            
            document.getElementById('pengaduanModalLabel').innerText = 'Edit Pengaduan';
            pengaduanModal.show();
        } catch (err) { console.error(err); }
    }

    // 3. FUNGSI SIMPAN
    document.getElementById('pengaduan-save-btn').addEventListener('click', async () => {
        const payload = {
            judul: document.getElementById('pengaduan-judul').value,
            deskripsi: document.getElementById('pengaduan-deskripsi').value,
            pelapor: document.getElementById('pengaduan-pelapor').value // Ambil ID Warga dari dropdown
        };

        if (!payload.pelapor) {
            alert("Harap pilih pelapor!");
            return;
        }

        const method = currentEditId ? 'PUT' : 'POST';
        const url = currentEditId ? `${apiUrl}${currentEditId}/` : apiUrl;

        const resp = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Token ' + token
            },
            body: JSON.stringify(payload)
        });

        if (resp.ok) {
            pengaduanModal.hide();
            loadPengaduan();
        } else {
            const errData = await resp.json();
            alert("Gagal menyimpan: " + JSON.stringify(errData));
        }
    });

    // 4. FUNGSI HAPUS
    function prepareDelete(e) {
        currentDeleteId = e.target.getAttribute('data-id');
        deleteModal.show();
    }

    document.getElementById('confirm-delete-btn').addEventListener('click', async () => {
        if (!currentDeleteId) return;

        const resp = await fetch(`${apiUrl}${currentDeleteId}/`, {
            method: 'DELETE',
            headers: { 'Authorization': 'Token ' + token }
        });

        if (resp.ok) {
            deleteModal.hide();
            loadPengaduan();
        } else {
            alert("Gagal menghapus data.");
        }
    });

    loadPengaduan();
});