// app.js
document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('warga-list-container');
    const apiUrl = 'http://127.0.0.1:8000/api/wrg/';

    // ambil token dari localStorage (DRF TokenAuth)
    const token = localStorage.getItem('authToken');
    if (!token) {
        // jika belum login, arahkan ke login
        window.location.href = 'login.html';
        return;
    }

    function escapeHtml(str) {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function renderWargaCard(warga, index) {
        const card = document.createElement('div');
        card.className = 'card mb-3 shadow-sm';
        card.innerHTML = `
            <div class="card-body">
                <h5 class="card-title mb-2">${escapeHtml(warga.nama_lengkap || warga.nama || '-')}</h5>
                <p class="card-text mb-1"><small class="text-muted">NIK: ${escapeHtml(warga.nik || '-')}</small></p>
                <p class="card-text"><small>Alamat: ${escapeHtml(warga.alamat || warga.alamat_lengkap || '-')}</small></p>
                <div class="mt-3 d-flex gap-2">
                    <button class="btn btn-sm btn-outline-primary btn-edit">Edit</button>
                    <button class="btn btn-sm btn-outline-danger btn-delete">Hapus</button>
                </div>
            </div>
        `;
        card.dataset.index = index;
        card.dataset.id = warga.id || '';
        return card;
    }

    function showAlert(type, message) {
        container.innerHTML = `
            <div class="alert alert-${type}" role="alert">${escapeHtml(message)}</div>
        `;
    }

    async function loadWarga() {
        container.innerHTML = '<div class="d-flex justify-content-center my-5"><div class="spinner-border" role="status"><span class="visually-hidden">Memuat...</span></div></div>';
        try {
            const resp = await fetch(apiUrl, { headers: { 'Authorization': 'Token ' + token } });
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

            const data = await resp.json();
            console.log('API response:', data);

            // Dukung array langsung atau objek dengan properti `results`
            const list = Array.isArray(data) ? data : (data && Array.isArray(data.results) ? data.results : null);
            if (!list) {
                showAlert('warning', 'Tidak ada data warga atau format respons tidak dikenali. Periksa console.');
                console.error('Unexpected API response format:', data);
                return;
            }

            container.innerHTML = ''; // kosongkan spinner/mensaje

            if (list.length === 0) {
                showAlert('info', 'Belum ada data warga. Klik "Tambah Data" untuk menambahkan.');
                return;
            }

            const row = document.createElement('div');
            row.className = 'row';

            list.forEach((w, idx) => {
                const col = document.createElement('div');
                col.className = 'col-12 col-md-6';
                col.appendChild(renderWargaCard(w, idx));
                row.appendChild(col);
            });

            container.appendChild(row);
            attachCardHandlers(list);
        } catch (err) {
            showAlert('danger', 'Gagal memuat data. Pastikan server backend berjalan dan token valid.');
            console.error('There has been a problem with your fetch operation:', err);
        }
    }

    // modal instances
    const wargaModalEl = document.getElementById('wargaModal');
    const deleteModalEl = document.getElementById('deleteModal');
    const wargaModal = wargaModalEl ? new bootstrap.Modal(wargaModalEl) : null;
    const deleteModal = deleteModalEl ? new bootstrap.Modal(deleteModalEl) : null;

    function attachCardHandlers(list) {
        document.querySelectorAll('.btn-edit').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const card = e.target.closest('.card');
                const idx = parseInt(card.dataset.index, 10);
                const data = list[idx];
                document.getElementById('warga-id').value = data.id || '';
                document.getElementById('warga-nama').value = data.nama_lengkap || data.nama || '';
                document.getElementById('warga-nik').value = data.nik || '';
                document.getElementById('warga-alamat').value = data.alamat || data.alamat_lengkap || '';
                if (wargaModal) wargaModal.show();
            });
        });
        document.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const card = e.target.closest('.card');
                const id = card.dataset.id;
                const confirmBtn = document.getElementById('confirm-delete-btn');
                confirmBtn.dataset.id = id;
                if (deleteModal) deleteModal.show();
            });
        });
    }

    // Save handler (create / update)
    document.getElementById('warga-save-btn').addEventListener('click', async () => {
        const id = document.getElementById('warga-id').value;
        const nama = document.getElementById('warga-nama').value.trim();
        const nik = document.getElementById('warga-nik').value.trim();
        const alamat = document.getElementById('warga-alamat').value.trim();
        if (!nama) { alert('Nama wajib diisi'); return; }

        const payload = { nama_lengkap: nama, nik: nik, alamat: alamat };
        try {
            const url = id ? `${apiUrl}${id}/` : apiUrl;
            const method = id ? 'PUT' : 'POST';
            const resp = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Token ' + token },
                body: JSON.stringify(payload)
            });
            const data = await resp.json().catch(() => ({}));
            if (!resp.ok) { alert('Gagal menyimpan: ' + (data.detail || JSON.stringify(data))); return; }
            if (wargaModal) wargaModal.hide();
            await loadWarga();
        } catch (err) {
            console.error('Save error', err);
            alert('Terjadi kesalahan saat menyimpan. Lihat console.');
        }
    });

    // Delete handler
    document.getElementById('confirm-delete-btn').addEventListener('click', async (e) => {
        const id = e.target.dataset.id;
        if (!id) return;
        try {
            const resp = await fetch(`${apiUrl}${id}/`, { method: 'DELETE', headers: { 'Authorization': 'Token ' + token } });
            if (!resp.ok) {
                const data = await resp.json().catch(() => ({}));
                alert('Gagal menghapus: ' + (data.detail || JSON.stringify(data)));
                return;
            }
            if (deleteModal) deleteModal.hide();
            await loadWarga();
        } catch (err) {
            console.error('Delete error', err);
            alert('Terjadi kesalahan saat menghapus. Lihat console.');
        }
    });

    // Add button handler
    const addBtn = document.getElementById('add-warga-btn');
    addBtn && addBtn.addEventListener('click', () => {
        document.getElementById('warga-id').value = '';
        document.getElementById('warga-nama').value = '';
        document.getElementById('warga-nik').value = '';
        document.getElementById('warga-alamat').value = '';
        if (wargaModal) wargaModal.show();
    });

    // initial load
    loadWarga();
});