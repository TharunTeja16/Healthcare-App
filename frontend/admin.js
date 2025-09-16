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
