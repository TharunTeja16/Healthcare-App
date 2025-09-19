// Admin page wiring: login and inventory upsert/list
(function () {
	const API_BASE = 'http://localhost:4000';
	const qs = (s, r = document) => r.querySelector(s);
	const qsa = (s, r = document) => Array.from(r.querySelectorAll(s));

	const emailEl = qs('#login-email');
	const passEl = qs('#login-password');
	const loginBtn = qsa('.login-card .btn.btn-primary')[0];
	const invForm = qs('.form-inline');
	const invInputs = invForm ? qsa('input,select', invForm) : [];
	const invBtn = invForm ? qsa('button', invForm)[0] : null;
	const invTableBody = qs('table[aria-label="Inventory table"] tbody');

	function getToken() { return localStorage.getItem('token'); }
	function setToken(t) { localStorage.setItem('token', t); }

	async function api(path, opts = {}) {
		const headers = Object.assign({ 'Content-Type': 'application/json' }, opts.headers || {});
		const token = getToken();
		if (token) headers['Authorization'] = `Bearer ${token}`;
		const res = await fetch(`${API_BASE}${path}`, Object.assign({}, opts, { headers }));
		if (!res.ok) throw new Error(`HTTP ${res.status}`);
		return res.json();
	}

	async function handleLogin() {
		const email = emailEl?.value?.trim();
		const password = passEl?.value || '';
		if (!email || !password) { alert('Enter email and password'); return; }
		try {
			const { token, user } = await api('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
			setToken(token);
			alert(`Logged in as ${user.name}`);
			await loadInventory();
		} catch (e) {
			alert('Login failed');
		}
	}

	async function loadInventory() {
		if (!invTableBody) return;
		try {
			const { items } = await api('/api/inventory');
			renderInventory(items || []);
		} catch (e) {
			invTableBody.innerHTML = `<tr><td colspan="5" class="muted">Failed to load inventory</td></tr>`;
		}
	}
	
	function renderInventory(items) {
		invTableBody.innerHTML = '';
		if (!items.length) {
			invTableBody.innerHTML = `<tr><td colspan="5" class="muted">No items</td></tr>`;
			return;
		}
		for (const it of items) {
			const tr = document.createElement('tr');
			const med = it.medicineId || {};
			tr.innerHTML = `
				<td>${escapeHtml(med.brandName || '')}</td>
				<td>${escapeHtml(med.strength || '')}</td>
				<td>${Number(it.quantity ?? 0)}</td>
				<td>${it.expiry ? escapeHtml((it.expiry || '').slice(0, 10)) : ''}</td>
				<td><button class="btn btn-link danger" type="button" disabled>Remove</button></td>
			`;
			invTableBody.appendChild(tr);
		}
	}

	async function upsertInventory() {
		if (!invInputs?.length) return;
		const [nameEl, strengthEl, qtyEl, expiryEl] = invInputs;
		const payload = {
			brandName: nameEl.value.trim(),
			genericName: nameEl.value.trim(),
			strength: strengthEl.value.trim(),
			quantity: Number(qtyEl.value || 0),
			expiry: expiryEl.value ? `${expiryEl.value}-01` : undefined
		};
		if (!payload.brandName) { alert('Enter medicine name'); return; }
		try {
			await api('/api/inventory/upsert', { method: 'POST', body: JSON.stringify(payload) });
			await loadInventory();
		} catch (e) {
			alert('Failed to update');
		}
	}
})();
