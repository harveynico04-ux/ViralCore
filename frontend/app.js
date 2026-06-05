// ═══════════════════════════════════════════
//  API URL — cambiá esta línea para producción
//  Local: 'http://127.0.0.1:5000/api'
//  Render: 'https://viralcore.onrender.com/api'
// ═══════════════════════════════════════════
const API = 'https://viralcore.onrender.com/api';

// ─── Estado global ──────────────────────────
let currentPathogen = null;
let allPathogens    = [];
let editingId       = null;  // null = nuevo, string = editando
let isEditMode      = false; // flag explícito para evitar ambigüedades
let topView         = 'landing';
let medState        = 'search'; // 'search' | 'detail'
let famState        = 'search'; // 'search' | 'detail'

// ─── EPP disponibles para el formulario ─────
const EPP_PRESETS = [
    { id: 'manos',        label: 'Lavado de manos',      icon: '🧼' },
    { id: 'guantes',      label: 'Guantes',               icon: '🧤' },
    { id: 'camisolin',    label: 'Camisolín / Bata',      icon: '🥼' },
    { id: 'barbijo-qx',   label: 'Barbijo Quirúrgico',    icon: '😷' },
    { id: 'n95',          label: 'Barbijo N95',            icon: '🛡️' },
    { id: 'ocular',       label: 'Protección Ocular',     icon: '🥽' },
    { id: 'gorro',        label: 'Gorro',                  icon: '🧢' },
    { id: 'calzado',      label: 'Cubre Calzado',         icon: '🦺' },
    { id: 'doble-guante', label: 'Doble Par de Guantes',  icon: '🤲' },
];

// ─── Íconos por tipo de aislamiento ─────────
const ISO_ICON = { verde: '💧', azul: '🌬️', amarillo: '⚠️', gris: '🏥' };

// ─── Mapeo de ícono para EPP ─────────────────
const EPP_ICON_MAP = {
    'manos':      '🧼', 'lavado':   '🧼',
    'guantes':    '🧤', 'guante':   '🧤',
    'camisolín':  '🥼', 'bata':     '🥼', 'camisolin': '🥼',
    'quirúrgico': '😷', 'quirurgico':'😷', 'barbijo':   '😷',
    'n95':        '🛡️',
    'ocular':     '🥽', 'antiparras':'🥽',
    'gorro':      '🧢',
    'calzado':    '🦺', 'botas':    '🦺',
    'doble':      '🤲',
};

// ─── Utilidades ──────────────────────────────
const qs   = (s) => document.querySelector(s);
const show  = (el) => el?.classList.remove('hidden');
const hide  = (el) => el?.classList.add('hidden');

function debounce(fn, ms) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

function getColor(colorStr = '') {
    const c = colorStr.toLowerCase();
    if (c.includes('verde'))   return 'verde';
    if (c.includes('azul'))    return 'azul';
    if (c.includes('amarill')) return 'amarillo';
    return 'gris';
}

function getIsoAbbr(nombre = '') {
    const n = nombre.toLowerCase();
    if (n.includes('contacto'))            return 'C';
    if (n.includes('aéreo') || n.includes('aereo')) return 'A';
    if (n.includes('gotas'))               return 'G';
    if (n.includes('estándar') || n.includes('estandar')) return 'E';
    return nombre.charAt(0).toUpperCase() || '?';
}

function getEppIcon(epp) {
    const lower = epp.toLowerCase();
    for (const [key, icon] of Object.entries(EPP_ICON_MAP)) {
        if (lower.includes(key)) return icon;
    }
    return '🏥';
}

// ─── App Bar ──────────────────────────────────
function setAppBar(title, showBack = false, rightHtml = '') {
    qs('#app-bar-title').textContent = title;
    showBack ? show(qs('#btn-back')) : hide(qs('#btn-back'));
    qs('#app-bar-right').innerHTML = rightHtml;
}

// ─── Navegación principal ─────────────────────
function goTo(view) {
    document.querySelectorAll('.view').forEach(v => {
        v.classList.remove('active');
        v.classList.add('hidden');
    });
    const target = qs(`#view-${view}`);
    target.classList.remove('hidden');
    target.classList.add('active');
    topView = view;
    window.scrollTo(0, 0);

    if (view === 'landing') {
        setAppBar('ViralCore', false);
        qs('header.app-bar').classList.add('bar-hidden');
    } else if (view === 'medical') {
        qs('header.app-bar').classList.remove('bar-hidden');
        setAppBar('Buscar Patógeno', true);
        resetMed();
    } else if (view === 'family') {
        qs('header.app-bar').classList.remove('bar-hidden');
        setAppBar('Para la Familia', true);
        resetFam();
    } else if (view === 'admin') {
        qs('header.app-bar').classList.remove('bar-hidden');
        setAppBar('Panel de Control', true);
        fetchAndRender('admin');
        buildEppChecklist([]);
    }
}

function handleBack() {
    if (topView === 'medical' && medState === 'detail') { closeMedDetail(); return; }
    if (topView === 'family'  && famState === 'detail') { closeFamDetail(); return; }
    goTo('landing');
}

function closeOnOverlay(e, id) {
    if (e.target.id === id) hide(qs(`#${id}`));
}

// ─── API fetch central ────────────────────────
async function fetchAndRender(ctx, query = '') {
    try {
        const res  = await fetch(`${API}/patogenos?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        allPathogens = data;
        if (ctx === 'medical') renderMedResults(data);
        if (ctx === 'family')  renderFamResults(data);
        if (ctx === 'admin')   renderAdminList(data);
    } catch (e) {
        console.error('Error API:', e);
    }
}

// ════════════════════════════════════════════
//  VISTA MÉDICO
// ════════════════════════════════════════════
function resetMed() {
    medState = 'search';
    show(qs('#med-search-state'));
    hide(qs('#med-detail-state'));
    show(qs('#med-hint'));
    hide(qs('#med-results'));
    hide(qs('#med-empty'));
    qs('#search-med').value = '';
    hide(qs('#clear-med'));
}

qs('#search-med').addEventListener('input', debounce(e => {
    const q = e.target.value.trim();
    q ? show(qs('#clear-med')) : hide(qs('#clear-med'));
    if (!q) { show(qs('#med-hint')); hide(qs('#med-results')); hide(qs('#med-empty')); return; }
    hide(qs('#med-hint'));
    fetchAndRender('medical', q);
}, 280));

function clearSearch(ctx) {
    qs(`#search-${ctx}`).value = '';
    hide(qs(`#clear-${ctx}`));
    show(qs(`#${ctx}-hint`));
    hide(qs(`#${ctx}-results`));
    hide(qs(`#${ctx}-empty`));
}

function renderMedResults(data) {
    const list  = qs('#med-results');
    const empty = qs('#med-empty');
    if (!data.length) { hide(list); show(empty); return; }
    show(list); hide(empty); hide(qs('#med-hint'));
    list.innerHTML = data.map((item, i) => {
        const color = getColor(item.tipo_aislamiento?.color_cartel);
        const abbr  = getIsoAbbr(item.tipo_aislamiento?.nombre);
        return `
        <div class="result-card" style="animation-delay:${i * 35}ms" onclick="openMedDetail('${item._id}')">
            <div class="rc-icon ${color}">${abbr}</div>
            <div class="rc-info">
                <div class="rc-name">${item.nombre_cientifico}</div>
                <span class="badge-pill ${color}">${item.tipo_aislamiento?.nombre || 'Estándar'}</span>
            </div>
            <span class="rc-arrow">›</span>
        </div>`;
    }).join('');
}

function openMedDetail(id) {
    const item = allPathogens.find(p => p._id === id);
    if (!item) return;
    currentPathogen = item;
    medState = 'detail';

    const color = getColor(item.tipo_aislamiento?.color_cartel);

    // Hero
    qs('#med-hero').className  = `detail-hero ${color}`;
    qs('#med-hero-chip').textContent = item.tipo_aislamiento?.nombre || '';
    qs('#med-hero-name').textContent = item.nombre_cientifico;
    const sub = item.clasificacion
        ? [item.clasificacion.grupo_principal, item.clasificacion.subcategoria].filter(Boolean).join(' · ')
        : '';
    qs('#med-hero-sub').textContent = sub;

    // EPP Chips (sin ícono emoji)
    qs('#med-epp').innerHTML = (item.epp_requerido || []).map(epp => `
        <div class="epp-chip">
            <span>${epp}</span>
        </div>`).join('') || '<p style="padding:.5rem;color:var(--text-3)">Sin datos</p>';

    // Mecanismos
    qs('#med-mec').innerHTML = (item.mecanismos_infeccion || []).map(m => `
        <div class="mec-item">
            <span class="mec-dot">●</span>
            <span>${m}</span>
        </div>`).join('') || '<p class="info-text" style="padding:.5rem">Sin datos</p>';

    // Textos
    qs('#med-sala').textContent     = item.disposicion_sala               || 'Sin especificaciones.';
    qs('#med-residuos').textContent = item.manejo_residuos_ropa?.basura   || 'Sin especificaciones.';

    hide(qs('#med-search-state'));
    show(qs('#med-detail-state'));
    setAppBar(item.nombre_cientifico.split(' ').slice(0,2).join(' '), true);
    window.scrollTo(0, 0);
}

function closeMedDetail() {
    medState = 'search';
    hide(qs('#med-detail-state'));
    show(qs('#med-search-state'));
    setAppBar('Buscar Patógeno', true);
}

// ─── Modal de Advertencias ────────────────────
function openCriticalModal() {
    if (!currentPathogen) return;
    const iso = currentPathogen.tipo_aislamiento || {};
    qs('#modal-desc').textContent = iso.descripcion_al_clic || '';
    qs('#modal-warnings').innerHTML = (iso.advertencias_criticas || []).map(w => `
        <div class="warn-card">
            <span class="warn-card-icon">⚠️</span>
            <span>${w}</span>
        </div>`).join('');
    show(qs('#modal-critical'));
}

// ════════════════════════════════════════════
//  VISTA FAMILIA
// ════════════════════════════════════════════
function resetFam() {
    famState = 'search';
    show(qs('#fam-search-state'));
    hide(qs('#fam-detail-state'));
    show(qs('#fam-hint'));
    hide(qs('#fam-results'));
    hide(qs('#fam-empty'));
    qs('#search-fam').value = '';
    hide(qs('#clear-fam'));
}

qs('#search-fam').addEventListener('input', debounce(e => {
    const q = e.target.value.trim();
    q ? show(qs('#clear-fam')) : hide(qs('#clear-fam'));
    if (!q) { show(qs('#fam-hint')); hide(qs('#fam-results')); hide(qs('#fam-empty')); return; }
    hide(qs('#fam-hint'));
    fetchAndRender('family', q);
}, 280));

function renderFamResults(data) {
    const list  = qs('#fam-results');
    const empty = qs('#fam-empty');
    if (!data.length) { hide(list); show(empty); return; }
    show(list); hide(empty); hide(qs('#fam-hint'));
    list.innerHTML = data.map((item, i) => {
        const color = getColor(item.tipo_aislamiento?.color_cartel);
        const abbr  = getIsoAbbr(item.tipo_aislamiento?.nombre);
        return `
        <div class="result-card" style="animation-delay:${i * 35}ms" onclick="openFamDetail('${item._id}')">
            <div class="rc-icon ${color}">${abbr}</div>
            <div class="rc-info">
                <div class="rc-name">${item.nombre_cientifico}</div>
                <span class="badge-pill ${color}">${item.tipo_aislamiento?.nombre || 'Estándar'}</span>
            </div>
            <span class="rc-arrow">›</span>
        </div>`;
    }).join('');
}

function openFamDetail(id) {
    const item = allPathogens.find(p => p._id === id);
    if (!item) return;
    famState = 'detail';
    const color = getColor(item.tipo_aislamiento?.color_cartel);

    qs('#fam-hero').className     = `detail-hero family-hero ${color}`;
    qs('#fam-hero-chip').textContent = item.tipo_aislamiento?.nombre || '';
    qs('#fam-hero-name').textContent = item.nombre_cientifico;
    qs('#fam-cuidados').textContent  = item.cuidados_familia
        || 'Consultá al equipo de enfermería para instrucciones específicas de cuidado.';

    hide(qs('#fam-search-state'));
    show(qs('#fam-detail-state'));
    setAppBar('Cuidados', true);
    window.scrollTo(0, 0);
}

function closeFamDetail() {
    famState = 'search';
    hide(qs('#fam-detail-state'));
    show(qs('#fam-search-state'));
    setAppBar('Para la Familia', true);
}

// ════════════════════════════════════════════
//  ADMIN - Login
// ════════════════════════════════════════════
function openAdminLogin() {
    show(qs('#modal-login'));
    qs('#admin-pwd').value = '';
    hide(qs('#login-error'));
    setTimeout(() => qs('#admin-pwd').focus(), 200);
}
function closeAdminLogin() { hide(qs('#modal-login')); }

async function loginAdmin() {
    const pwd = qs('#admin-pwd').value;
    try {
        const res  = await fetch(`${API}/auth`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: pwd }),
        });
        const data = await res.json();
        if (data.success) { closeAdminLogin(); goTo('admin'); }
        else { show(qs('#login-error')); qs('#admin-pwd').value = ''; qs('#admin-pwd').focus(); }
    } catch (e) { alert('Error de conexión con el servidor.'); }
}

// ════════════════════════════════════════════
//  ADMIN - Lista
// ════════════════════════════════════════════
qs('#search-admin').addEventListener('input', debounce(e => {
    fetchAndRender('admin', e.target.value);
}, 280));

function renderAdminList(data) {
    qs('#admin-count').textContent = `${data.length} patógeno${data.length !== 1 ? 's' : ''}`;
    qs('#admin-list').innerHTML = data.map((item, i) => {
        const color = getColor(item.tipo_aislamiento?.color_cartel);
        return `
        <div class="admin-item" style="animation-delay:${i * 30}ms">
            <div class="admin-item-info">
                <div class="admin-item-name">${item.nombre_cientifico}</div>
                <span class="badge-pill ${color}">${item.tipo_aislamiento?.nombre || 'Estándar'}</span>
            </div>
            <div class="admin-item-actions">
                <button class="btn-edit" onclick="openFormModal('${item._id}')" title="Editar">✏️</button>
                <button class="btn-del"  onclick="deletePathogen('${item._id}')" title="Eliminar">🗑️</button>
            </div>
        </div>`;
    }).join('');
}

async function deletePathogen(id) {
    if (!confirm('¿Eliminar este patógeno de la base de datos?')) return;
    try {
        const res = await fetch(`${API}/patogenos/${id}`, { method: 'DELETE' });
        if (res.ok) fetchAndRender('admin', qs('#search-admin').value);
        else alert('Error al eliminar.');
    } catch (e) { alert('Error de conexión.'); }
}

// ════════════════════════════════════════════
//  FORMULARIO: Agregar / Editar
// ════════════════════════════════════════════
function buildEppChecklist(selectedEpp = []) {
    qs('#epp-checklist').innerHTML = EPP_PRESETS.map(epp => {
        const keyword = epp.label.toLowerCase().split(' ')[0];
        const checked = selectedEpp.some(s => s.toLowerCase().includes(keyword));
        return `
        <div class="epp-check-item ${checked ? 'is-checked' : ''}"
             onclick="toggleEpp(this)" data-label="${epp.label}">
            <span>${epp.label}</span>
        </div>`;
    }).join('');
}

function toggleEpp(el) {
    el.classList.toggle('is-checked');
}

function openFormModal(id) {
    // id es un string ObjectId cuando editamos, o null cuando creamos
    isEditMode = (id !== null && id !== undefined && id !== 'null');
    editingId  = isEditMode ? id : null;
    qs('#form-title').textContent = isEditMode ? 'Editar Patógeno' : 'Nuevo Patógeno';

    if (isEditMode) {
        const item = allPathogens.find(p => p._id === editingId);
        if (!item) { console.warn('No se encontró item con id', editingId); return; }
        qs('#f-nombre').value     = item.nombre_cientifico || '';
        qs('#f-grupo').value      = item.clasificacion?.grupo_principal || '';
        qs('#f-subcat').value     = item.clasificacion?.subcategoria || '';
        qs('#f-iso-desc').value   = item.tipo_aislamiento?.descripcion_al_clic || '';
        qs('#f-advertencias').value = (item.tipo_aislamiento?.advertencias_criticas || []).join('\n');
        qs('#f-mec').value        = (item.mecanismos_infeccion || []).join('\n');
        qs('#f-resistencia').value= (item.mecanismos_resistencia || []).join('\n');
        qs('#f-sala').value       = item.disposicion_sala || '';
        qs('#f-residuos').value   = item.manejo_residuos_ropa?.basura || '';
        qs('#f-familia').value    = item.cuidados_familia || '';

        // EPP: separar presets de custom
        const epp = item.epp_requerido || [];
        const presetLabels = EPP_PRESETS.map(p => p.label.toLowerCase().split(' ')[0]);
        const custom = epp.filter(e => !presetLabels.some(k => e.toLowerCase().includes(k)));
        qs('#f-epp-custom').value = custom.join(', ');
        buildEppChecklist(epp);

        // Isolation radio
        const isoNombre = item.tipo_aislamiento?.nombre?.toLowerCase() || '';
        document.querySelectorAll('input[name="f-iso"]').forEach(r => {
            r.checked = r.value.toLowerCase().startsWith(isoNombre.slice(0, 5));
        });
    } else {
        // Limpiar formulario
        ['f-nombre','f-grupo','f-subcat','f-iso-desc','f-advertencias',
         'f-mec','f-resistencia','f-sala','f-residuos','f-familia','f-epp-custom']
            .forEach(id => { qs(`#${id}`).value = ''; });
        document.querySelectorAll('input[name="f-iso"]').forEach(r => r.checked = false);
        buildEppChecklist([]);
    }

    show(qs('#modal-form'));
    qs('#modal-form').scrollTop = 0;
}

function closeFormModal() { hide(qs('#modal-form')); }

function onIsoChange() { /* CSS maneja el visual */ }

async function savePathogen() {
    const nombre = qs('#f-nombre').value.trim();
    if (!nombre) { alert('El nombre científico es obligatorio.'); return; }

    const radioChecked = document.querySelector('input[name="f-iso"]:checked');
    const isoVal = radioChecked ? radioChecked.value.split('|') : ['Estándar', 'Gris'];

    // EPP: tomar los marcados + los custom
    const checkedEpp = Array.from(document.querySelectorAll('.epp-check-item.is-checked'))
        .map(el => el.dataset.label);
    const customEpp = qs('#f-epp-custom').value
        .split(',').map(s => s.trim()).filter(Boolean);
    const allEpp = [...checkedEpp, ...customEpp];

    const body = {
        nombre_cientifico: nombre,
        clasificacion: {
            grupo_principal: qs('#f-grupo').value.trim(),
            subcategoria:    qs('#f-subcat').value.trim(),
        },
        tipo_aislamiento: {
            nombre:                isoVal[0],
            color_cartel:          isoVal[1],
            descripcion_al_clic:   qs('#f-iso-desc').value.trim(),
            advertencias_criticas: qs('#f-advertencias').value.split('\n').map(s => s.trim()).filter(Boolean),
        },
        epp_requerido:         allEpp,
        mecanismos_infeccion:  qs('#f-mec').value.split('\n').map(s => s.trim()).filter(Boolean),
        mecanismos_resistencia:qs('#f-resistencia').value.split('\n').map(s => s.trim()).filter(Boolean),
        manejo_residuos_ropa:  { basura: qs('#f-residuos').value.trim() },
        disposicion_sala:      qs('#f-sala').value.trim(),
        cuidados_familia:      qs('#f-familia').value.trim(),
    };

    const isEdit = isEditMode && editingId;
    const url    = isEdit ? `${API}/patogenos/${editingId}` : `${API}/patogenos`;
    const method = isEdit ? 'PUT' : 'POST';
    console.log(`[save] isEdit=${isEdit}, id=${editingId}, url=${url}, method=${method}`);

    try {
        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        console.log('[save] status:', res.status);
        if (res.ok) {
            closeFormModal();
            fetchAndRender('admin', qs('#search-admin').value);
        } else {
            const errData = await res.json().catch(() => ({}));
            console.error('[save] error response:', errData);
            alert(`Error al guardar (${res.status}). ${errData.message || 'Verificá los datos.'}`);
        }
    } catch (e) {
        console.error('[save] network error:', e);
        alert('Error de conexión con el servidor.');
    }
}
