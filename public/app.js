const state = { senders: [], sort: 'count' };

// Se la sessione Google è scaduta o revocata il server risponde 401: si ricarica la pagina, che propone il nuovo login.
async function api(url, options) {
  const res = await fetch(url, options);
  if (res.status === 401) {
    location.reload();
    return new Promise(() => {});
  }
  return res;
}

async function fetchStatus() {
  const res = await fetch('/api/status');
  return res.json();
}

async function init() {
  const { authenticated, email } = await fetchStatus();
  const authArea = document.getElementById('auth-area');
  if (!authenticated) {
    authArea.innerHTML = '<a href="/auth/google"><button>Collega account Google</button></a>';
    return;
  }
  authArea.textContent = email ? `Collegato come ${email}` : 'Account collegato';
  document.getElementById('analyze-area').hidden = false;
  document.getElementById('analyze-btn').addEventListener('click', startAnalysis);
  document.getElementById('sort-select').addEventListener('change', (e) => {
    state.sort = e.target.value;
    loadSenders();
  });
}

async function startAnalysis() {
  const btn = document.getElementById('analyze-btn');
  btn.disabled = true;
  document.getElementById('progress').hidden = false;

  const res = await api('/api/analyze', { method: 'POST' });
  if (!res.ok) {
    btn.disabled = false;
    return;
  }
  pollProgress();
}

async function pollProgress() {
  const res = await api('/api/analyze/status');
  const s = await res.json();
  const text = document.getElementById('progress-text');
  const fill = document.getElementById('progress-fill');

  if (s.status === 'listing') {
    text.textContent = 'Recupero elenco messaggi...';
    fill.style.width = '5%';
  } else if (s.status === 'fetching') {
    const pct = s.total ? Math.round((s.processed / s.total) * 100) : 0;
    text.textContent = `Elaborate ${s.processed} di ${s.total} email`;
    fill.style.width = `${pct}%`;
  } else if (s.status === 'done' || s.status === 'partial') {
    const skipped = s.skipped ? ` (${s.skipped} senza mittente valido, ignorate)` : '';
    text.textContent =
      s.status === 'done'
        ? `Analisi completata: ${s.processed} email elaborate${skipped}`
        : `Analisi INCOMPLETA: ${s.failed} email su ${s.total} non lette, l'elenco è parziale${skipped}. Rilancia l'analisi.`;
    fill.style.width = '100%';
    document.getElementById('analyze-btn').disabled = false;
    loadSenders();
    return;
  } else if (s.status === 'error') {
    text.textContent = `Errore durante l'analisi: ${s.error}`;
    document.getElementById('analyze-btn').disabled = false;
    return;
  }

  setTimeout(pollProgress, 1000);
}

async function loadSenders() {
  const res = await api(`/api/senders?sort=${state.sort}`);
  state.senders = await res.json();
  renderSenders();
  document.getElementById('senders-area').hidden = false;
}

function formatDate(ts) {
  return new Date(ts).toLocaleDateString('it-IT');
}

function unsubscribeCell(sender) {
  const { type, url, mailto } = sender.unsubscribe;
  if (type === 'one-click') {
    return `<span class="badge one-click">One-Click</span> <button data-action="unsubscribe" data-email="${escapeHtml(sender.email)}">Disiscrivi</button>`;
  }
  if (type === 'https') {
    return `<span class="badge https">Link manuale</span> <a href="${escapeHtml(url)}" target="_blank" rel="noopener"><button class="secondary">Apri</button></a>`;
  }
  if (type === 'mailto') {
    return `<span class="badge mailto">Email</span> <a href="${escapeHtml(mailto)}"><button class="secondary">Apri</button></a>`;
  }
  return '<span class="badge none">Nessun metodo</span>';
}

function renderSenders() {
  const tbody = document.getElementById('senders-tbody');
  tbody.innerHTML = state.senders
    .map(
      (s) => `
    <tr data-email="${escapeHtml(s.email)}">
      <td>${escapeHtml(s.name)}</td>
      <td>${escapeHtml(s.email)}</td>
      <td>${s.count}</td>
      <td>${formatDate(s.firstDate)}</td>
      <td>${formatDate(s.lastDate)}</td>
      <td>${s.inboxCount}</td>
      <td>${s.spamCount}</td>
      <td>${s.trashCount}</td>
      <td>${unsubscribeCell(s)}</td>
      <td class="row-actions">
        <button class="danger" data-action="trash" data-email="${escapeHtml(s.email)}">Sposta nel Cestino</button>
      </td>
    </tr>
  `
    )
    .join('');
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function showModal(text) {
  return new Promise((resolve) => {
    const overlay = document.getElementById('modal-overlay');
    document.getElementById('modal-text').textContent = text;
    overlay.hidden = false;

    const confirmBtn = document.getElementById('modal-confirm');
    const cancelBtn = document.getElementById('modal-cancel');

    const cleanup = (result) => {
      overlay.hidden = true;
      confirmBtn.removeEventListener('click', onConfirm);
      cancelBtn.removeEventListener('click', onCancel);
      resolve(result);
    };
    const onConfirm = () => cleanup(true);
    const onCancel = () => cleanup(false);

    confirmBtn.addEventListener('click', onConfirm);
    cancelBtn.addEventListener('click', onCancel);
  });
}

const ACTION_ERRORS = {
  analysis_in_progress: "Un'analisi è in corso: attendi che finisca.",
  operation_in_progress: "Un'altra operazione su questo mittente è già in corso.",
  sender_not_found: "Mittente non trovato nell'analisi corrente: rifai l'analisi.",
  not_one_click: 'Questo mittente non supporta la disiscrizione One-Click.',
  unsubscribe_failed: 'Disiscrizione non eseguita: la destinazione non è raggiungibile o non è ammessa.',
};

function actionError(result) {
  if (result.error === 'unsubscribe_failed' && result.message) return `Disiscrizione non eseguita: ${result.message}`;
  return ACTION_ERRORS[result.error] || `Operazione non riuscita (${result.error || 'errore sconosciuto'}).`;
}

document.addEventListener('click', async (e) => {
  const action = e.target.dataset.action;
  if (!action) return;
  const email = e.target.dataset.email;
  const sender = state.senders.find((s) => s.email === email);

  if (action === 'unsubscribe') {
    const confirmed = await showModal(
      `Verrà eseguita la disiscrizione automatica (metodo: One-Click) per ${sender.email}. Continuare?`
    );
    if (!confirmed) return;
    const res = await api(`/api/senders/${encodeURIComponent(email)}/unsubscribe`, { method: 'POST' });
    const result = await res.json();
    if (!res.ok) return alert(actionError(result));
    alert(result.success ? 'Disiscrizione completata.' : `Disiscrizione non riuscita (status ${result.status}).`);
  }

  if (action === 'trash') {
    const confirmed = await showModal(
      `Verranno spostate ${sender.count} email di ${sender.email} nel Cestino. Confermi?`
    );
    if (!confirmed) return;
    const res = await api(`/api/senders/${encodeURIComponent(email)}/trash`, { method: 'POST' });
    const result = await res.json();
    if (!res.ok) return alert(actionError(result));
    if (result.failed > 0) {
      alert(`Operazione parziale: ${result.succeeded} riuscite, ${result.failed} fallite su ${result.total}.`);
    } else {
      alert(`Spostate ${result.succeeded} email nel Cestino.`);
    }
    loadSenders();
  }
});

init();
