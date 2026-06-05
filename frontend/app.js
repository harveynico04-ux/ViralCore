const API_BASE_URL = 'https://viralcore.onrender.com/api'; // Cambiar a la de Render en prod

let currentPathogen = null;
let currentRole = null; // 'admin' o nulo
let allData = [];

// Utilidades
function qs(selector) { return document.querySelector(selector); }
function hide(el) { el.classList.add('hidden'); }
function show(el) { el.classList.remove('hidden'); }

// Debounce
function debounce(func, delay) {
    let timeoutId;
    return function (...args) {
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = setTimeout(() => { func.apply(null, args); }, delay);
    };
}

// Colores
function getColorClass(colorStr) {
    if (!colorStr) return 'gris';
    const c = colorStr.toLowerCase();
    if (c.includes('verde')) return 'verde';
    if (c.includes('azul')) return 'azul';
    if (c.includes('amarill')) return 'amarillo';
    return 'gris';
}

// NAVEGACIÓN (Ruteo simple)
function goTo(view) {
    // Ocultar todas las vistas
    document.querySelectorAll('.view-section').forEach(hide);
    // Mostrar la elegida
    show(qs(`#view-${view}`));
    
    // Si entramos a Familia o Médico, cargamos datos
    if (view === 'family' || view === 'medical') {
        fetchPathogens('', view);
    }
}

// --- BÚSQUEDA Y RENDERIZADO GLOBAL ---
async function fetchPathogens(query, viewContext) {
    try {
        const res = await fetch(`${API_BASE_URL}/patogenos?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        allData = data;
        
        if (viewContext === 'medical') renderMedicalTable(data);
        if (viewContext === 'family') renderFamilyGrid(data);
        if (viewContext === 'admin') renderAdminTable(data);
        
    } catch (e) {
        console.error("Error API:", e);
    }
}

// Listeners de Búsqueda
qs('#search-input-med').addEventListener('input', debounce((e) => fetchPathogens(e.target.value, 'medical'), 300));
qs('#search-input-fam').addEventListener('input', debounce((e) => fetchPathogens(e.target.value, 'family'), 300));

// --- VISTA MÉDICA ---
function renderMedicalTable(data) {
    const tbody = qs('#results-body-med');
    tbody.innerHTML = '';
    data.forEach(item => {
        const tr = document.createElement('tr');
        tr.onclick = () => openMedicalDetail(item);
        const badgeColor = getColorClass(item.tipo_aislamiento?.color_cartel);
        tr.innerHTML = `
            <td class="pathogen-name">${item.nombre_cientifico}</td>
            <td><span class="badge ${badgeColor}">${item.tipo_aislamiento?.nombre || 'Estándar'}</span></td>
        `;
        tbody.appendChild(tr);
    });
}

function openMedicalDetail(item) {
    currentPathogen = item;
    qs('#d-med-name').textContent = item.nombre_cientifico;
    qs('#d-med-iso').textContent = item.tipo_aislamiento?.nombre || 'Estándar';
    qs('#btn-isolation-med').className = `btn-isolation ${getColorClass(item.tipo_aislamiento?.color_cartel)}`;
    
    qs('#d-med-epp').innerHTML = (item.epp_requerido || []).map(e => `<li>${e}</li>`).join('');
    qs('#d-med-mec').innerHTML = (item.mecanismos_infeccion || []).map(m => `<li>${m}</li>`).join('');
    
    hide(qs('#medical-search-area'));
    show(qs('#medical-detail-area'));
}

function closeMedicalDetail() {
    show(qs('#medical-search-area'));
    hide(qs('#medical-detail-area'));
}

function openCriticalModal() {
    if (!currentPathogen || !currentPathogen.tipo_aislamiento) return;
    qs('#modal-desc').textContent = currentPathogen.tipo_aislamiento.descripcion_al_clic || '';
    qs('#modal-warnings').innerHTML = (currentPathogen.tipo_aislamiento.advertencias_criticas || []).map(w => `<li>${w}</li>`).join('');
    show(qs('#modal-critical'));
}
function closeCriticalModal() { hide(qs('#modal-critical')); }

// --- VISTA FAMILIA ---
function renderFamilyGrid(data) {
    const grid = qs('#results-grid-fam');
    grid.innerHTML = '';
    data.forEach(item => {
        const div = document.createElement('div');
        div.className = 'fam-item';
        div.onclick = () => openFamilyDetail(item);
        div.innerHTML = `
            <span style="font-weight: 500">${item.nombre_cientifico}</span>
            <span style="font-size: 1.2rem">➔</span>
        `;
        grid.appendChild(div);
    });
}

function openFamilyDetail(item) {
    qs('#d-fam-name').textContent = item.nombre_cientifico;
    
    const isoName = item.tipo_aislamiento?.nombre || 'Cuidados Estándar';
    const colorClass = getColorClass(item.tipo_aislamiento?.color_cartel);
    
    qs('#d-fam-badge').textContent = isoName;
    qs('#d-fam-badge').className = `badge ${colorClass}`;
    
    // Limpiamos clases previas y agregamos la nueva
    qs('#f-card-header').className = `family-card-header ${colorClass}`;
    
    qs('#d-fam-cuidados').textContent = item.cuidados_familia || 'Lavado de manos frecuente. Consulte a la enfermera para más indicaciones.';
    
    hide(qs('#family-search-area'));
    show(qs('#family-detail-area'));
}

function closeFamilyDetail() {
    show(qs('#family-search-area'));
    hide(qs('#family-detail-area'));
}

// --- ADMIN & LOGIN ---
function openAdminLogin() { show(qs('#modal-login')); qs('#login-error').classList.add('hidden'); }
function closeAdminLogin() { hide(qs('#modal-login')); }

async function loginAdmin() {
    const pwd = qs('#admin-password').value;
    try {
        const res = await fetch(`${API_BASE_URL}/auth`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({password: pwd})
        });
        const data = await res.json();
        
        if (data.success) {
            closeAdminLogin();
            goTo('admin');
            fetchPathogens('', 'admin');
        } else {
            show(qs('#login-error'));
        }
    } catch (e) {
        alert("Error de conexión");
    }
}

function renderAdminTable(data) {
    const tbody = qs('#results-body-admin');
    tbody.innerHTML = '';
    data.forEach(item => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${item.nombre_cientifico}</td>
            <td>${item.tipo_aislamiento?.nombre || '-'}</td>
            <td><button class="btn-danger" onclick="deletePathogen('${item._id}')">Borrar</button></td>
        `;
        tbody.appendChild(tr);
    });
}

async function deletePathogen(id) {
    if(!confirm("¿Seguro que quieres borrarlo?")) return;
    try {
        const res = await fetch(`${API_BASE_URL}/patogenos/${id}`, {method: 'DELETE'});
        if(res.ok) fetchPathogens('', 'admin');
    } catch (e) { alert("Error eliminando"); }
}

function openAddModal() { show(qs('#modal-add')); }
function closeAddModal() { hide(qs('#modal-add')); }

async function savePathogen() {
    const nombre = qs('#add-nombre').value;
    const isoVal = qs('#add-iso-tipo').value.split('|'); // ej: "Contacto|Amarillo"
    const epp = qs('#add-epp').value.split(',').map(s=>s.trim());
    const fam = qs('#add-fam').value;

    const body = {
        nombre_cientifico: nombre,
        tipo_aislamiento: {
            nombre: isoVal[0],
            color_cartel: isoVal[1],
            descripcion_al_clic: "",
            advertencias_criticas: []
        },
        epp_requerido: epp,
        mecanismos_infeccion: [],
        cuidados_familia: fam
    };

    try {
        const res = await fetch(`${API_BASE_URL}/patogenos`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(body)
        });
        if(res.ok) {
            closeAddModal();
            fetchPathogens('', 'admin');
        }
    } catch (e) { alert("Error guardando"); }
}
