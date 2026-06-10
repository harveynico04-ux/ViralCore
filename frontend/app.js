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

// ─── Recomendaciones familiares predeterminadas por tipo de aislamiento ───
const FAM_PRECAUTIONS = {
    verde: { // Gotas de Pflugge
        hacer: [
            "Visitar con barbijo quirúrgico puesto correctamente.",
            "Lavarte bien las manos antes y después de la visita.",
            "Hablar con el equipo médico sobre la evolución.",
            "Llevar objetos personales en bolsa cerrada."
        ],
        nohacer: [
            "Entrar sin barbijo quirúrgico.",
            "Acercarte a menos de 1 metro sin protección.",
            "Ir a visitar si tenés fiebre, tos o síntomas respiratorios.",
            "Llevar niños menores de 12 años (consultar con el equipo médico)."
        ]
    },
    amarillo: { // Contacto
        hacer: [
            "Usar camisolín y guantes si vas a tocar al paciente o su entorno.",
            "Lavarte bien las manos antes y después de la visita.",
            "Mantener los objetos de uso personal del paciente dentro de la habitación."
        ],
        nohacer: [
            "Tocar al paciente o superficies de la habitación sin colocarte guantes y camisolín.",
            "Salir de la habitación usando el equipo de protección (descartalo adentro).",
            "Ir a visitar si tenés infecciones en la piel o diarrea activa."
        ]
    },
    azul: { // Respiratorio (Aéreo)
        hacer: [
            "Visitar usando barbijo N95 bien ajustado en todo momento.",
            "Mantener la puerta de la habitación completamente cerrada.",
            "Lavarte las manos meticulosamente antes y después de ingresar."
        ],
        nohacer: [
            "Entrar a la habitación sin barbijo N95 (el barbijo quirúrgico común no es suficiente).",
            "Mantener la puerta abierta.",
            "Ir a visitar si tenés defensas bajas o no tenés inmunidad previa contra la enfermedad."
        ]
    },
    gris: { // Estándar
        hacer: [
            "Lavarte bien las manos al ingresar y al retirarte de la habitación.",
            "Visitar en horarios habituales siguiendo las pautas generales de higiene."
        ],
        nohacer: [
            "Tocar fluidos corporales o heridas sin avisar al personal de enfermería.",
            "Ingresar si tenés síntomas de enfermedades infectocontagiosas activas."
        ]
    }
};

// ─── Utilidades ──────────────────────────────
const qs   = (s) => document.querySelector(s);
const show  = (el) => el?.classList.remove('hidden');
const hide  = (el) => el?.classList.add('hidden');

// Modificado para ordenar alfabéticamente
function sortPathogens(list) {
    return list.sort((a, b) => a.nombre_cientifico.localeCompare(b.nombre_cientifico));
}

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

// ─── Supervivencia en Superficies (Fuentes: CDC, Lancet ID, OPS) ──────────
const SURVIVAL_MAP = {
    'staphylococcus aureus':    'Hasta 7 meses en superficies secas. MRSA puede sobrevivir hasta 9 meses en superficies hospitalarias. Sensible a hipoclorito de sodio al 0,5% y alcohol al 70%. (Fuente: Kramer A. et al., BMC Infect Dis 2006)',
    'staphylococcus':           'Hasta 7 meses en superficies secas. Sensible a hipoclorito al 0,5% y alcohol al 70%. (Fuente: CDC, Kramer A. BMC Infect Dis 2006)',
    'escherichia coli':         'De 1,5 horas a 16 meses en superficies inanimadas. E. coli productora de BLEE persiste por tiempo prolongado. Sensible a hipoclorito al 0,1% y alcohol al 70%. (Fuente: Kramer A. et al., BMC Infect Dis 2006)',
    'klebsiella':               'Hasta 30 meses en condiciones favorables. Klebsiella pneumoniae KPC altamente resistente en el ambiente hospitalario. Sensible a hipoclorito al 0,5% y amonio cuaternario. (Fuente: CDC HAI, Kramer 2006)',
    'pseudomonas aeruginosa':   'De 6 horas a 16 meses en superficies húmedas. Particular resistencia en entornos húmedos como piletas y mangos de canillas. Sensible a hipoclorito y ácido peracético. (Fuente: Kramer A. et al., BMC Infect Dis 2006)',
    'acinetobacter':            'De 3 días a 5 meses en superficies secas. Una de las bacterias nosocomiales más resistentes al ambiente. Sensible a hipoclorito al 1%. (Fuente: Wendt C. et al., JCM 1997)',
    'clostridium difficile':    'Las esporas pueden persistir en el ambiente por meses a años. Resistente al alcohol. Desinfección obligatoria con hipoclorito de sodio al 0,5–1%. (Fuente: CDC C. diff Infection, OPS 2019)',
    'enterococcus':             'Hasta 4 meses en superficies secas. VRE (Enterococo Resistente a Vancomicina) puede persistir hasta 4 meses. Sensible a hipoclorito al 0,5%. (Fuente: Kramer A. et al., BMC Infect Dis 2006)',
    'mycobacterium tuberculosis':'Puede sobrevivir de horas a días en superficies, y semanas en esputo desecado. El bacilo de Koch es resistente a desinfectantes comunes; requiere luz UV o calor húmedo para su inactivación. (Fuente: OPS/OMS Tuberculosis Guidelines, CDC 2022)',
    'influenza':                'El virus de la influenza sobrevive hasta 24 horas en superficies duras. Se inactiva con alcohol al 70% y detergentes comunes. (Fuente: CDC Influenza Prevention, Bean B. et al. JID 1982)',
    'sars-cov':                 'Coronavirus (incluido SARS-CoV-2) puede sobrevivir de horas a 3 días en superficies (acero inoxidable y plástico). Se inactiva con alcohol al 70% e hipoclorito al 0,1%. (Fuente: van Doremalen N. NEJM 2020)',
    'coronavirus':              'Puede sobrevivir de horas a 3 días en superficies. Se inactiva con alcohol al 70% e hipoclorito al 0,1%. (Fuente: van Doremalen N. NEJM 2020)',
    'candida':                  'Candida albicans sobrevive hasta 120 días en superficies de acrílico y cauchos. Candida auris puede persistir por semanas en el ambiente hospitalario y es resistente a desinfectantes comunes. (Fuente: CDC Candida auris 2023)',
    'norovirus':                'Puede sobrevivir semanas en superficies y días en el agua. Resistente al alcohol. Desinfección con hipoclorito de sodio al 0,1–1%. (Fuente: CDC Norovirus)',
    'hepatitis b':              'Puede sobrevivir fuera del organismo hasta 7 días en superficies secas. Se inactiva con hipoclorito al 0,5% y glutaraldehído. (Fuente: CDC HBV)',
    'default':                  'La supervivencia varía según el microorganismo, la humedad y el tipo de superficie. En general, bacterias Gram-positivas persisten más tiempo que las Gram-negativas. Aplicar desinfección de superficies con hipoclorito de sodio al 0,5–1% o alcohol al 70% según el protocolo institucional. (Fuente: Kramer A. et al., BMC Infect Dis 2006; OPS Manual de Bioseguridad en el Laboratorio 2005)'
};

function getSurvivalTime(nombreCientifico = '') {
    const n = nombreCientifico.toLowerCase();
    for (const key of Object.keys(SURVIVAL_MAP)) {
        if (key !== 'default' && n.includes(key)) return SURVIVAL_MAP[key];
    }
    return SURVIVAL_MAP['default'];
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
    } else if (view === 'triaje') {
        qs('header.app-bar').classList.remove('bar-hidden');
        setAppBar('Asistente de Triaje', true);
        initTriaje();
    } else if (view === 'carteles') {
        qs('header.app-bar').classList.remove('bar-hidden');
        setAppBar('Carteles Imprimibles', true);
        initCarteles();
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
        allPathogens = sortPathogens(data);
        if (ctx === 'medical') renderMedResults(allPathogens);
        if (ctx === 'family')  renderFamResults(allPathogens);
        if (ctx === 'admin')   renderAdminList(allPathogens);
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
    hide(qs('#med-hint')); // Ocultamos el hint para que no confunda
    show(qs('#med-results'));
    hide(qs('#med-empty'));
    qs('#search-med').value = '';
    hide(qs('#clear-med'));
    fetchAndRender('medical', ''); // Cargar todos por defecto
}

qs('#search-med').addEventListener('input', debounce(e => {
    const q = e.target.value.trim();
    q ? show(qs('#clear-med')) : hide(qs('#clear-med'));
    fetchAndRender('medical', q); // Buscamos (si está vacío trae todos)
}, 280));

function clearSearch(ctx) {
    qs(`#search-${ctx}`).value = '';
    hide(qs(`#clear-${ctx}`));
    hide(qs(`#${ctx}-hint`));
    show(qs(`#${ctx}-results`));
    hide(qs(`#${ctx}-empty`));
    fetchAndRender(ctx, ''); // Volver a listar todos
}

function renderMedResults(data) {
    const list  = qs('#med-results');
    const empty = qs('#med-empty');
    if (!data.length) { hide(list); show(empty); return; }
    show(list); hide(empty);
    list.innerHTML = data.map((item, i) => {
        const color = getColor(item.tipo_aislamiento?.color_cartel);
        return `
        <div class="result-card" style="animation-delay:${i * 20}ms" onclick="openMedDetail('${item._id}')">
            <div class="rc-info" style="padding-left: 0.25rem;">
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
    const isoIcon = ISO_ICON[color] || '🏥';

    // Fallbacks normativos reales basados en CDC/OPS/ANMAT según tipo de aislamiento
    const isoColor = color;
    let residuosFallback = '';
    let salaFallback = '';
    let resistenciaFallback = '';

    if (isoColor === 'amarillo') { // Contacto
        residuosFallback = 'Clasificar como residuo patogénico (bolsa roja). Todo material que haya tenido contacto con el paciente (gasas, guantes, catéteres) debe desecharse en recipiente con tapa y bolsa roja. La ropa de cama debe manipularse con guantes, enrollarse sin sacudir y enviarse en bolsa impermeable. (Fuente: CDC Guideline for Isolation Precautions 2007, ANMAT Disposición 2318/02)';
        salaFallback = 'Habitación individual preferentemente. Si no hay disponibilidad, cohorte con pacientes del mismo germen. Mantener la puerta cerrada. Uso exclusivo de estetoscopio, termómetro y esfigmomanómetro para el paciente. Desinfectar superficies con hipoclorito de sodio al 0,5% o clorhexidina al 2% entre pacientes. (Fuente: CDC 2007, OPS Manual de Bioseguridad 2005)';
    } else if (isoColor === 'verde') { // Gotas
        residuosFallback = 'Clasificar como residuo patogénico. Descarte de material respiratorio (pañuelos, máscaras descartables) en bolsa roja con tapa. La ropa de cama debe manejarse con precauciones estándar. (Fuente: CDC Guideline for Isolation Precautions 2007)';
        salaFallback = 'Habitación individual o cohorte. Separación física de camas de al menos 1 metro. Puerta puede mantenerse abierta. Usar barbijo quirúrgico al ingresar y en todo contacto a menos de 1 metro. (Fuente: CDC 2007, OPS 2005)';
    } else if (isoColor === 'azul') { // Aéreo
        residuosFallback = 'Residuo infeccioso de alto riesgo. Bolsa roja doble sellada. El personal debe usar N95 al manipular residuos. Traslado en contenedor rígido etiquetado. (Fuente: CDC 2007, OPS Manual de Bioseguridad, ANMAT 2318/02)';
        salaFallback = 'Habitación individual con presión negativa (6–12 renovaciones de aire/hora). Puerta permanentemente cerrada. Personal debe colocarse el N95 antes de ingresar al pasillo del cuarto. Traslado del paciente sólo si es imprescindible, con barbijo quirúrgico en el paciente. (Fuente: CDC 2007, ANMAT, Ministerio de Salud Argentina Res. 1342/2012)';
    } else { // Estándar
        residuosFallback = 'Residuos generales o patogénicos según tipo de material. Descarte según precauciones estándar. (Fuente: CDC 2007, ANMAT 2318/02)';
        salaFallback = 'No se requiere aislamiento especial. Aplicar Precauciones Estándar: lavado de manos clínico antes y después de cada contacto. (Fuente: CDC 2007)';
    }

    const residuosText = item.manejo_residuos_ropa?.basura?.trim() || residuosFallback;
    const salaText = item.disposicion_sala?.trim() || salaFallback;
    const resistencia = (item.mecanismos_resistencia || []);
    const supervivencia = getSurvivalTime(item.nombre_cientifico);

    const detailStateEl = qs('#med-detail-state');
    detailStateEl.innerHTML = `
        <div class="detail-header-professional">
            <button class="back-link-btn" onclick="closeMedDetail()">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
                Volver a resultados
            </button>
            
            <div class="prof-card-hero">
                <div class="prof-hero-left">
                    <span class="prof-label">NOMBRE CIENTÍFICO</span>
                    <h2 class="prof-name">${item.nombre_cientifico}</h2>
                    <div class="prof-badges">
                        <span class="prof-badge">${item.clasificacion?.grupo_principal || 'Grupo'}</span>
                        ${item.clasificacion?.subcategoria ? `<span class="prof-badge">${item.clasificacion.subcategoria}</span>` : ''}
                    </div>
                </div>
                <div class="prof-hero-right">
                    <div class="prof-iso-box ${color}">
                        <span class="prof-iso-icon">${isoIcon}</span>
                        <span class="prof-iso-name">${item.tipo_aislamiento?.nombre || 'Estándar'}</span>
                    </div>
                </div>
            </div>
        </div>

        <div class="detail-body">
            <button class="warn-trigger" onclick="openCriticalModal()">
                <span class="warn-trigger-left">
                    <span class="warn-emoji">⚠️</span>
                    <span>Ver Advertencias de Aislamiento</span>
                </span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
            </button>

            <div class="prof-grid">
                <div class="section-card">
                    <div class="section-header">
                        <h3>MECANISMOS DE TRANSMISIÓN</h3>
                    </div>
                    <div class="mec-list">
                        ${(item.mecanismos_infeccion || []).map(m => `
                            <div class="mec-item-new">
                                <span class="mec-dot-blue">•</span>
                                <span>${m}</span>
                            </div>
                        `).join('') || '<p class="info-text">Sin datos registrados.</p>'}
                    </div>
                </div>

                <div class="section-card">
                    <div class="section-header">
                        <h3>EQUIPO DE PROTECCIÓN PERSONAL</h3>
                    </div>
                    <div class="epp-grid-new">
                        ${(item.epp_requerido || []).map(epp => `
                            <span class="epp-badge-gray">${epp}</span>
                        `).join('') || '<span class="epp-badge-gray">Sin datos</span>'}
                    </div>
                </div>

                <div class="section-card">
                    <div class="section-header">
                        <h3>MANEJO DE RESIDUOS Y ROPA</h3>
                    </div>
                    <p class="info-text">${residuosText}</p>
                </div>

                <div class="section-card">
                    <div class="section-header">
                        <h3>DISPOSICIÓN DE LA SALA</h3>
                    </div>
                    <p class="info-text">${salaText}</p>
                </div>

                ${resistencia.length ? `
                <div class="section-card">
                    <div class="section-header">
                        <h3>MECANISMOS DE RESISTENCIA</h3>
                    </div>
                    <div class="mec-list">
                        ${resistencia.map(r => `
                            <div class="mec-item-new">
                                <span class="mec-dot-blue">•</span>
                                <span>${r}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>` : ''}

                <div class="section-card" style="grid-column: 1 / -1;">
                    <div class="section-header">
                        <h3>SUPERVIVENCIA EN SUPERFICIES</h3>
                    </div>
                    <p class="info-text">${supervivencia}</p>
                </div>
            </div>
        </div>
    `;

    hide(qs('#med-search-state'));
    show(detailStateEl);
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
    hide(qs('#fam-hint')); // Ocultamos hint para no confundir
    show(qs('#fam-results'));
    hide(qs('#fam-empty'));
    qs('#search-fam').value = '';
    hide(qs('#clear-fam'));
    fetchAndRender('family', ''); // Cargar todos por defecto
}

qs('#search-fam').addEventListener('input', debounce(e => {
    const q = e.target.value.trim();
    q ? show(qs('#clear-fam')) : hide(qs('#clear-fam'));
    fetchAndRender('family', q); // Buscamos (si está vacío trae todos)
}, 280));

function renderFamResults(data) {
    const list  = qs('#fam-results');
    const empty = qs('#fam-empty');
    if (!data.length) { hide(list); show(empty); return; }
    show(list); hide(empty);
    list.innerHTML = data.map((item, i) => {
        const color = getColor(item.tipo_aislamiento?.color_cartel);
        return `
        <div class="result-card" style="animation-delay:${i * 20}ms" onclick="openFamDetail('${item._id}')">
            <div class="rc-info" style="padding-left: 0.25rem;">
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
    const isoIcon = ISO_ICON[color] || '🏠';

    // Obtener las precauciones predeterminadas para este tipo de aislamiento
    const precautions = FAM_PRECAUTIONS[color] || FAM_PRECAUTIONS.gris;

    // Renderizar la Ficha Familiar exacta de la Imagen 1
    const detailStateEl = qs('#fam-detail-state');
    detailStateEl.innerHTML = `
        <div class="detail-header-family">
            <button class="back-link-btn" onclick="closeFamDetail()">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
                Volver a resultados
            </button>
        </div>

        <div class="detail-body-family">
            <!-- Caja de Cabecera Colorida -->
            <div class="fam-header-box ${color}">
                <div class="fam-header-title-row">
                    <span class="fam-header-icon">${isoIcon}</span>
                    <h2 class="fam-header-title">${item.nombre_cientifico}</h2>
                </div>
                <div class="fam-header-subtitle">Aislamiento: ${item.tipo_aislamiento?.nombre || 'Estándar'}</div>
                <p class="fam-header-desc">${item.cuidados_familia || 'Su familiar se encuentra bajo precauciones de aislamiento para su cuidado y protección.'}</p>
            </div>

            <!-- Caja: ¿QUÉ PODÉS HACER DURANTE LA VISITA? -->
            <div class="fam-section-box">
                <div class="fam-sec-title green">
                    <span class="fam-sec-icon">✅</span>
                    <h3>¿QUÉ PODÉS HACER DURANTE LA VISITA?</h3>
                </div>
                <ul class="fam-list">
                    ${precautions.hacer.map(h => `
                        <li>
                            <span class="bullet-icon green">✅</span>
                            <span class="list-text">${h}</span>
                        </li>
                    `).join('')}
                </ul>
            </div>

            <!-- Caja: ¿QUÉ NO PODÉS HACER? -->
            <div class="fam-section-box">
                <div class="fam-sec-title red">
                    <span class="fam-sec-icon">❌</span>
                    <h3>¿QUÉ NO PODÉS HACER?</h3>
                </div>
                <ul class="fam-list">
                    ${precautions.nohacer.map(nh => `
                        <li>
                            <span class="bullet-icon red">❌</span>
                            <span class="list-text">${nh}</span>
                        </li>
                    `).join('')}
                </ul>
            </div>

            <!-- Caja: ¿QUÉ ELEMENTOS NECESITÁS USAR? -->
            <div class="fam-section-box">
                <div class="fam-sec-title blue">
                    <span class="fam-sec-icon">${isoIcon}</span>
                    <h3>¿QUÉ ELEMENTOS NECESITÁS USAR?</h3>
                </div>
                <div class="fam-epp-chips">
                    ${(item.epp_requerido || []).map(epp => `
                        <span class="fam-epp-chip">${epp}</span>
                    `).join('') || '<span class="fam-epp-chip">Lavado de manos</span>'}
                </div>
            </div>
        </div>
    `;

    hide(qs('#fam-search-state'));
    show(detailStateEl);
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

// ════════════════════════════════════════════
//  ASISTENTE DE TRIAJE (¿Qué aislamiento necesita?)
// ════════════════════════════════════════════
function initTriaje() {
    const container = qs('#view-triaje');
    container.innerHTML = `
        <div style="padding: 1.5rem 1rem;">
            <div class="family-welcome" style="padding: 0 0 1rem 0;">
                <h2>Asistente de Triaje de Aislamiento</h2>
                <p>Respondé las preguntas clínicas del paciente para determinar su tipo de aislamiento de forma inmediata.</p>
            </div>

            <div class="section-card" style="padding: 1.25rem;">
                <div style="display:flex; flex-direction:column; gap:1.25rem;">

                    <div style="display:flex; flex-direction:column; gap:0.5rem;">
                        <span style="font-size:0.9rem; font-weight:700; color:var(--text-1);">\u00bfTiene diarrea aguda o incontinencia sin causa conocida?</span>
                        <div style="display:flex; gap:0.75rem;">
                            <label style="flex:1; display:flex; align-items:center; gap:0.5rem; background:var(--bg); border:1.5px solid var(--border); padding:0.6rem 1rem; border-radius:var(--r-md); cursor:pointer;">
                                <input type="radio" name="q-diarrea" value="si" style="transform:scale(1.2);"><span>Sí</span>
                            </label>
                            <label style="flex:1; display:flex; align-items:center; gap:0.5rem; background:var(--bg); border:1.5px solid var(--border); padding:0.6rem 1rem; border-radius:var(--r-md); cursor:pointer;">
                                <input type="radio" name="q-diarrea" value="no" checked style="transform:scale(1.2);"><span>No</span>
                            </label>
                        </div>
                    </div>

                    <div style="display:flex; flex-direction:column; gap:0.5rem;">
                        <span style="font-size:0.9rem; font-weight:700; color:var(--text-1);">\u00bfSe sospecha Tuberculosis o tos productiva hem\u00f3ptica de m\u00e1s de 15 d\u00edas?</span>
                        <div style="display:flex; gap:0.75rem;">
                            <label style="flex:1; display:flex; align-items:center; gap:0.5rem; background:var(--bg); border:1.5px solid var(--border); padding:0.6rem 1rem; border-radius:var(--r-md); cursor:pointer;">
                                <input type="radio" name="q-tb" value="si" style="transform:scale(1.2);"><span>Sí</span>
                            </label>
                            <label style="flex:1; display:flex; align-items:center; gap:0.5rem; background:var(--bg); border:1.5px solid var(--border); padding:0.6rem 1rem; border-radius:var(--r-md); cursor:pointer;">
                                <input type="radio" name="q-tb" value="no" checked style="transform:scale(1.2);"><span>No</span>
                            </label>
                        </div>
                    </div>

                    <div style="display:flex; flex-direction:column; gap:0.5rem;">
                        <span style="font-size:0.9rem; font-weight:700; color:var(--text-1);">\u00bfTiene s\u00edntomas de Influenza (fiebre alta, tos, mialgias en época invernal)?</span>
                        <div style="display:flex; gap:0.75rem;">
                            <label style="flex:1; display:flex; align-items:center; gap:0.5rem; background:var(--bg); border:1.5px solid var(--border); padding:0.6rem 1rem; border-radius:var(--r-md); cursor:pointer;">
                                <input type="radio" name="q-flu" value="si" style="transform:scale(1.2);"><span>Sí</span>
                            </label>
                            <label style="flex:1; display:flex; align-items:center; gap:0.5rem; background:var(--bg); border:1.5px solid var(--border); padding:0.6rem 1rem; border-radius:var(--r-md); cursor:pointer;">
                                <input type="radio" name="q-flu" value="no" checked style="transform:scale(1.2);"><span>No</span>
                            </label>
                        </div>
                    </div>

                    <div style="display:flex; flex-direction:column; gap:0.5rem;">
                        <span style="font-size:0.9rem; font-weight:700; color:var(--text-1);">\u00bfTiene herida infectada con drenaje abundante que no puede contenerse con apósito?</span>
                        <div style="display:flex; gap:0.75rem;">
                            <label style="flex:1; display:flex; align-items:center; gap:0.5rem; background:var(--bg); border:1.5px solid var(--border); padding:0.6rem 1rem; border-radius:var(--r-md); cursor:pointer;">
                                <input type="radio" name="q-herida" value="si" style="transform:scale(1.2);"><span>Sí</span>
                            </label>
                            <label style="flex:1; display:flex; align-items:center; gap:0.5rem; background:var(--bg); border:1.5px solid var(--border); padding:0.6rem 1rem; border-radius:var(--r-md); cursor:pointer;">
                                <input type="radio" name="q-herida" value="no" checked style="transform:scale(1.2);"><span>No</span>
                            </label>
                        </div>
                    </div>

                    <button class="btn-primary" onclick="procesarTriaje()" style="margin-top:0.5rem;">Obtener Protocolo de Aislamiento</button>
                </div>
            </div>

            <div id="triaje-resultado" class="hidden" style="margin-top: 1.5rem;"></div>
        </div>
    `;
}

function procesarTriaje() {
    const diarrea = document.querySelector('input[name="q-diarrea"]:checked').value === 'si';
    const tb      = document.querySelector('input[name="q-tb"]:checked').value === 'si';
    const flu     = document.querySelector('input[name="q-flu"]:checked').value === 'si';
    const herida  = document.querySelector('input[name="q-herida"]:checked').value === 'si';

    let tipo = 'Estándar';
    let color = 'gris';
    let cartel = 'Estándar (Higiene de manos rutinaria)';
    let epp = ['Higiene de manos', 'Uso de guantes según fluidos'];
    let visitas = 'Visitas normales respetando lavado de manos al ingresar y salir.';
    let enfermeria = 'Cuidados de enfermería estándar, lavado de manos antes y después de tocar al paciente.';

    if (tb) {
        tipo = 'Respiratorio (Aéreo)';
        color = 'azul';
        cartel = 'Aislamiento Aéreo (Cartel Azul en la puerta)';
        epp = ['Higiene de manos', 'Barbijo N95 (Obligatorio antes de ingresar)', 'Protección ocular si hay riesgo de salpicaduras'];
        visitas = 'Restringidas. Deberán utilizar barbijo N95 ajustado. Mantener puerta cerrada en todo momento.';
        enfermeria = 'Habitación individual con presión negativa. Uso estricto de barbijo N95 y protector ocular si hay procedimientos.';
    } else if (diarrea || herida) {
        tipo = 'Contacto';
        color = 'amarillo';
        cartel = 'Aislamiento de Contacto (Cartel Amarillo en la puerta)';
        epp = ['Higiene de manos', 'Guantes de examen', 'Camisolín estéril/limpio al entrar en contacto'];
        visitas = 'Utilizar camisolín y guantes al entrar. Lavado de manos estricto al salir de la habitación.';
        enfermeria = 'Habitación individual de preferencia. Uso exclusivo de termómetro y estetoscopio para el paciente. Desechar EPP dentro de la habitación.';
    } else if (flu) {
        tipo = 'Gotas de Pflugge';
        color = 'verde';
        cartel = 'Aislamiento por Gotas (Cartel Verde en la puerta)';
        epp = ['Higiene de manos', 'Barbijo Quirúrgico (al ingresar a la habitación)'];
        visitas = 'Utilizar barbijo quirúrgico bien colocado. Mantener distancia mínima de 1 metro.';
        enfermeria = 'Separación física de camas si comparte sala. Descarte de material respiratorio en bolsa roja.';
    }

    const resBox = qs('#triaje-resultado');
    show(resBox);
    resBox.innerHTML = `
        <div class="fam-header-box ${color}" style="margin-bottom: 1rem;">
            <div class="fam-header-title-row">
                <h2 class="fam-header-title">${tipo}</h2>
            </div>
            <p class="fam-header-desc"><strong>Cartelería requerida:</strong> ${cartel}</p>
        </div>

        <div class="prof-grid">
            <div class="section-card">
                <div class="section-header"><h3>EQUIPO DE PROTECCIÓN PERSONAL REQUERIDO</h3></div>
                <div class="epp-grid-new">
                    ${epp.map(e => `<span class="epp-badge-gray">${e}</span>`).join('')}
                </div>
            </div>

            <div class="section-card">
                <div class="section-header"><h3>CUIDADOS DE ENFERMERÍA</h3></div>
                <p class="info-text">${enfermeria}</p>
            </div>

            <div class="section-card" style="grid-column: 1 / -1;">
                <div class="section-header"><h3>RECOMENDACIONES PARA VISITAS Y FAMILIARES</h3></div>
                <p class="info-text">${visitas}</p>
            </div>
        </div>
    `;
    resBox.scrollIntoView({ behavior: 'smooth' });
}


// ════════════════════════════════════════════
//  CARTELES DE AISLAMIENTO IMPRIMIBLES
// ════════════════════════════════════════════
function initCarteles() {
    const container = qs('#view-carteles');
    container.innerHTML = `
        <div style="padding: 1.5rem 1rem;">
            <div class="family-welcome" style="padding: 0 0 1rem 0;">
                <h2>Carteles de Aislamiento para Imprimir</h2>
                <p>Seleccioná el germen de la base de datos para generar instantáneamente el cartel oficial listo para colocar en la puerta de la habitación.</p>
            </div>

            <div class="section-card" style="padding: 1.25rem; margin-bottom:1.5rem;">
                <div style="display:flex; flex-direction:column; gap:0.75rem;">
                    <label style="font-size:0.85rem; font-weight:600; color:var(--text-2);">Seleccionar Patógeno</label>
                    <select id="select-cartel-patogeno" class="pin-input" style="font-size:0.95rem; text-align:left; letter-spacing:normal; padding:0.75rem; margin:0;" onchange="renderCartelPreview(this.value)">
                        <option value="">-- Elegí un germen --</option>
                        ${allPathogens.map(p => `<option value="${p._id}">${p.nombre_cientifico} (${p.tipo_aislamiento?.nombre || 'Estándar'})</option>`).join('')}
                    </select>
                </div>
            </div>

            <div id="cartel-preview-area" class="hidden"></div>
        </div>
    `;
}

function renderCartelPreview(id) {
    const area = qs('#cartel-preview-area');
    if (!id) { hide(area); return; }

    const item = allPathogens.find(p => p._id === id);
    if (!item) return;

    show(area);
    const color = getColor(item.tipo_aislamiento?.color_cartel);
    const isoName = item.tipo_aislamiento?.nombre || 'ESTÁNDAR';

    let iconoColor = '\u26a0\ufe0f';
    let advertencias = ['Lavado de manos clínico antes y después del contacto.'];

    if (color === 'verde') {
        iconoColor = '\ud83d\udca7';
        advertencias = [
            'Uso obligatorio de Barbijo Quirúrgico al ingresar a la habitación.',
            'Mantener distancia mínima de 1 metro entre pacientes.',
            'Higiene de manos estricta antes y después de ingresar.'
        ];
    } else if (color === 'azul') {
        iconoColor = '\ud83c\udf2c\ufe0f';
        advertencias = [
            'Uso obligatorio de Barbijo N95 antes de ingresar.',
            'Mantener la puerta de la habitación permanentemente cerrada.',
            'Habitación con presión negativa y ventanas cerradas.'
        ];
    } else if (color === 'amarillo') {
        iconoColor = '\u26a0\ufe0f';
        advertencias = [
            'Uso obligatorio de Camisolín y Guantes al tomar contacto.',
            'Desinfectar estetoscopio, termómetro y superficies entre usos.',
            'Desechar el EPP dentro de la habitación al salir.'
        ];
    }

    area.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.75rem;">
            <span style="font-size:0.8rem; font-weight:600; color:var(--text-3);">Previsualización del Cartel</span>
            <button class="btn-add" onclick="window.print()" style="padding:0.4rem 1rem; font-size:0.82rem; background:var(--accent);">Imprimir Cartel</button>
        </div>

        <div class="cartel-print-box ${color}" style="background:var(--surface); border:6px solid; border-radius:16px; padding:2rem; text-align:center; box-shadow:var(--sh-md);">
            <div style="font-size:1.1rem; font-weight:800; letter-spacing:0.1em; text-transform:uppercase; margin-bottom:1rem;">PRECAUCIONES DE AISLAMIENTO</div>
            <div style="font-size:4.5rem; line-height:1; margin-bottom:1rem;">${iconoColor}</div>
            <div style="font-size:2.2rem; font-weight:900; letter-spacing:-1px; text-transform:uppercase; margin-bottom:0.5rem; line-height:1.1;">${isoName}</div>
            <div style="font-size:1.15rem; font-weight:700; border-top:2px solid; border-bottom:2px solid; padding:0.5rem; margin:1rem 0;">
                PACIENTE CON: <span style="font-style:italic;">${item.nombre_cientifico}</span>
            </div>
            <div style="text-align:left; margin-top:1.5rem;">
                <div style="font-size:0.85rem; font-weight:800; text-transform:uppercase; margin-bottom:0.5rem; letter-spacing:0.05em;">MEDIDAS OBLIGATORIAS:</div>
                <ul style="padding-left:1.25rem; font-size:0.95rem; line-height:1.5; font-weight:600; display:flex; flex-direction:column; gap:0.5rem;">
                    ${advertencias.map(adv => `<li>${adv}</li>`).join('')}
                </ul>
            </div>
            <div style="margin-top:2rem; font-size:0.75rem; font-weight:700; opacity:0.6;">ViralCore v2.0</div>
        </div>
    `;
    area.scrollIntoView({ behavior: 'smooth' });
}
