// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//  API URL â€” cambiÃ¡ esta lÃ­nea para producciÃ³n
//  Local: 'http://127.0.0.1:5000/api'
//  Render: 'https://viralcore.onrender.com/api'
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
const API = 'https://viralcore.onrender.com/api';

// â”€â”€â”€ Estado global â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
let currentPathogen = null;
let allPathogens    = [];
let editingId       = null;  // null = nuevo, string = editando
let isEditMode      = false; // flag explÃ­cito para evitar ambigÃ¼edades
let topView         = 'landing';
let medState        = 'search'; // 'search' | 'detail'
let famState        = 'search'; // 'search' | 'detail'

// â”€â”€â”€ EPP disponibles para el formulario â”€â”€â”€â”€â”€
const EPP_PRESETS = [
    { id: 'manos',        label: 'Lavado de manos',      icon: 'ðŸ§¼' },
    { id: 'guantes',      label: 'Guantes',               icon: 'ðŸ§¤' },
    { id: 'camisolin',    label: 'CamisolÃ­n / Bata',      icon: 'ðŸ¥¼' },
    { id: 'barbijo-qx',   label: 'Barbijo QuirÃºrgico',    icon: 'ðŸ˜·' },
    { id: 'n95',          label: 'Barbijo N95',            icon: 'ðŸ›¡ï¸' },
    { id: 'ocular',       label: 'ProtecciÃ³n Ocular',     icon: 'ðŸ¥½' },
    { id: 'gorro',        label: 'Gorro',                  icon: 'ðŸ§¢' },
    { id: 'calzado',      label: 'Cubre Calzado',         icon: 'ðŸ¦º' },
    { id: 'doble-guante', label: 'Doble Par de Guantes',  icon: 'ðŸ¤²' },
];

// â”€â”€â”€ Ãconos por tipo de aislamiento â”€â”€â”€â”€â”€â”€â”€â”€â”€
const ISO_ICON = { verde: 'ðŸ’§', azul: 'ðŸŒ¬ï¸', amarillo: 'âš ï¸', gris: 'ðŸ¥' };

// â”€â”€â”€ Mapeo de Ã­cono para EPP â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const EPP_ICON_MAP = {
    manos: 'ðŸ¦¼', guante: 'ðŸ§¤', camisol: 'ðŸ¥¼', barbijo: 'ðŸ˜·',
    n95: 'ðŸ›¡ï¸', ocular: 'ðŸ¥½', gorro: 'ðŸ§¢', calzado: 'ðŸ¦º', doble: 'ðŸ¤²'
};

// â”€â”€â”€ Recomendaciones familiares predeterminadas por tipo de aislamiento â”€â”€â”€
const FAM_PRECAUTIONS = {
    verde: { // Gotas de Pflugge
        hacer: [
            "Visitar con barbijo quirÃºrgico puesto correctamente.",
            "Lavarte bien las manos antes y despuÃ©s de la visita.",
            "Hablar con el equipo mÃ©dico sobre la evoluciÃ³n.",
            "Llevar objetos personales en bolsa cerrada."
        ],
        nohacer: [
            "Entrar sin barbijo quirÃºrgico.",
            "Acercarte a menos de 1 metro sin protecciÃ³n.",
            "Ir a visitar si tenÃ©s fiebre, tos o sÃ­ntomas respiratorios.",
            "Llevar niÃ±os menores de 12 aÃ±os (consultar con el equipo mÃ©dico)."
        ]
    },
    amarillo: { // Contacto
        hacer: [
            "Usar camisolÃ­n y guantes si vas a tocar al paciente o su entorno.",
            "Lavarte bien las manos antes y despuÃ©s de la visita.",
            "Mantener los objetos de uso personal del paciente dentro de la habitaciÃ³n."
        ],
        nohacer: [
            "Tocar al paciente o superficies de la habitaciÃ³n sin colocarte guantes y camisolÃ­n.",
            "Salir de la habitaciÃ³n usando el equipo de protecciÃ³n (descartalo adentro).",
            "Ir a visitar si tenÃ©s infecciones en la piel o diarrea activa."
        ]
    },
    azul: { // Respiratorio (AÃ©reo)
        hacer: [
            "Visitar usando barbijo N95 bien ajustado en todo momento.",
            "Mantener la puerta de la habitaciÃ³n completamente cerrada.",
            "Lavarte las manos meticulosamente antes y despuÃ©s de ingresar."
        ],
        nohacer: [
            "Entrar a la habitaciÃ³n sin barbijo N95 (el barbijo quirÃºrgico comÃºn no es suficiente).",
            "Mantener la puerta abierta.",
            "Ir a visitar si tenÃ©s defensas bajas o no tenÃ©s inmunidad previa contra la enfermedad."
        ]
    },
    gris: { // EstÃ¡ndar
        hacer: [
            "Lavarte bien las manos al ingresar y al retirarte de la habitaciÃ³n.",
            "Visitar en horarios habituales siguiendo las pautas generales de higiene."
        ],
        nohacer: [
            "Tocar fluidos corporales o heridas sin avisar al personal de enfermerÃ­a.",
            "Ingresar si tenÃ©s sÃ­ntomas de enfermedades infectocontagiosas activas."
        ]
    }
};

// â”€â”€â”€ Mapeo de Supervivencia de PatÃ³genos en Superficies (Datos cientÃ­ficamente validados) â”€â”€â”€
const SURVIVAL_MAP = {
    'influenza': 'De 24 a 48 horas en superficies duras (plÃ¡stico, acero); de 8 a 12 horas en papel, ropa y tejidos.',
    'tuberculosis': 'Meses en superficies secas debido a su pared rica en lÃ­pidos. Altamente resistente a la desecaciÃ³n.',
    'varicela': 'Pocas horas (usualmente de 1 a 2 horas) en superficies secas; muy sensible a desinfectantes y calor.',
    'rotavirus': 'De 1 a 10 dÃ­as en superficies no porosas a temperatura ambiente.',
    'norovirus': 'De varias semanas a meses en superficies secas; resistente a alcoholes (requiere cloro).',
    'kpc': 'De 2 semanas hasta 2 meses en ambientes secos y superficies inanimadas hospitalarias.',
    'sarampiÃ³n': 'Hasta 2 horas en superficies o suspendido en el aire de la habitaciÃ³n.',
    'sarampion': 'Hasta 2 horas en superficies o suspendido en el aire de la habitaciÃ³n.',
    'pseudomonas': 'De 6 horas a 16 meses en superficies secas, prefiere ambientes hÃºmedos.',
    'clostridium': 'Las esporas pueden sobrevivir meses o aÃ±os en superficies si no se realiza fricciÃ³n mecÃ¡nica con cloro.',
    'difteria': 'De 7 dÃ­as a 6 meses en superficies inanimadas.',
    'adeno': 'De 7 dÃ­as a 3 meses en superficies inertes.',
    'default': 'Sensible a la desecaciÃ³n. Se recomienda limpieza diaria de superficies con cloro al 0.1% o alcohol al 70%.'
};

function getSurvivalTime(nombre = '') {
    const n = nombre.toLowerCase();
    for (const key of Object.keys(SURVIVAL_MAP)) {
        if (n.includes(key)) return SURVIVAL_MAP[key];
    }
    return SURVIVAL_MAP['default'];
}

// â”€â”€â”€ Utilidades â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const qs   = (s) => document.querySelector(s);
const show  = (el) => el?.classList.remove('hidden');
const hide  = (el) => el?.classList.add('hidden');

// Modificado para ordenar alfabÃ©ticamente
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
    if (n.includes('aÃ©reo') || n.includes('aereo')) return 'A';
    if (n.includes('gotas'))               return 'G';
    if (n.includes('estÃ¡ndar') || n.includes('estandar')) return 'E';
    return nombre.charAt(0).toUpperCase() || '?';
}

function getEppIcon(epp) {
    const lower = epp.toLowerCase();
    for (const [key, icon] of Object.entries(EPP_ICON_MAP)) {
        if (lower.includes(key)) return icon;
    }
    return 'ðŸ¥';
}

// â”€â”€â”€ App Bar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function setAppBar(title, showBack = false, rightHtml = '') {
    qs('#app-bar-title').textContent = title;
    showBack ? show(qs('#btn-back')) : hide(qs('#btn-back'));
    qs('#app-bar-right').innerHTML = rightHtml;
}

// â”€â”€â”€ NavegaciÃ³n principal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
        setAppBar('Buscar PatÃ³geno', true);
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

// â”€â”€â”€ API fetch central â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//  VISTA MÃ‰DICO
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
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
    fetchAndRender('medical', q); // Buscamos (si estÃ¡ vacÃ­o trae todos)
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
                <span class="badge-pill ${color}">${item.tipo_aislamiento?.nombre || 'EstÃ¡ndar'}</span>
            </div>
            <span class="rc-arrow">â€º</span>
        </div>`;
    }).join('');
}

function openMedDetail(id) {
    const item = allPathogens.find(p => p._id === id);
    if (!item) return;
    currentPathogen = item;
    medState = 'detail';

    const color = getColor(item.tipo_aislamiento?.color_cartel);
    const isoIcon = ISO_ICON[color] || 'ðŸ¥';

    // Rellenado normativo del CDC si los datos son genÃ©ricos o estÃ¡n vacÃ­os
    let salaText = item.disposicion_sala || '';
    if (!salaText || salaText.toLowerCase().includes('sin especificaciones') || salaText.toLowerCase().includes('sin datos')) {
        if (color === 'verde') salaText = 'HabitaciÃ³n individual obligatoria. Si hay cohorte, mantenga separaciÃ³n mÃ­nima de 1 metro entre camas con cortina divisoria.';
        else if (color === 'azul') salaText = 'HabitaciÃ³n individual con presiÃ³n negativa de aire y descarga exterior. Mantenga la puerta siempre cerrada.';
        else if (color === 'amarillo') salaText = 'HabitaciÃ³n individual de preferencia o cohorte de pacientes con el mismo germen. Restringir salidas.';
        else salaText = 'HabitaciÃ³n estÃ¡ndar con ventilaciÃ³n normal. Higiene ambiental rutinaria.';
    }

    let residuosText = item.manejo_residuos_ropa?.basura || '';
    if (!residuosText || residuosText.toLowerCase().includes('sin especificaciones') || residuosText.toLowerCase().includes('sin datos')) {
        residuosText = 'Bolsa roja para residuos biopatogÃ©nicos (gasas, secreciones, descartables contaminados). Descarte de cortopunzantes en contenedor rÃ­gido. Ropa de cama en bolsa amarilla cerrada.';
    }

    // Tiempo de supervivencia en superficies
    const survivalText = getSurvivalTime(item.nombre_cientifico);

    // Renderizar Ficha TÃ©cnica del Profesional sin Emojis en los TÃ­tulos de las cajas (Punto 3)
    const detailStateEl = qs('#med-detail-state');
    detailStateEl.innerHTML = `
        <div class="detail-header-professional">
            <button class="back-link-btn" onclick="closeMedDetail()">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
                Volver a resultados
            </button>
            
            <div class="prof-card-hero" style="transition: transform 0.2s ease; cursor: default;">
                <div class="prof-hero-left">
                    <span class="prof-label">NOMBRE CIENTÃFICO</span>
                    <h2 class="prof-name">${item.nombre_cientifico}</h2>
                    <div class="prof-badges">
                        <span class="prof-badge"><span class="badge-emoji">ðŸ“</span> ${item.clasificacion?.grupo_principal || 'Grupo'}</span>
                        ${item.clasificacion?.subcategoria ? `<span class="prof-badge">${item.clasificacion.subcategoria}</span>` : ''}
                    </div>
                </div>
                <div class="prof-hero-right">
                    <div class="prof-iso-box ${color}">
                        <span class="prof-iso-icon">${isoIcon}</span>
                        <span class="prof-iso-name">${item.tipo_aislamiento?.nombre || 'EstÃ¡ndar'}</span>
                    </div>
                </div>
            </div>
        </div>

        <div class="detail-body">
            <button class="warn-trigger" onclick="openCriticalModal()" style="transition: all 0.2s;">
                <span class="warn-trigger-left">
                    <span class="warn-emoji">âš ï¸</span>
                    <span>Ver Advertencias de Aislamiento</span>
                </span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
            </button>

            <div class="prof-grid">
                <div class="section-card" style="transition: transform 0.15s ease;">
                    <div class="section-header">
                        <h3>MECANISMOS DE TRANSMISIÃ“N</h3>
                    </div>
                    <div class="mec-list">
                        ${(item.mecanismos_infeccion || []).map(m => `
                            <div class="mec-item-new">
                                <span class="mec-dot-blue">â€¢</span>
                                <span>${m}</span>
                            </div>
                        `).join('') || '<p class="info-text" style="padding-left:1.125rem;">Contacto directo con el paciente o superficies.</p>'}
                    </div>
                </div>

                <div class="section-card" style="transition: transform 0.15s ease;">
                    <div class="section-header">
                        <h3>EQUIPO DE PROTECCIÃ“N PERSONAL</h3>
                    </div>
                    <div class="epp-grid-new">
                        ${(item.epp_requerido || []).map(epp => `
                            <span class="epp-badge-gray">${epp}</span>
                        `).join('') || '<span class="epp-badge-gray">Lavado de manos</span>'}
                    </div>
                </div>

                <div class="section-card" style="transition: transform 0.15s ease;">
                    <div class="section-header">
                        <h3>MANEJO DE RESIDUOS</h3>
                    </div>
                    <p class="info-text">${residuosText}</p>
                </div>

                <div class="section-card" style="transition: transform 0.15s ease;">
                    <div class="section-header">
                        <h3>DISPOSICIÃ“N DE LA SALA</h3>
                    </div>
                    <p class="info-text">${salaText}</p>
                </div>

                <!-- Nueva caja: TIEMPO DE SUPERVIVENCIA EN SUPERFICIES (Punto 5) -->
                <div class="section-card" style="grid-column: 1 / -1; transition: transform 0.15s ease;">
                    <div class="section-header" style="background: var(--accent-bg); border-bottom-color: var(--accent-light);">
                        <h3 style="color: var(--accent-dark);">TIEMPO DE SUPERVIVENCIA EN SUPERFICIES</h3>
                    </div>
                    <p class="info-text" style="font-weight: 500; color: var(--text-1);">${survivalText}</p>
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
    setAppBar('Buscar PatÃ³geno', true);
}

// â”€â”€â”€ Modal de Advertencias â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function openCriticalModal() {
    if (!currentPathogen) return;
    const iso = currentPathogen.tipo_aislamiento || {};
    qs('#modal-desc').textContent = iso.descripcion_al_clic || '';
    qs('#modal-warnings').innerHTML = (iso.advertencias_criticas || []).map(w => `
        <div class="warn-card">
            <span class="warn-card-icon">âš ï¸</span>
            <span>${w}</span>
        </div>`).join('');
    show(qs('#modal-critical'));
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//  VISTA FAMILIA
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
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
    fetchAndRender('family', q); // Buscamos (si estÃ¡ vacÃ­o trae todos)
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
                <span class="badge-pill ${color}">${item.tipo_aislamiento?.nombre || 'EstÃ¡ndar'}</span>
            </div>
            <span class="rc-arrow">â€º</span>
        </div>`;
    }).join('');
}

function openFamDetail(id) {
    const item = allPathogens.find(p => p._id === id);
    if (!item) return;
    famState = 'detail';
    const color = getColor(item.tipo_aislamiento?.color_cartel);
    const isoIcon = ISO_ICON[color] || 'ðŸ ';

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
                <div class="fam-header-subtitle">Aislamiento: ${item.tipo_aislamiento?.nombre || 'EstÃ¡ndar'}</div>
                <p class="fam-header-desc">${item.cuidados_familia || 'Su familiar se encuentra bajo precauciones de aislamiento para su cuidado y protecciÃ³n.'}</p>
            </div>

            <!-- Caja: Â¿QUÃ‰ PODÃ‰S HACER DURANTE LA VISITA? -->
            <div class="fam-section-box">
                <div class="fam-sec-title green">
                    <span class="fam-sec-icon">âœ…</span>
                    <h3>Â¿QUÃ‰ PODÃ‰S HACER DURANTE LA VISITA?</h3>
                </div>
                <ul class="fam-list">
                    ${precautions.hacer.map(h => `
                        <li>
                            <span class="bullet-icon green">âœ…</span>
                            <span class="list-text">${h}</span>
                        </li>
                    `).join('')}
                </ul>
            </div>

            <!-- Caja: Â¿QUÃ‰ NO PODÃ‰S HACER? -->
            <div class="fam-section-box">
                <div class="fam-sec-title red">
                    <span class="fam-sec-icon">âŒ</span>
                    <h3>Â¿QUÃ‰ NO PODÃ‰S HACER?</h3>
                </div>
                <ul class="fam-list">
                    ${precautions.nohacer.map(nh => `
                        <li>
                            <span class="bullet-icon red">âŒ</span>
                            <span class="list-text">${nh}</span>
                        </li>
                    `).join('')}
                </ul>
            </div>

            <!-- Caja: Â¿QUÃ‰ ELEMENTOS NECESITÃS USAR? -->
            <div class="fam-section-box">
                <div class="fam-sec-title blue">
                    <span class="fam-sec-icon">${isoIcon}</span>
                    <h3>Â¿QUÃ‰ ELEMENTOS NECESITÃS USAR?</h3>
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


// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//  ASISTENTE DE TRIAJE (Punto 6)
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function initTriaje() {
    const container = qs('#view-triaje');
    container.innerHTML = `
        <div style="padding: 1.5rem 1rem;">
            <div class="family-welcome" style="padding: 0 0 1rem 0;">
                <h2>Asistente de Triaje de Aislamiento</h2>
                <p>RespondÃ© las preguntas clÃ­nicas del paciente para determinar su tipo de aislamiento inmediato.</p>
            </div>

            <div class="section-card" style="padding: 1.25rem;">
                <div style="display:flex; flex-direction:column; gap:1.25rem;">
                    
                    <div style="display:flex; flex-direction:column; gap:0.5rem;">
                        <span style="font-size:0.9rem; font-weight:700; color:var(--text-1);">Â¿Tiene diarrea aguda o incontinencia sin causa conocida?</span>
                        <div style="display:flex; gap:0.75rem;">
                            <label style="flex:1; display:flex; align-items:center; gap:0.5rem; background:var(--bg); border:1.5px solid var(--border); padding:0.6rem 1rem; border-radius:var(--r-md); cursor:pointer;">
                                <input type="radio" name="q-diarrea" value="si" style="transform:scale(1.2);"><span>SÃ­</span>
                            </label>
                            <label style="flex:1; display:flex; align-items:center; gap:0.5rem; background:var(--bg); border:1.5px solid var(--border); padding:0.6rem 1rem; border-radius:var(--r-md); cursor:pointer;">
                                <input type="radio" name="q-diarrea" value="no" checked style="transform:scale(1.2);"><span>No</span>
                            </label>
                        </div>
                    </div>

                    <div style="display:flex; flex-direction:column; gap:0.5rem;">
                        <span style="font-size:0.9rem; font-weight:700; color:var(--text-1);">Â¿Se sospecha de Tuberculosis o presenta tos productiva hemoptisis de >15 dÃ­as de evoluciÃ³n?</span>
                        <div style="display:flex; gap:0.75rem;">
                            <label style="flex:1; display:flex; align-items:center; gap:0.5rem; background:var(--bg); border:1.5px solid var(--border); padding:0.6rem 1rem; border-radius:var(--r-md); cursor:pointer;">
                                <input type="radio" name="q-tb" value="si" style="transform:scale(1.2);"><span>SÃ­</span>
                            </label>
                            <label style="flex:1; display:flex; align-items:center; gap:0.5rem; background:var(--bg); border:1.5px solid var(--border); padding:0.6rem 1rem; border-radius:var(--r-md); cursor:pointer;">
                                <input type="radio" name="q-tb" value="no" checked style="transform:scale(1.2);"><span>No</span>
                            </label>
                        </div>
                    </div>

                    <div style="display:flex; flex-direction:column; gap:0.5rem;">
                        <span style="font-size:0.9rem; font-weight:700; color:var(--text-1);">Â¿Tiene sÃ­ntomas de Influenza (fiebre alta repentina, tos, dolores musculares en Ã©poca invernal)?</span>
                        <div style="display:flex; gap:0.75rem;">
                            <label style="flex:1; display:flex; align-items:center; gap:0.5rem; background:var(--bg); border:1.5px solid var(--border); padding:0.6rem 1rem; border-radius:var(--r-md); cursor:pointer;">
                                <input type="radio" name="q-flu" value="si" style="transform:scale(1.2);"><span>SÃ­</span>
                            </label>
                            <label style="flex:1; display:flex; align-items:center; gap:0.5rem; background:var(--bg); border:1.5px solid var(--border); padding:0.6rem 1rem; border-radius:var(--r-md); cursor:pointer;">
                                <input type="radio" name="q-flu" value="no" checked style="transform:scale(1.2);"><span>No</span>
                            </label>
                        </div>
                    </div>

                    <div style="display:flex; flex-direction:column; gap:0.5rem;">
                        <span style="font-size:0.9rem; font-weight:700; color:var(--text-1);">Â¿Tiene una herida infectada con drenaje abundante que no puede contenerse con el apÃ³sito?</span>
                        <div style="display:flex; gap:0.75rem;">
                            <label style="flex:1; display:flex; align-items:center; gap:0.5rem; background:var(--bg); border:1.5px solid var(--border); padding:0.6rem 1rem; border-radius:var(--r-md); cursor:pointer;">
                                <input type="radio" name="q-herida" value="si" style="transform:scale(1.2);"><span>SÃ­</span>
                            </label>
                            <label style="flex:1; display:flex; align-items:center; gap:0.5rem; background:var(--bg); border:1.5px solid var(--border); padding:0.6rem 1rem; border-radius:var(--r-md); cursor:pointer;">
                                <input type="radio" name="q-herida" value="no" checked style="transform:scale(1.2);"><span>No</span>
                            </label>
                        </div>
                    </div>

                    <button class="btn-primary" onclick="procesarTriaje()" style="margin-top:0.5rem;">Obtener Protocolo</button>
                </div>
            </div>

            <!-- RESULTADO DE TRIAJE -->
            <div id="triaje-resultado" class="hidden" style="margin-top: 1.5rem;"></div>
        </div>
    `;
}

function procesarTriaje() {
    const diarrea = document.querySelector('input[name="q-diarrea"]:checked').value === 'si';
    const tb = document.querySelector('input[name="q-tb"]:checked').value === 'si';
    const flu = document.querySelector('input[name="q-flu"]:checked').value === 'si';
    const herida = document.querySelector('input[name="q-herida"]:checked').value === 'si';

    let tipo = 'EstÃ¡ndar';
    let color = 'gris';
    let cartel = 'EstÃ¡ndar (Higiene de manos rutinaria)';
    let epp = ['Higiene de manos', 'Uso de guantes segÃºn fluidos'];
    let visitas = 'Visitas normales respetando lavado de manos al ingresar y salir.';
    let enfermeria = 'Cuidados de enfermerÃ­a estÃ¡ndar, lavado de manos antes y despuÃ©s de tocar al paciente.';

    if (tb) {
        tipo = 'Respiratorio (AÃ©reo)';
        color = 'azul';
        cartel = 'Aislamiento AÃ©reo (Cartel Azul en la puerta)';
        epp = ['Higiene de manos', 'Barbijo N95 (Obligatorio antes de ingresar)'];
        visitas = 'Restringidas. DeberÃ¡n utilizar barbijo N95 ajustado. Mantener puerta cerrada.';
        enfermeria = 'HabitaciÃ³n individual con presiÃ³n negativa. Uso estricto de barbijo N95 y protector ocular si hay salpicaduras.';
    } else if (diarrea || herida) {
        tipo = 'Contacto';
        color = 'amarillo';
        cartel = 'Aislamiento de Contacto (Cartel Amarillo en la puerta)';
        epp = ['Higiene de manos', 'Guantes de examen', 'CamisolÃ­n estÃ©ril/limpio si entra en contacto'];
        visitas = 'Utilizar camisolÃ­n y guantes al entrar. Lavado de manos estricto al salir de la habitaciÃ³n.';
        enfermeria = 'HabitaciÃ³n individual de preferencia. Uso exclusivo de termÃ³metro y estetoscopio para el paciente.';
    } else if (flu) {
        tipo = 'Gotas';
        color = 'verde';
        cartel = 'Aislamiento por Gotas de Pflugge (Cartel Verde en la puerta)';
        epp = ['Higiene de manos', 'Barbijo QuirÃºrgico'];
        visitas = 'Utilizar barbijo quirÃºrgico bien colocado. Mantener distancia >1 metro.';
        enfermeria = 'SeparaciÃ³n fÃ­sica de camas si comparte sala. Descarte de material respiratorio en bolsa roja.';
    }

    const resBox = qs('#triaje-resultado');
    show(resBox);
    resBox.innerHTML = `
        <div class="fam-header-box ${color}" style="margin-bottom: 1rem;">
            <div class="fam-header-title-row">
                <span class="fam-header-icon">ðŸ“‹</span>
                <h2 class="fam-header-title">${tipo}</h2>
            </div>
            <p class="fam-header-desc"><strong>CartelerÃ­a requerida:</strong> ${cartel}</p>
        </div>

        <div class="prof-grid">
            <div class="section-card">
                <div class="section-header">
                    <h3>EQUIPO DE PROTECCIÃ“N PERSONAL REQUERIDO</h3>
                </div>
                <div class="epp-grid-new">
                    ${epp.map(e => `<span class="epp-badge-gray">${e}</span>`).join('')}
                </div>
            </div>

            <div class="section-card">
                <div class="section-header">
                    <h3>CUIDADOS DE ENFERMERÃA</h3>
                </div>
                <p class="info-text">${enfermeria}</p>
            </div>

            <div class="section-card" style="grid-column: 1 / -1;">
                <div class="section-header">
                    <h3>RECOMENDACIONES PARA VISITAS Y FAMILIARES</h3>
                </div>
                <p class="info-text">${visitas}</p>
            </div>
        </div>
    `;
    resBox.scrollIntoView({ behavior: 'smooth' });
}


// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//  CARTELES DE AISLAMIENTO IMPRIMIBLES (Punto 7)
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function initCarteles() {
    const container = qs('#view-carteles');
    container.innerHTML = `
        <div style="padding: 1.5rem 1rem;">
            <div class="family-welcome" style="padding: 0 0 1rem 0;">
                <h2>Carteles de Aislamiento para Imprimir</h2>
                <p>SeleccionÃ¡ el germen de la base de datos para generar instantÃ¡neamente el cartel oficial listo para colocar en la puerta de la habitaciÃ³n.</p>
            </div>

            <div class="section-card" style="padding: 1.25rem; margin-bottom:1.5rem;">
                <div style="display:flex; flex-direction:column; gap:0.75rem;">
                    <label style="font-size:0.85rem; font-weight:600; color:var(--text-2);">Seleccionar PatÃ³geno</label>
                    <select id="select-cartel-patogeno" class="pin-input" style="font-size:0.95rem; text-align:left; letter-spacing:normal; padding:0.75rem; margin:0;" onchange="renderCartelPreview(this.value)">
                        <option value="">-- Elegir un germen --</option>
                        ${allPathogens.map(p => `<option value="${p._id}">${p.nombre_cientifico} (${p.tipo_aislamiento?.nombre || 'EstÃ¡ndar'})</option>`).join('')}
                    </select>
                </div>
            </div>

            <!-- PREVISUALIZACIÃ“N DEL CARTEL -->
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
    const isoName = item.tipo_aislamiento?.nombre || 'ESTÃNDAR';
    
    // Contenido dinÃ¡mico del cartel
    let iconoColor = 'ðŸ’§';
    let advertencias = ['Lavado de manos clÃ­nico antes y despuÃ©s del contacto.'];
    let eppText = 'Equipo de ProtecciÃ³n segÃºn valoraciÃ³n de riesgo.';
    
    if (color === 'verde') {
        iconoColor = 'ðŸ’§';
        advertencias = ['Uso obligatorio de Barbijo QuirÃºrgico al ingresar a la habitaciÃ³n.', 'Mantener distancia mÃ­nima de 1 metro entre pacientes.', 'Higiene de manos estricta antes y despuÃ©s de ingresar.'];
        eppText = 'Barbijo QuirÃºrgico + Lavado de manos.';
    } else if (color === 'azul') {
        iconoColor = 'ðŸŒ¬ï¸';
        advertencias = ['Uso obligatorio de Barbijo N95/N100 antes de ingresar.', 'Mantener la puerta de la habitaciÃ³n permanentemente cerrada.', 'HabitaciÃ³n con presiÃ³n negativa y ventanas cerradas.'];
        eppText = 'Barbijo N95 + Higiene de manos.';
    } else if (color === 'amarillo') {
        iconoColor = 'âš ï¸';
        advertencias = ['Uso obligatorio de CamisolÃ­n y Guantes al tomar contacto.', 'Desinfectar estetoscopio, termÃ³metro y superficies entre usos.', 'Desechar el equipo EPP dentro de la habitaciÃ³n al salir.'];
        eppText = 'CamisolÃ­n + Guantes + Lavado de manos.';
    }

    area.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.75rem;">
            <span style="font-size:0.8rem; font-weight:600; color:var(--text-3);">PrevisualizaciÃ³n del Cartel</span>
            <button class="btn-add" onclick="window.print()" style="padding:0.4rem 1rem; font-size:0.82rem; background:var(--accent);">ðŸ–¨ï¸ Imprimir Cartel</button>
        </div>

        <!-- El Cartel Imprimible -->
        <div class="cartel-print-box ${color}" style="background:var(--surface); border:6px solid; border-radius:16px; padding:2rem; text-align:center; box-shadow:var(--sh-md);">
            <div style="font-size:1.1rem; font-weight:800; letter-spacing:0.1em; text-transform:uppercase; margin-bottom:1rem;">PRECAUCIONES DE AISLAMIENTO</div>
            
            <div style="font-size:4.5rem; line-height:1; margin-bottom:1rem;">${iconoColor}</div>
            
            <div style="font-size:2.2rem; font-weight:900; letter-spacing:-1px; text-transform:uppercase; margin-bottom:0.5rem; line-height:1.1;">
                ${isoName}
            </div>
            
            <div style="font-size:1.15rem; font-weight:700; border-top:2px solid; border-bottom:2px solid; padding:0.5rem; margin:1rem 0;">
                PACIENTE CON: <span style="font-style:italic;">${item.nombre_cientifico}</span>
            </div>

            <div style="text-align:left; margin-top:1.5rem;">
                <div style="font-size:0.85rem; font-weight:800; text-transform:uppercase; margin-bottom:0.5rem; letter-spacing:0.05em;">MEDIDAS OBLIGATORIAS:</div>
                <ul style="padding-left:1.25rem; font-size:0.95rem; line-height:1.5; font-weight:600; display:flex; flex-direction:column; gap:0.5rem;">
                    ${advertencias.map(adv => `<li>${adv}</li>`).join('')}
                </ul>
            </div>

            <div style="margin-top:2rem; font-size:0.75rem; font-weight:700; opacity:0.6;">
                ViralCore v2.0 - Universidad Nacional de CÃ³rdoba
            </div>
        </div>
    `;
    area.scrollIntoView({ behavior: 'smooth' });
}


// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//  ADMIN - Login
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
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
    } catch (e) { alert('Error de conexiÃ³n con el servidor.'); }
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//  ADMIN - Lista
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
qs('#search-admin').addEventListener('input', debounce(e => {
    fetchAndRender('admin', e.target.value);
}, 280));

function renderAdminList(data) {
    qs('#admin-count').textContent = `${data.length} patÃ³geno${data.length !== 1 ? 's' : ''}`;
    qs('#admin-list').innerHTML = data.map((item, i) => {
        const color = getColor(item.tipo_aislamiento?.color_cartel);
        return `
        <div class="admin-item" style="animation-delay:${i * 30}ms">
            <div class="admin-item-info">
                <div class="admin-item-name">${item.nombre_cientifico}</div>
                <span class="badge-pill ${color}">${item.tipo_aislamiento?.nombre || 'EstÃ¡ndar'}</span>
            </div>
            <div class="admin-item-actions">
                <button class="btn-edit" onclick="openFormModal('${item._id}')" title="Editar">âœï¸</button>
                <button class="btn-del"  onclick="deletePathogen('${item._id}')" title="Eliminar">ðŸ—‘ï¸</button>
            </div>
        </div>`;
    }).join('');
}

async function deletePathogen(id) {
    if (!confirm('Â¿Eliminar este patÃ³geno de la base de datos?')) return;
    try {
        const res = await fetch(`${API}/patogenos/${id}`, { method: 'DELETE' });
        if (res.ok) fetchAndRender('admin', qs('#search-admin').value);
        else alert('Error al eliminar.');
    } catch (e) { alert('Error de conexiÃ³n.'); }
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//  FORMULARIO: Agregar / Editar
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
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
    qs('#form-title').textContent = isEditMode ? 'Editar PatÃ³geno' : 'Nuevo PatÃ³geno';

    if (isEditMode) {
        const item = allPathogens.find(p => p._id === editingId);
        if (!item) { console.warn('No se encontrÃ³ item con id', editingId); return; }
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
    if (!nombre) { alert('El nombre cientÃ­fico es obligatorio.'); return; }

    const radioChecked = document.querySelector('input[name="f-iso"]:checked');
    const isoVal = radioChecked ? radioChecked.value.split('|') : ['EstÃ¡ndar', 'Gris'];

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
            alert(`Error al guardar (${res.status}). ${errData.message || 'VerificÃ¡ los datos.'}`);
        }
    } catch (e) {
        console.error('[save] network error:', e);
        alert('Error de conexiÃ³n con el servidor.');
    }
}
