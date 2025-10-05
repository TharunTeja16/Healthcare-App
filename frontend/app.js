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

	function renderMedicines(items) {
		if (!list) return;
		list.innerHTML = '';
		if (!items || items.length === 0) {
			list.innerHTML = '<li class="pharmacy-item"><div class="muted">No results</div></li>';
			return;
		}
		for (const m of items) {
			const li = document.createElement('li');
			li.className = 'pharmacy-item';
			li.innerHTML = `
				<div>
					<div class="pharmacy-name">${escapeHtml(m.brandName || m.genericName || 'Medicine')}</div>
					<div class="muted">${escapeHtml(m.genericName || '')} ${escapeHtml(m.strength || '')} ${m.form ? '• ' + escapeHtml(m.form) : ''}</div>
					<div class="stock">${m.isGeneric ? 'Generic' : 'Branded'}${typeof m.mrp === 'number' ? ' • ₹' + m.mrp : ''}</div>
				</div>
				<div class="actions">
					<button class="btn btn-secondary" type="button" disabled title="Pharmacy selection not implemented in static UI">Reserve</button>
				</div>
			`;
			list.appendChild(li);
		}
	}

	function renderEquivalents(base, items) {
		if (!suggestions) return;
		suggestions.innerHTML = '';
		const top = (items || []).slice(0, 6);
		for (const e of top) {
			const pill = document.createElement('span');
			pill.className = 'pill';
			pill.textContent = `${e.brandName || e.genericName}${e.strength ? ' ' + e.strength : ''}`;
			pill.tabIndex = 0;
			pill.addEventListener('click', () => {
				if (input) input.value = pill.textContent;
				doSearch();
			});
			suggestions.appendChild(pill);
		}
		if (suggestions.children.length === 0) {
			const pill = document.createElement('span');
			pill.className = 'pill pill-outline';
			pill.textContent = 'No equivalents found';
			suggestions.appendChild(pill);
		}
	}

	async function doSearch() {
		const term = (input?.value || '').trim();
		if (!term) { renderMedicines([]); renderEquivalents(null, []); return; }
		try {
			const [{ results }, eq] = await Promise.all([
				fetchJSON(`${API_BASE}/api/medicines?q=${encodeURIComponent(term)}`),
				fetchJSON(`${API_BASE}/api/medicines/equivalents?q=${encodeURIComponent(term)}`)
			]);
			renderMedicines(results || []);
			renderEquivalents(eq?.base || null, eq?.results || []);
		} catch (e) {
			renderMedicines([]);
			renderEquivalents(null, []);
		}
	}

	function escapeHtml(str) {
		return String(str || '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
	}

	searchBtn?.addEventListener('click', doSearch);
	input?.addEventListener('keydown', (e) => { if (e.key === 'Enter') doSearch(); });

	// -------- Reservation demo (no backend) --------
	function ensureModal() {
		let modal = qs('#reserve-modal');
		if (modal) return modal;
		modal = document.createElement('div');
		modal.id = 'reserve-modal';
		modal.className = 'modal hidden';
		modal.innerHTML = `
			<div class="modal-backdrop"></div>
			<div class="modal-panel" role="dialog" aria-modal="true" aria-labelledby="reserve-title">
				<h3 id="reserve-title">Reserve for pickup</h3>
				<p class="muted small">Demo only. This does not place a real order.</p>
				<label class="modal-row">Pickup time<select id="pickup-time">
					<option>ASAP</option>
					<option>Today 5:30 PM</option>
					<option>Today 7:00 PM</option>
					<option>Tomorrow 9:00 AM</option>
				</select></label>
				<div class="actions">
					<button class="btn btn-secondary" id="modal-cancel" type="button">Cancel</button>
					<button class="btn btn-primary" id="modal-confirm" type="button">Confirm</button>
				</div>
			</div>
		`;
		document.body.appendChild(modal);
		return modal;
	}

	function openModal(context) {
		const modal = ensureModal();
		modal.dataset.context = JSON.stringify(context || {});
		modal.classList.remove('hidden');
	}
	function closeModal() {
		qs('#reserve-modal')?.classList.add('hidden');
	}

	function ensureToast() {
		let holder = qs('#toast-holder');
		if (holder) return holder;
		holder = document.createElement('div');
		holder.id = 'toast-holder';
		holder.className = 'toast-holder';
		document.body.appendChild(holder);
		return holder;
	}
	function toast(message) {
		const holder = ensureToast();
		const el = document.createElement('div');
		el.className = 'toast';
		el.textContent = message;
		holder.appendChild(el);
		setTimeout(() => {
			el.classList.add('hide');
			setTimeout(() => el.remove(), 200);
		}, 1600);
	}

	// Attach reservation buttons
	qsa('.pharmacy-item .btn-secondary').forEach((btn) => {
		btn.addEventListener('click', (e) => {
			const item = e.currentTarget.closest('.pharmacy-item');
			const name = qs('.pharmacy-name', item)?.textContent?.trim();
			const stock = qs('.stock', item)?.textContent?.trim();
			openModal({ pharmacy: name, stock });
		});
	});

	// Modal delegation
	document.addEventListener('click', (e) => {
		if (e.target?.id === 'modal-cancel' || e.target?.classList?.contains('modal-backdrop')) {
			closeModal();
		}
		if (e.target?.id === 'modal-confirm') {
			const ctx = JSON.parse(qs('#reserve-modal')?.dataset.context || '{}');
			closeModal();
			toast(`Reserved at ${ctx.pharmacy || 'pharmacy'}`);
		}
	});
})();

// Simple client-side interactivity for the static prototype

(function () {
	// Utility: qs and qsa
	const qs = (sel, root = document) => root.querySelector(sel);
	const qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));

	// Populate search input when clicking on generic suggestion pills
	qsa('.pill').forEach((pill) => {
		pill.addEventListener('click', () => {
			const input = qs('#medicine-input');
			if (input) {
				input.value = pill.textContent.replace(/\s*\(Generic\)$/, '');
				filterPharmacies();
			}
		});
	});

	// Filter pharmacies list based on medicine input text (simple contains match)
	function filterPharmacies() {
		const term = (qs('#medicine-input')?.value || '').trim().toLowerCase();
		const items = qsa('.pharmacy-item');
		items.forEach((li) => {
			const stockText = qs('.stock', li)?.textContent?.toLowerCase() || '';
			li.style.display = term.length === 0 || stockText.includes(term) ? '' : 'none';
		});
	}

	qs('#medicine-input')?.addEventListener('input', filterPharmacies);

	// Reservation modal
	function ensureModal() {
		let modal = qs('#reserve-modal');
		if (modal) return modal;
		modal = document.createElement('div');
		modal.id = 'reserve-modal';
		modal.className = 'modal hidden';
		modal.innerHTML = `
			<div class="modal-backdrop"></div>
			<div class="modal-panel">
				<h3>Reserve for pickup</h3>
				<p class="muted small">Demo only. No backend call yet.</p>
				<label class="modal-row">Pickup time<select id="pickup-time">
					<option>ASAP</option>
					<option>Today 5:30 PM</option>
					<option>Today 7:00 PM</option>
					<option>Tomorrow 9:00 AM</option>
				</select></label>
				<div class="actions">
					<button class="btn btn-secondary" id="modal-cancel">Cancel</button>
					<button class="btn btn-primary" id="modal-confirm">Confirm</button>
				</div>
			</div>
		`;
		document.body.appendChild(modal);
		return modal;
	}

	function openModal(context) {
		const modal = ensureModal();
		modal.dataset.context = JSON.stringify(context || {});
		modal.classList.remove('hidden');
	}
	function closeModal() {
		qs('#reserve-modal')?.classList.add('hidden');
	}

	// Attach reservation button handlers
	qsa('.pharmacy-item .btn-secondary').forEach((btn) => {
		btn.addEventListener('click', (e) => {
			const item = e.currentTarget.closest('.pharmacy-item');
			const name = qs('.pharmacy-name', item)?.textContent?.trim();
			const stock = qs('.stock', item)?.textContent?.trim();
			openModal({ pharmacy: name, stock });
		});
	});

	// Modal events (delegated)
	document.addEventListener('click', (e) => {
		if (e.target.matches('#modal-cancel') || e.target.matches('.modal-backdrop')) {
			closeModal();
		}
		if (e.target.matches('#modal-confirm')) {
			const ctx = JSON.parse(qs('#reserve-modal')?.dataset.context || '{}');
			closeModal();
			toast(`Reserved at ${ctx.pharmacy || 'pharmacy'}`);
		}
	});

	// Expired medicine form: show toast
	qsa('form').forEach((form) => {
		if (form.closest('#recycle')) {
			form.addEventListener('submit', (e) => {
				e.preventDefault();
				toast('Expired medicine logged. Thank you!');
			});
		}
	});

	// Toast system
	function ensureToast() {
		let holder = qs('#toast-holder');
		if (holder) return holder;
		holder = document.createElement('div');
		holder.id = 'toast-holder';
		holder.className = 'toast-holder';
		document.body.appendChild(holder);
		return holder;
	}
	function toast(message) {
		const holder = ensureToast();
		const el = document.createElement('div');
		el.className = 'toast';
		el.textContent = message;
		holder.appendChild(el);
		setTimeout(() => {
			el.classList.add('hide');
			setTimeout(() => el.remove(), 200);
		}, 1800);
	}
})();