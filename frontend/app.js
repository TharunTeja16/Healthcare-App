(function () {
	const API_BASE = 'http://localhost:4000';
	const qs = (s, r = document) => r.querySelector(s);
	const qsa = (s, r = document) => Array.from(r.querySelectorAll(s));

	const input = qs('#medicine-input');
	const searchBtn = qsa('.btn.btn-primary').find((b) => b.textContent.trim().toLowerCase() === 'search');
	const list = qs('.pharmacy-list');
	const suggestions = qs('.suggestions');

	async function fetchJSON(url) {
		const ctrl = new AbortController();
		const id = setTimeout(() => ctrl.abort(), 10000);
		try {
			const res = await fetch(url, { signal: ctrl.signal });
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			return await res.json();
		} finally {
			clearTimeout(id);
		}
	}
})