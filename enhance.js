(() => {
'use strict';
const $ = (id) => document.getElementById(id), q = (s, r = document) => r.querySelector(s), qa = (s, r = document) => [...r.querySelectorAll(s)];
const el = (t, c, h) => { const e = document.createElement(t); if (c) e.className = c; if (h) e.innerHTML = h; return e; };
const toast = (m) => window.showToast && window.showToast(m);
const KEY = 'wenhash-prefs-v3';
const D = { font: 'inter', size: 'm', lang: 'en', assist: true, popup: true, loader: true, shield: true, side: 'r', y: .62 };
let P = { ...D };
try { Object.assign(P, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch {}
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(P)); } catch {} };
const FONTS = { inter: 'Inter', poppins: 'Poppins', nunito: 'Nunito', space: '"Space Grotesk"', mono: '"JetBrains Mono"', serif: 'Merriweather', access: '"Atkinson Hyperlegible"' };
const ZOOM = { s: .92, m: 1, l: 1.12, xl: 1.25 };

/* ---------- Languages: English key -> [Filipino, Español] ---------- */
const T = {
  'Converter': ['Converter', 'Convertidor'], 'Reverse / Verify': ['I-reverse / I-verify', 'Revertir / Verificar'], 'Reverse': ['I-reverse', 'Revertir'],
  'How it works': ['Paano gumagana', 'Cómo funciona'], 'Purpose & limits': ['Layunin at limitasyon', 'Propósito y límites'], 'About WenHash': ['Tungkol sa WenHash', 'Acerca de WenHash'],
  'Settings': ['Settings', 'Ajustes'], 'WORKSPACE': ['WORKSPACE', 'ESPACIO'], 'LEARN': ['MATUTO', 'APRENDER'], 'Learn': ['Matuto', 'Aprender'],
  'LOCAL PROCESSING': ['LOKAL NA PROSESO', 'PROCESO LOCAL'], 'Local by design': ['Lokal ang proseso', 'Local por diseño'],
  'Enter your message': ['Ilagay ang mensahe mo', 'Escribe tu mensaje'], 'Your output': ['Resulta mo', 'Tu resultado'], 'Clear text ×': ['Burahin ×', 'Borrar ×'],
  'Fast digest': ['Mabilis na digest', 'Resumen rápido'], 'Hash + salt': ['Hash + salt', 'Hash + sal'], 'Verify only': ['Pang-verify lang', 'Solo verificar'],
  'Encrypt + salt': ['I-encrypt + salt', 'Cifrar + sal'], 'Can decrypt': ['Pwedeng i-decrypt', 'Se puede descifrar'], 'Reversible encoding': ['Pwedeng ibalik', 'Codificación reversible'],
  'Copy output': ['Kopyahin ang output', 'Copiar salida'], 'Copy record': ['Kopyahin ang record', 'Copiar registro'], 'Export': ['I-export', 'Exportar'], 'READY': ['HANDA', 'LISTO'],
  'Unlock & decrypt': ['I-unlock at i-decrypt', 'Desbloquear y descifrar'], 'Decode to text': ['I-decode sa text', 'Decodificar a texto'], 'Verify candidate': ['I-verify ang candidate', 'Verificar candidato'],
  'Clear fields': ['Burahin ang fields', 'Limpiar campos'], 'Appearance': ['Itsura', 'Apariencia'], 'Theme mode': ['Tema', 'Modo de tema'], 'Dark': ['Madilim', 'Oscuro'], 'Light': ['Maliwanag', 'Claro'],
  'Interface density': ['Dami ng espasyo', 'Densidad'], 'Comfortable': ['Maluwag', 'Cómodo'], 'Compact': ['Siksik', 'Compacto'], 'Reset preferences': ['I-reset ang preferences', 'Restablecer'],
  'Your settings stay local': ['Lokal lang ang settings mo', 'Tus ajustes son locales'], 'Show': ['Ipakita', 'Mostrar'], 'Hide': ['Itago', 'Ocultar'],
  'Font style': ['Estilo ng font', 'Tipo de letra'], 'Choose the typeface used across the app.': ['Piliin ang font na gagamitin sa buong app.', 'Elige la fuente de toda la app.'],
  'Text size': ['Laki ng text', 'Tamaño de texto'], 'Make text easier to read on small screens.': ['Gawing mas madaling basahin sa maliit na screen.', 'Facilita la lectura en pantallas pequeñas.'],
  'Language': ['Wika', 'Idioma'], 'Language for menus and buttons.': ['Wika ng mga menu at button.', 'Idioma de menús y botones.'],
  'Assistive Touch': ['Assistive Touch', 'Toque asistivo'], 'Floating logo button that stays on every screen.': ['Lumulutang na logo na nasa lahat ng screen.', 'Botón flotante con logo en todas las pantallas.'],
  'Pop-up results': ['Pop-up na resulta', 'Resultados emergentes'], 'Show a pop-up after each action.': ['Magpakita ng pop-up pagkatapos ng bawat action.', 'Muestra una ventana tras cada acción.'],
  'Loading effects': ['Loading effects', 'Efectos de carga'], 'Show a loading animation while keys are derived.': ['Magpakita ng loading habang ginagawa ang key.', 'Animación mientras se deriva la clave.'],
  'Privacy shield': ['Privacy shield', 'Escudo de privacidad'], 'Blur the screen when you leave the tab and clear passwords after inactivity.': ['I-blur ang screen kapag umalis sa tab at burahin ang password kapag walang galaw.', 'Difumina la pantalla al salir y borra contraseñas tras inactividad.'],
  'Toggle theme': ['Palitan ang tema', 'Cambiar tema'], 'Back': ['Bumalik', 'Atrás'], 'Exit': ['Lumabas', 'Salir'], 'Cancel': ['Kanselahin', 'Cancelar'], 'OK': ['OK', 'OK'],
  'Done': ['Tapos na', 'Listo'], 'Something went wrong': ['May problema', 'Algo salió mal'], 'Exit WenHash?': ['Lumabas sa WenHash?', '¿Salir de WenHash?'],
  'This clears all text, passwords and results from the screen and hides the floating button.': ['Buburahin nito ang lahat ng text, password at resulta, at itatago ang lumulutang na button.', 'Borra textos, contraseñas y resultados y oculta el botón flotante.'],
  'Session closed': ['Sarado na ang session', 'Sesión cerrada'], 'Everything on screen was cleared.': ['Nabura na ang lahat sa screen.', 'Todo se borró de la pantalla.'], 'Reopen WenHash': ['Buksan ulit ang WenHash', 'Reabrir WenHash'],
  'Hardening password…': ['Pinapatibay ang password…', 'Reforzando contraseña…'], 'Deriving AES key…': ['Ginagawa ang AES key…', 'Derivando clave AES…'], 'Finalizing…': ['Tinatapos na…', 'Finalizando…'],
  'Create a strong passphrase (12+ characters)': ['Gumawa ng matibay na passphrase (12+ characters)', 'Crea una frase segura (12+ caracteres)'],
  'Enter the original encryption password': ['Ilagay ang orihinal na password', 'Introduce la contraseña original']
};
const li = () => P.lang === 'fil' ? 0 : P.lang === 'es' ? 1 : -1;
const seen = new WeakMap();
function translate() {
  const i = li(), w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n; (n = w.nextNode());) {
    if (/^(SCRIPT|STYLE|TEXTAREA|PRE)$/.test(n.parentNode.nodeName)) continue;
    let r = seen.get(n);
    if (!r || n.data !== r.shown) r = { orig: n.data, shown: n.data };
    const k = r.orig.trim(), t = i >= 0 && T[k] ? r.orig.replace(k, () => T[k][i]) : r.orig;
    n.data = t; r.shown = t; seen.set(n, r);
  }
  qa('[placeholder]').forEach((e) => { if (e._ph === undefined) e._ph = e.placeholder; const t = i >= 0 && T[e._ph]; e.placeholder = t ? t[i] : e._ph; });
  document.documentElement.lang = P.lang;
}

/* ---------- Popup ---------- */
let modalEl;
function closeModal() { if (modalEl) { modalEl.remove(); modalEl = null; } }
function modal({ ok = true, title, body, actions = [{ label: 'OK', primary: true }] }) {
  closeModal();
  const o = modalEl = el('div', 'wh-modal', `<div class="wh-dialog ${ok ? 'ok' : 'bad'}" role="dialog" aria-modal="true"><div class="wh-ico">${ok ? '✓' : '!'}</div><h3></h3><p></p><div class="wh-acts"></div></div>`);
  q('h3', o).textContent = title; q('p', o).textContent = body;
  actions.forEach((a) => { const b = el('button', a.primary ? 'p' : ''); b.type = 'button'; b.textContent = a.label; b.onclick = () => { closeModal(); a.fn && a.fn(); }; q('.wh-acts', o).append(b); });
  o.addEventListener('click', (e) => { if (e.target === o) closeModal(); });
  document.body.append(o); translate(); q('.wh-acts button:last-child', o).focus();
}
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closeModal(); closeMenu(); } });

/* ---------- Boot loader ---------- */
const mark = q('.brand-mark');
const boot = el('div', 'wh-boot', '<div></div><strong style="letter-spacing:.2em">WENHASH</strong><small>LOCAL CRYPTO LAB</small><div class="wh-bar"><i></i></div>');
boot.firstChild.append(mark.cloneNode(true)); document.body.append(boot);
const t0 = Date.now();
const bootDone = () => setTimeout(() => { boot.classList.add('out'); setTimeout(() => boot.remove(), 500); }, Math.max(0, 900 - (Date.now() - t0)));
document.readyState === 'complete' ? bootDone() : addEventListener('load', bootDone);

/* ---------- Busy overlay + result popup ---------- */
const BUSY = ['Hardening password…', 'Deriving AES key…', 'Finalizing…'];
const busy = el('div', 'wh-busy', '<div class="wh-busy-card" role="alert"><div class="wh-ring"></div><strong></strong><div class="wh-bar"><i></i></div></div>'); busy.hidden = true; document.body.append(busy);
let msgTimer;
const MAP = { convertBtn: 'convertMessage', decryptBtn: 'decryptMessage', verifyBtn: 'verifyMessage', decodeBtn: 'decodeMessage' };
function startBusy() {
  let n = 0; const s = q('strong', busy);
  const tick = () => { s.textContent = BUSY[Math.min(n++, 2)]; translate(); };
  busy.hidden = false; tick(); msgTimer = setInterval(tick, 1100);
}
function finish(b) {
  busy.hidden = true; clearInterval(msgTimer); translate();
  const n = $(MAP[b.id]); if (!P.popup || !n || n.hidden) return;
  const ok = !n.classList.contains('error'), actions = [{ label: 'OK', primary: true }];
  if (ok && b.id === 'convertBtn' && !$('copyRecord').disabled) actions.unshift({ label: 'Copy record', fn: () => $('copyRecord').click() });
  modal({ ok, title: ok ? 'Done' : 'Something went wrong', body: n.textContent, actions });
}
document.addEventListener('click', (e) => {
  const b = e.target.closest('button'); if (!b || !MAP[b.id] || b.disabled) return;
  const start = Date.now();
  setTimeout(() => {
    if (!b.disabled) return finish(b);
    if (P.loader) startBusy();
    const mo = new MutationObserver(() => { if (b.disabled) return; mo.disconnect(); setTimeout(() => finish(b), Math.max(0, 700 - (Date.now() - start))); });
    mo.observe(b, { attributes: true, attributeFilter: ['disabled'] });
  }, 60);
}, true);

/* ---------- Navigation: bottom bar + history so Back stays inside the app ---------- */
const bn = el('nav', 'wh-bottomnav', [['converter', '⌘', 'Converter'], ['reverse', '⤺', 'Reverse'], ['how', '◉', 'Learn'], ['settings', '⚙', 'Settings']].map(([p, i, l]) => `<button type="button" data-go="${p}"><b>${i}</b><span>${l}</span></button>`).join(''));
document.body.append(bn);
const navBtn = (p) => q(`#sidebar .nav-item[data-page="${p}"]`);
const go = (p) => { closeMenu(); navBtn(p) && navBtn(p).click(); };
bn.addEventListener('click', (e) => { const b = e.target.closest('[data-go]'); if (b) go(b.dataset.go); });
let last = 'converter';
history.replaceState({ p: last }, '');
new MutationObserver(() => {
  const cur = q('#sidebar .nav-item.active') && q('#sidebar .nav-item.active').dataset.page; if (!cur) return;
  qa('[data-go]', bn).forEach((b) => b.classList.toggle('on', b.dataset.go === cur));
  if (cur !== last) { last = cur; history.pushState({ p: cur }, ''); translate(); }
}).observe($('sidebar'), { subtree: true, attributes: true, attributeFilter: ['class'] });
addEventListener('popstate', (e) => { const p = (e.state && e.state.p) || 'converter'; last = p; navBtn(p) && navBtn(p).click(); });
qa('[data-go]', bn)[0].classList.add('on');

/* ---------- Assistive Touch ---------- */
const assist = el('div', 'wh-assist idle', '<button class="wh-fab" type="button" aria-label="WenHash menu" aria-expanded="false"></button><div class="wh-menu" hidden></div>');
const fab = q('.wh-fab', assist), menu = q('.wh-menu', assist);
fab.append(mark.cloneNode(true));
const ACTS = [['⌘', 'Converter', () => go('converter')], ['⤺', 'Reverse / Verify', () => go('reverse')], ['⚙', 'Settings', () => go('settings')],
  ['◐', 'Toggle theme', () => $('quickThemeToggle').click()], ['▢', 'Copy output', () => $('copyOutput').disabled ? toast('Nothing to copy yet.') : $('copyOutput').click()],
  ['←', 'Back', () => history.state && history.state.p !== 'converter' ? history.back() : toast('You are on the first screen.')], ['⏻', 'Exit', () => askExit(), 'x']];
ACTS.forEach(([i, l, fn, c]) => { const b = el('button', c || '', `<span>${i}</span><span>${l}</span>`); b.type = 'button'; b.onclick = () => { closeMenu(); fn(); }; menu.append(b); });
document.body.append(assist);
let idleFab;
const wake = () => { assist.classList.remove('idle'); clearTimeout(idleFab); idleFab = setTimeout(() => assist.classList.add('idle'), 3000); };
function closeMenu() { menu.hidden = true; assist.classList.remove('open'); fab.setAttribute('aria-expanded', 'false'); }
function place() {
  const w = fab.offsetWidth || 56, x = P.side === 'l' ? 8 : innerWidth - w - 8, y = Math.min(Math.max(P.y * innerHeight, 70), innerHeight - w - 96);
  assist.style.left = x + 'px'; assist.style.top = y + 'px'; assist.dataset.side = P.side; assist.dataset.v = y > innerHeight / 2 ? 'up' : 'down';
}
let drag;
fab.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY, l: assist.offsetLeft, t: assist.offsetTop, moved: false }; fab.setPointerCapture(e.pointerId); wake(); });
fab.addEventListener('pointermove', (e) => {
  if (!drag) return; const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
  if (!drag.moved && Math.hypot(dx, dy) < 6) return;
  drag.moved = true; closeMenu(); assist.classList.add('drag');
  assist.style.left = Math.min(Math.max(drag.l + dx, 0), innerWidth - fab.offsetWidth) + 'px';
  assist.style.top = Math.min(Math.max(drag.t + dy, 0), innerHeight - fab.offsetHeight) + 'px';
});
fab.addEventListener('pointerup', () => {
  if (!drag) return; const d = drag; drag = null; assist.classList.remove('drag');
  if (d.moved) { P.side = assist.offsetLeft + fab.offsetWidth / 2 < innerWidth / 2 ? 'l' : 'r'; P.y = assist.offsetTop / innerHeight; save(); place(); }
  else { const open = menu.hidden; place(); menu.hidden = !open; assist.classList.toggle('open', open); fab.setAttribute('aria-expanded', String(open)); }
  wake();
});
document.addEventListener('pointerdown', (e) => { if (!assist.contains(e.target)) closeMenu(); });
addEventListener('resize', place);

/* ---------- Exit + lock screen ---------- */
const lock = el('div', 'wh-lock', '<div></div><h2 style="margin:0">Session closed</h2><p>Everything on screen was cleared.</p><button class="primary-button" type="button" style="max-width:260px"><span>Reopen WenHash</span></button>');
lock.firstChild.append(mark.cloneNode(true)); lock.hidden = true; document.body.append(lock);
q('button', lock).onclick = () => { lock.hidden = true; assist.hidden = !P.assist; place(); };
function askExit() { modal({ ok: false, title: 'Exit WenHash?', body: 'This clears all text, passwords and results from the screen and hides the floating button.', actions: [{ label: 'Cancel' }, { label: 'Exit', primary: true, fn: doExit }] }); }
function doExit() { clearSensitive(true); assist.hidden = true; lock.hidden = false; translate(); try { window.close(); } catch {} }

/* ---------- Privacy shield ---------- */
function clearSensitive(all) {
  ['encryptPassword', 'decryptPassword', 'decryptedOutput'].forEach((id) => { const e = $(id); if (e) e.value = ''; });
  if ($('copyDecrypted')) $('copyDecrypted').disabled = true;
  if (all) { ['clearText', 'clearDecode', 'clearDecrypt'].forEach((id) => $(id) && $(id).click()); ['candidateText', 'hashRecordInput'].forEach((id) => { $(id).value = ''; }); }
}
let idleT, hideT;
const bump = () => { clearTimeout(idleT); if (P.shield) idleT = setTimeout(() => { clearSensitive(false); toast('Passwords cleared after inactivity.'); }, 120000); };
['pointerdown', 'keydown', 'input'].forEach((ev) => addEventListener(ev, bump, { passive: true }));
document.addEventListener('visibilitychange', () => {
  document.body.classList.toggle('wh-blur', P.shield && document.hidden);
  clearTimeout(hideT); if (P.shield && document.hidden) hideT = setTimeout(() => clearSensitive(false), 60000);
});
// Stop browsers/password managers/extensions from autofilling or remembering these fields.
qa('input[type=password],input[type=text],textarea').forEach((e) => {
  e.setAttribute('autocomplete', e.type === 'password' ? 'new-password' : 'off');
  ['autocapitalize', 'autocorrect'].forEach((a) => e.setAttribute(a, 'off'));
  e.spellcheck = false; e.setAttribute('data-lpignore', 'true'); e.setAttribute('data-1p-ignore', ''); e.setAttribute('data-bwignore', 'true');
});

/* ---------- Settings wiring ---------- */
function apply() {
  const r = document.documentElement.style;
  r.setProperty('--wh-font', `${FONTS[P.font] || 'Inter'}, Inter, system-ui, sans-serif`); r.setProperty('--wh-zoom', ZOOM[P.size] || 1);
  $('fontFamily').value = P.font; $('langSelect').value = P.lang;
  qa('[data-fsize]').forEach((b) => b.classList.toggle('active', b.dataset.fsize === P.size));
  [['optAssist', 'assist'], ['optPopup', 'popup'], ['optLoader', 'loader'], ['optShield', 'shield']].forEach(([id, k]) => { $(id).checked = P[k]; });
  assist.hidden = !P.assist || !lock.hidden; place(); translate();
}
$('fontFamily').onchange = (e) => { P.font = e.target.value; save(); apply(); };
$('langSelect').onchange = (e) => { P.lang = e.target.value; save(); apply(); };
qa('[data-fsize]').forEach((b) => b.onclick = () => { P.size = b.dataset.fsize; save(); apply(); });
[['optAssist', 'assist'], ['optPopup', 'popup'], ['optLoader', 'loader'], ['optShield', 'shield']].forEach(([id, k]) => $(id).onchange = (e) => { P[k] = e.target.checked; save(); apply(); bump(); });
$('resetSettings').addEventListener('click', () => { P = { ...D }; save(); apply(); });
apply(); wake(); bump();
})();
