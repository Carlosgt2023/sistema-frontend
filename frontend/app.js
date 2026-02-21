// =============================================
// CONFIGURACIÓN DE LA API
// =============================================

// URL base de la API - CAMBIAR EN PRODUCCIÓN
const API_URL = 'https://sistema-backend-b3zt.onrender.com/api';

// =============================================
// VERIFICAR CONEXIÓN CON EL BACKEND
// =============================================

async function checkAPIConnection() {
    const statusEl = document.getElementById('apiStatus');
    
    try {
        // Mostrar estado "conectando"
        statusEl.textContent = '🟡 Conectando...';
        statusEl.classList.remove('connected', 'disconnected');
        statusEl.style.background = '#ffc107';
        
        // Intentar conexión con timeout de 60 segundos (Render puede tardar)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000);
        
        const response = await fetch('https://sistema-backend-b3zt.onrender.com/', {
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
            statusEl.textContent = '🟢 Conectado';
            statusEl.classList.remove('disconnected');
            statusEl.classList.add('connected');
            statusEl.style.background = '';
            return true;
        }
    } catch (error) {
        if (error.name === 'AbortError') {
            statusEl.textContent = '🔴 Tiempo agotado (Backend dormido)';
        } else {
            statusEl.textContent = '🔴 Desconectado';
        }
        statusEl.classList.remove('connected');
        statusEl.classList.add('disconnected');
        statusEl.style.background = '';
        
        // Mostrar sugerencia al usuario
        showAlert('El backend puede estar dormido. Espera 30 segundos y recarga la página.', 'warning');
        return false;
    }
}

// =============================================
// FUNCIONES AUXILIARES
// =============================================

function showAlert(message, type = 'success') {
    const alert = document.getElementById('globalAlert');
    alert.className = `alert alert-${type}`;
    alert.textContent = message;
    alert.style.display = 'block';
    
    setTimeout(() => {
        alert.style.display = 'none';
    }, 5000);
}

function showLoader(loaderId) {
    document.getElementById(loaderId).style.display = 'block';
}

function hideLoader(loaderId) {
    document.getElementById(loaderId).style.display = 'none';
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
}

function setTodayDate() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('purchaseDate').value = today;
    document.getElementById('rechargeDate').value = today;
    document.getElementById('reportEndDate').value = today;
    
    const monthAgo = new Date();
    monthAgo.setDate(monthAgo.getDate() - 30);
    document.getElementById('reportStartDate').value = monthAgo.toISOString().split('T')[0];
}

// =============================================
// GESTIÓN DE PESTAÑAS
// =============================================

function openTab(tabName) {
    const tabContents = document.getElementsByClassName('tab-content');
    for (let i = 0; i < tabContents.length; i++) {
        tabContents[i].classList.remove('active');
    }
    
    const tabButtons = document.getElementsByClassName('tab-button');
    for (let i = 0; i < tabButtons.length; i++) {
        tabButtons[i].classList.remove('active');
    }
    
    document.getElementById(tabName).classList.add('active');
    event.target.classList.add('active');
    
    // Cargar datos según la pestaña
    if (tabName === 'memberships') {
        loadMemberships();
    } else if (tabName === 'recharges') {
        loadRecharges();
    } else if (tabName === 'reports') {
        loadFinancialStats();
    } else if (tabName === 'notifications') {
        loadNotifications();
    }
}

// =============================================
// GESTIÓN DE MEMBRESÍAS
// =============================================

// Cargar todas las membresías
async function loadMemberships() {
    showLoader('membershipLoader');
    
    try {
        const status = document.getElementById('filterStatus').value;
        const search = document.getElementById('searchInput').value.trim();
        
        let url = `${API_URL}/memberships`;
        
        // Si hay filtros, usar endpoint de búsqueda
        if (status || search) {
            url = `${API_URL}/memberships/search/filter?`;
            if (status) url += `status=${status}&`;
            if (search) url += `search=${encodeURIComponent(search)}`;
        }
        
        const response = await fetch(url);
        const result = await response.json();
        
        if (result.success) {
            displayMemberships(result.data);
        } else {
            showAlert('Error al cargar membresías', 'danger');
        }
    } catch (error) {
        console.error('Error:', error);
        showAlert('Error de conexión con el servidor', 'danger');
    } finally {
        hideLoader('membershipLoader');
    }
}

// Mostrar membresías en la tabla
function displayMemberships(memberships) {
    const tableBody = document.getElementById('membershipTable');
    tableBody.innerHTML = '';
    
    if (memberships.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="9" style="text-align:center;">No hay membresías registradas</td></tr>';
        return;
    }
    
    memberships.forEach(membership => {
        const statusBadge = getStatusBadge(membership.status);
        
        const row = `
            <tr>
                <td>${membership.client_id}</td>
                <td>${membership.client_name}</td>
                <td>${membership.service_name}</td>
                <td>${membership.provider}</td>
                <td>${membership.duration} ${membership.duration == 1 ? 'Mes' : 'Meses'}</td>
                <td>${formatDate(membership.expiration_date)}</td>
                <td style="color: ${membership.profit >= 0 ? 'green' : 'red'}; font-weight: bold;">
                    Q ${parseFloat(membership.profit).toFixed(2)}
                </td>
                <td>${statusBadge}</td>
                <td>
                    <button class="btn btn-info" onclick="viewDetails(${membership.id})" title="Ver">👁️</button>
                    <button class="btn btn-warning" onclick="editMembership(${membership.id})" title="Editar">✏️</button>
                    <button class="btn btn-danger" onclick="deleteMembership(${membership.id})" title="Eliminar">🗑️</button>
                    <button class="btn btn-whatsapp" onclick="sendWhatsAppNotification(${membership.id})" title="WhatsApp">📱</button>
                </td>
            </tr>
        `;
        tableBody.innerHTML += row;
    });
}

function getStatusBadge(status) {
    const badges = {
        'active': '<span class="badge badge-active">Activo</span>',
        'expiring': '<span class="badge badge-expiring">Por Vencer</span>',
        'expired': '<span class="badge badge-expired">Vencido</span>'
    };
    return badges[status] || '<span class="badge badge-active">-</span>';
}

// Crear o actualizar membresía
document.getElementById('membershipForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const editId = document.getElementById('editId').value;
    const submitBtn = document.getElementById('submitBtn');
    submitBtn.disabled = true;
    
    const data = {
        client_id: document.getElementById('clientId').value,
        client_name: document.getElementById('clientName').value,
        service_name: document.getElementById('serviceName').value,
        provider: document.getElementById('provider').value,
        duration: parseInt(document.getElementById('duration').value),
        purchase_date: document.getElementById('purchaseDate').value,
        expiration_date: document.getElementById('expirationDate').value,
        purchase_price: parseFloat(document.getElementById('purchasePrice').value),
        sale_price: parseFloat(document.getElementById('salePrice').value),
        access_email: document.getElementById('accessEmail').value,
        access_password: document.getElementById('accessPassword').value,
        security_pin: document.getElementById('securityPin').value,
        profile_name: document.getElementById('profileName').value,
        whatsapp_number: document.getElementById('whatsappNumber').value
    };
    
    try {
        let url = `${API_URL}/memberships`;
        let method = 'POST';
        
        if (editId) {
            url += `/${editId}`;
            method = 'PUT';
        }
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showAlert(editId ? 'Membresía actualizada exitosamente' : 'Membresía creada exitosamente', 'success');
            clearForm();
            loadMemberships();
        } else {
            showAlert(result.message || 'Error al guardar membresía', 'danger');
        }
    } catch (error) {
        console.error('Error:', error);
        showAlert('Error de conexión con el servidor', 'danger');
    } finally {
        submitBtn.disabled = false;
    }
});

// Editar membresía
async function editMembership(id) {
    try {
        const response = await fetch(`${API_URL}/memberships/${id}`);
        const result = await response.json();
        
        if (result.success) {
            const m = result.data;
            
            document.getElementById('clientId').value = m.client_id;
            document.getElementById('clientName').value = m.client_name;
            document.getElementById('serviceName').value = m.service_name;
            document.getElementById('provider').value = m.provider;
            document.getElementById('duration').value = m.duration;
            document.getElementById('purchaseDate').value = m.purchase_date;
            document.getElementById('expirationDate').value = m.expiration_date;
            document.getElementById('purchasePrice').value = m.purchase_price;
            document.getElementById('salePrice').value = m.sale_price;
            document.getElementById('accessEmail').value = m.access_email;
            document.getElementById('accessPassword').value = m.access_password;
            document.getElementById('securityPin').value = m.security_pin || '';
            document.getElementById('profileName').value = m.profile_name || '';
            document.getElementById('whatsappNumber').value = m.whatsapp_number;
            document.getElementById('editId').value = id;
            
            document.getElementById('submitBtn').innerHTML = '🔄 Actualizar Membresía';
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    } catch (error) {
        console.error('Error:', error);
        showAlert('Error al cargar membresía', 'danger');
    }
}

// Eliminar membresía
async function deleteMembership(id) {
    if (!confirm('¿Está seguro de eliminar esta membresía?')) return;
    
    try {
        const response = await fetch(`${API_URL}/memberships/${id}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (result.success) {
            showAlert('Membresía eliminada exitosamente', 'success');
            loadMemberships();
        } else {
            showAlert('Error al eliminar membresía', 'danger');
        }
    } catch (error) {
        console.error('Error:', error);
        showAlert('Error de conexión con el servidor', 'danger');
    }
}

// Ver detalles
async function viewDetails(id) {
    try {
        const response = await fetch(`${API_URL}/memberships/${id}`);
        const result = await response.json();
        
        if (result.success) {
            const m = result.data;
            const statusBadge = getStatusBadge(m.status);
            
            const detailHTML = `
                <div style="line-height: 1.8;">
                    <h3 style="color: #667eea; margin-bottom: 15px;">Información del Cliente</h3>
                    <p><strong>Nombre:</strong> ${m.client_name}</p>
                    <p><strong>ID Cliente:</strong> ${m.client_id}</p>
                    <p><strong>WhatsApp:</strong> ${m.whatsapp_number}</p>
                    
                    <h3 style="color: #667eea; margin: 20px 0 15px 0;">Información del Servicio</h3>
                    <p><strong>Servicio:</strong> ${m.service_name}</p>
                    <p><strong>Proveedor:</strong> ${m.provider}</p>
                    <p><strong>Duración:</strong> ${m.duration} ${m.duration == 1 ? 'Mes' : 'Meses'}</p>
                    <p><strong>Estado:</strong> ${statusBadge}</p>
                    
                    <h3 style="color: #667eea; margin: 20px 0 15px 0;">Credenciales de Acceso</h3>
                    <p><strong>Correo:</strong> ${m.access_email}</p>
                    <p><strong>Contraseña:</strong> ${m.access_password}</p>
                    <p><strong>PIN:</strong> ${m.security_pin || 'N/A'}</p>
                    <p><strong>Perfil:</strong> ${m.profile_name || 'N/A'}</p>
                    
                    <h3 style="color: #667eea; margin: 20px 0 15px 0;">Información Financiera</h3>
                    <p><strong>Fecha de Compra:</strong> ${formatDate(m.purchase_date)}</p>
                    <p><strong>Fecha de Vencimiento:</strong> ${formatDate(m.expiration_date)}</p>
                    <p><strong>Precio de Compra:</strong> Q ${parseFloat(m.purchase_price).toFixed(2)}</p>
                    <p><strong>Precio de Venta:</strong> Q ${parseFloat(m.sale_price).toFixed(2)}</p>
                    <p><strong>Ganancia:</strong> <span style="color: ${m.profit >= 0 ? 'green' : 'red'}; font-weight: bold;">Q ${parseFloat(m.profit).toFixed(2)}</span></p>
                </div>
            `;
            
            document.getElementById('detailContent').innerHTML = detailHTML;
            document.getElementById('detailModal').style.display = 'block';
        }
    } catch (error) {
        console.error('Error:', error);
        showAlert('Error al cargar detalles', 'danger');
    }
}

function clearForm() {
    document.getElementById('membershipForm').reset();
    document.getElementById('editId').value = '';
    document.getElementById('submitBtn').innerHTML = '✅ Guardar Membresía';
    setTodayDate();
}

// Calcular fecha de vencimiento automáticamente
document.getElementById('duration').addEventListener('change', function() {
    const purchaseDate = document.getElementById('purchaseDate').value;
    const duration = parseInt(this.value);
    
    if (purchaseDate && duration) {
        const expiration = new Date(purchaseDate);
        expiration.setMonth(expiration.getMonth() + duration);
        document.getElementById('expirationDate').value = expiration.toISOString().split('T')[0];
    }
});

// =============================================
// GESTIÓN DE RECARGAS
// =============================================

async function loadRecharges() {
    showLoader('rechargeLoader');
    
    try {
        const response = await fetch(`${API_URL}/recharges`);
        const result = await response.json();
        
        if (result.success) {
            displayRecharges(result.data);
        }
    } catch (error) {
        console.error('Error:', error);
        showAlert('Error al cargar recargas', 'danger');
    } finally {
        hideLoader('rechargeLoader');
    }
}

function displayRecharges(recharges) {
    const tableBody = document.getElementById('rechargeTable');
    tableBody.innerHTML = '';
    
    if (recharges.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6" style="text-align:center;">No hay recargas registradas</td></tr>';
        return;
    }
    
    recharges.forEach(recharge => {
        const row = `
            <tr>
                <td>${recharge.client_id}</td>
                <td>${recharge.client_name || '-'}</td>
                <td>Q ${parseFloat(recharge.amount).toFixed(2)}</td>
                <td>${formatDate(recharge.recharge_date)}</td>
                <td>${recharge.note || '-'}</td>
                <td>
                    <button class="btn btn-danger" onclick="deleteRecharge(${recharge.id})">🗑️</button>
                </td>
            </tr>
        `;
        tableBody.innerHTML += row;
    });
}

document.getElementById('rechargeForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const data = {
        client_id: document.getElementById('rechargeClientId').value,
        amount: parseFloat(document.getElementById('rechargeAmount').value),
        recharge_date: document.getElementById('rechargeDate').value,
        note: document.getElementById('rechargeNote').value
    };
    
    try {
        const response = await fetch(`${API_URL}/recharges`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showAlert('Recarga registrada exitosamente', 'success');
            this.reset();
            setTodayDate();
            loadRecharges();
        } else {
            showAlert('Error al registrar recarga', 'danger');
        }
    } catch (error) {
        console.error('Error:', error);
        showAlert('Error de conexión', 'danger');
    }
});

async function deleteRecharge(id) {
    if (!confirm('¿Eliminar esta recarga?')) return;
    
    try {
        const response = await fetch(`${API_URL}/recharges/${id}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (result.success) {
            showAlert('Recarga eliminada', 'success');
            loadRecharges();
        }
    } catch (error) {
        console.error('Error:', error);
        showAlert('Error al eliminar', 'danger');
    }
}

// =============================================
// REPORTES FINANCIEROS
// =============================================

async function loadFinancialStats() {
    try {
        const response = await fetch(`${API_URL}/reports/summary`);
        const result = await response.json();
        
        if (result.success) {
            const data = result.data.overall;
            
            document.getElementById('totalRevenue').textContent = `Q ${data.totalRevenue.toFixed(2)}`;
            document.getElementById('totalCosts').textContent = `Q ${data.totalCosts.toFixed(2)}`;
            document.getElementById('netProfit').textContent = `Q ${data.netProfit.toFixed(2)}`;
            
            // Contar activos
            const statsResponse = await fetch(`${API_URL}/memberships/stats/summary`);
            const statsResult = await statsResponse.json();
            if (statsResult.success) {
                document.getElementById('activeMemberships').textContent = statsResult.data.active;
            }
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

async function generateReport() {
    showLoader('reportLoader');
    
    const startDate = document.getElementById('reportStartDate').value;
    const endDate = document.getElementById('reportEndDate').value;
    
    if (!startDate || !endDate) {
        showAlert('Por favor seleccione ambas fechas', 'warning');
        hideLoader('reportLoader');
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/reports/detailed?startDate=${startDate}&endDate=${endDate}`);
        const result = await response.json();
        
        if (result.success) {
            const tableBody = document.getElementById('reportTable');
            tableBody.innerHTML = '';
            
            result.details.forEach(item => {
                const row = `
                    <tr>
                        <td>${item.client_name}</td>
                        <td>${item.service_name}</td>
                        <td>${formatDate(item.purchase_date)}</td>
                        <td>Q ${parseFloat(item.purchase_price).toFixed(2)}</td>
                        <td>Q ${parseFloat(item.sale_price).toFixed(2)}</td>
                        <td style="color: ${item.profit >= 0 ? 'green' : 'red'}; font-weight: bold;">
                            Q ${parseFloat(item.profit).toFixed(2)}
                        </td>
                        <td>${parseFloat(item.margin_percentage).toFixed(2)}%</td>
                    </tr>
                `;
                tableBody.innerHTML += row;
            });
            
            // Fila de totales
            const summary = result.summary;
            const totalRow = `
                <tr style="background: #f8f9fa; font-weight: bold;">
                    <td colspan="3">TOTALES</td>
                    <td>Q ${summary.totalCosts.toFixed(2)}</td>
                    <td>Q ${summary.totalRevenue.toFixed(2)}</td>
                    <td style="color: ${summary.netProfit >= 0 ? 'green' : 'red'};">
                        Q ${summary.netProfit.toFixed(2)}
                    </td>
                    <td>${summary.overallMargin.toFixed(2)}%</td>
                </tr>
            `;
            tableBody.innerHTML += totalRow;
        }
    } catch (error) {
        console.error('Error:', error);
        showAlert('Error al generar reporte', 'danger');
    } finally {
        hideLoader('reportLoader');
    }
}

async function exportReport() {
    const startDate = document.getElementById('reportStartDate').value;
    const endDate = document.getElementById('reportEndDate').value;
    
    if (!startDate || !endDate) {
        showAlert('Por favor seleccione ambas fechas', 'warning');
        return;
    }
    
    window.open(`${API_URL}/reports/export?startDate=${startDate}&endDate=${endDate}`, '_blank');
}

// =============================================
// NOTIFICACIONES
// =============================================

async function loadNotifications() {
    showLoader('notificationLoader');
    
    try {
        const response = await fetch(`${API_URL}/notifications/pending`);
        const result = await response.json();
        
        if (result.success) {
            const tableBody = document.getElementById('notificationTable');
            tableBody.innerHTML = '';
            
            if (result.data.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="7" style="text-align:center;">No hay notificaciones pendientes</td></tr>';
                return;
            }
            
            result.data.forEach(item => {
                const statusBadge = item.days_until_expiry < 0 
                    ? '<span class="badge badge-expired">Vencido</span>'
                    : '<span class="badge badge-expiring">Por Vencer</span>';
                
                const row = `
                    <tr>
                        <td>${item.client_name}</td>
                        <td>${item.service_name}</td>
                        <td>${formatDate(item.expiration_date)}</td>
                        <td>${item.days_until_expiry} días</td>
                        <td>${statusBadge}</td>
                        <td>${item.whatsapp_number}</td>
                        <td>
                            <button class="btn btn-whatsapp" onclick="sendWhatsAppNotification(${item.id})">
                                📱 Enviar
                            </button>
                        </td>
                    </tr>
                `;
                tableBody.innerHTML += row;
            });
        }
    } catch (error) {
        console.error('Error:', error);
        showAlert('Error al cargar notificaciones', 'danger');
    } finally {
        hideLoader('notificationLoader');
    }
}

async function sendWhatsAppNotification(membershipId) {
    try {
        const response = await fetch(`${API_URL}/notifications/send`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ membershipId })
        });
        
        const result = await response.json();
        
        if (result.success) {
            window.open(result.data.whatsappUrl, '_blank');
            showAlert('Abriendo WhatsApp...', 'success');
        } else {
            showAlert('Error al preparar mensaje', 'danger');
        }
    } catch (error) {
        console.error('Error:', error);
        showAlert('Error de conexión', 'danger');
    }
}

// =============================================
// MODAL
// =============================================

function closeModal() {
    document.getElementById('detailModal').style.display = 'none';
}

window.onclick = function(event) {
    const modal = document.getElementById('detailModal');
    if (event.target == modal) {
        modal.style.display = 'none';
    }
}

// =============================================
// INICIALIZACIÓN
// =============================================

window.onload = async function() {
    setTodayDate();
    await checkAPIConnection();
    loadMemberships();
    loadFinancialStats();
};

// Verificar conexión cada 30 segundos
setInterval(checkAPIConnection, 30000);

// Mostrar mensaje cuando no hay resultados
function showNoResults(isEmpty) {
  const el = document.getElementById('noResults');
  if (!el) return;
  el.style.display = isEmpty ? 'block' : 'none';
}
