const URL_DB = 'https://jwdmfrqkjdgzzggkiipt.supabase.co';
const KEY_DB = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp3ZG1mcnFramRnenpnZ2tpaXB0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0MjAzMzQsImV4cCI6MjA4Nzk5NjMzNH0.6ikNM6UWV2wnovIq4lo79tQpUX4rt3a66q5nTYZT9gY';
const _supabase = supabase.createClient(URL_DB, KEY_DB);
const TOTAL_ESPACIOS = 450;

let ticketActivoSalida = null;

lucide.createIcons();
setInterval(() => { document.getElementById('reloj').innerText = new Date().toLocaleTimeString(); }, 1000);

// ERROR 3: TÍTULOS DINÁMICOS
async function navegar(vista) {
    const titulos = {
        'registro': 'Registrar Vehículo',
        'salida': 'Salida de Vehículo',
        'ingresados': 'Vehículos en Cochera',
        'ingresos-dia': 'Ingresos del Día',
        'abonados': 'Control de Abonados',
        'tarifa': 'Tarifa Plana',
        'estadisticas': 'Estadísticas del Negocio'
    };

    const h2 = document.getElementById('tituloVista');
    if(h2) h2.innerText = titulos[vista] || 'Parking Pro';

    document.querySelectorAll('.view-section').forEach(s => s.classList.add('hidden'));
    document.querySelectorAll('.btn-nav').forEach(b => {
        b.className = "btn-nav whitespace-nowrap w-full flex items-center gap-4 px-4 py-3 text-blue-100 hover:bg-blue-700/50 rounded-xl transition-all font-medium text-left";
    });

    const btn = document.getElementById(`nav-${vista}`);
    if (btn) btn.className = "btn-nav whitespace-nowrap w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all font-semibold bg-blue-600 text-white shadow-lg border border-blue-400/30 text-left";

    const sec = document.getElementById(`sec-${vista}`);
    if (sec) sec.classList.remove('hidden');

    if (vista === 'ingresados') cargarEnCochera();
    if (vista === 'ingresos-dia') cargarHistorial();
    if (vista === 'tarifa') cargarTablaPlanas();
    if (vista === 'abonados') cargarAbonados();

    actualizarOcupacion();
}

// ERROR 1: LÍMITE DE CARACTERES
document.querySelectorAll('input[type="text"]').forEach(input => {
    input.addEventListener('input', (e) => {
        if(e.target.value.length > 12) e.target.value = e.target.value.substring(0, 12);
    });
});

// ERROR 2: REGISTRO E IMPRESIÓN DIRECTA
async function procesarEntrada() {
    const el = document.getElementById('placaInput');
    const placa = el.value.trim().toUpperCase();
    if(!placa) return;

    const { data, error } = await _supabase.from('tickets').insert([{ placa }]).select().single();
    
    if(!error) { 
        el.value = "";
        actualizarOcupacion();
        generarApartadoTicket(data);
        
        // Disparar impresión de inmediato
        setTimeout(() => {
            window.print();
            finalizarImpresion();
        }, 300);
    }
}

function generarApartadoTicket(datos) {
    const fecha = new Date(datos.fecha_entrada);
    document.getElementById('t-numero').innerText = `#${datos.id}`;
    document.getElementById('t-placa-ticket').innerText = datos.placa;
    document.getElementById('t-fecha').innerText = fecha.toLocaleDateString();
    document.getElementById('t-hora').innerText = fecha.toLocaleTimeString();
    document.getElementById('apartado-ticket').classList.remove('hidden');
    lucide.createIcons();
}

function finalizarImpresion() {
    document.getElementById('apartado-ticket').classList.add('hidden');
    document.getElementById('placaInput').focus();
}

// BÚSQUEDA PARA SALIDA
async function buscarTicketSalida() {
    const id = document.getElementById('codigoSalida').value.trim();
    if(!id) return;
    const { data, error } = await _supabase.from('tickets').select('*').eq('id', id).is('fecha_salida', null).single();
    if(error || !data) return alert("❌ Ticket no encontrado o ya salió");

    ticketActivoSalida = data;
    const diffMs = new Date() - new Date(data.fecha_entrada);
    const h = Math.floor(diffMs / 3600000);
    const m = Math.floor((diffMs % 3600000) / 60000);
    const s = Math.floor((diffMs % 60000) / 1000);
    
    let montoCalculado = (Math.floor(diffMs / 60000) > 15) ? Math.ceil((Math.floor(diffMs / 60000) - 15) / 60) * 5 : 0;

    document.getElementById('res-tiempo').innerText = `${h}h ${m}m ${s}s`;
    document.getElementById('res-monto').innerText = `S/ ${montoCalculado}.00`;
    document.getElementById('panelResultadoSalida').classList.remove('hidden');
    document.getElementById('btnBuscarSalida').classList.add('hidden');
    document.getElementById('btnFinalizarSalida').classList.remove('hidden');
    document.getElementById('btnFinalizarSalida').focus();
}

async function confirmarSalidaFinal() {
    if(!ticketActivoSalida) return;
    const salida = new Date();
    const diffMs = salida - new Date(ticketActivoSalida.fecha_entrada);
    const montoFinal = (Math.floor(diffMs / 60000) > 15) ? Math.ceil((Math.floor(diffMs / 60000) - 15) / 60) * 5 : 0;

    const { error } = await _supabase.from('tickets').update({ 
        fecha_salida: salida.toISOString(), 
        monto: montoFinal 
    }).eq('id', ticketActivoSalida.id);

    if(!error) { 
        actualizarOcupacion();
        generarBoletaSalida(ticketActivoSalida, salida, montoFinal, diffMs); 
        
        // Impresión directa boleta
        setTimeout(() => {
            window.print();
            imprimirBoletaFinal();
        }, 300);
    }
}

async function liberar(placa, id, entradaStr) {
    const entrada = new Date(entradaStr);
    const salida = new Date();
    const diffMs = salida - entrada;
    let montoFinal = (Math.floor(diffMs / 60000) > 15) ? Math.ceil((Math.floor(diffMs / 60000) - 15) / 60) * 5 : 0;

    const { error } = await _supabase.from('tickets').update({ 
        fecha_salida: salida.toISOString(), 
        monto: montoFinal 
    }).eq('id', id);

    if(!error) {
        actualizarOcupacion();
        generarBoletaSalida({id, placa, fecha_entrada: entradaStr}, salida, montoFinal, diffMs);
        cargarEnCochera();
        setTimeout(() => { window.print(); imprimirBoletaFinal(); }, 300);
    }
}

function generarBoletaSalida(datos, fechaOut, monto, ms) {
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    const s = Math.floor((ms % 60000) / 1000);

    document.getElementById('b-placa').innerText = datos.placa;
    document.getElementById('b-fecha').innerText = fechaOut.toLocaleDateString();
    document.getElementById('b-hora-in').innerText = new Date(datos.fecha_entrada).toLocaleTimeString();
    document.getElementById('b-hora-out').innerText = fechaOut.toLocaleTimeString();
    document.getElementById('b-tiempo').innerText = `${h}h ${m}m ${s}s`;
    document.getElementById('b-monto').innerText = `S/ ${monto}.00`;
    document.getElementById('apartado-boleta').classList.remove('hidden');
}

function imprimirBoletaFinal() {
    document.getElementById('apartado-boleta').classList.add('hidden');
    cargarHistorial(); 
    cargarEnCochera();
    resetearSalida();
}

function resetearSalida() {
    document.getElementById('codigoSalida').value = "";
    document.getElementById('panelResultadoSalida').classList.add('hidden');
    document.getElementById('btnBuscarSalida').classList.remove('hidden');
    document.getElementById('btnFinalizarSalida').classList.add('hidden');
    document.getElementById('placaInput').focus();
    ticketActivoSalida = null;
}

async function cargarEnCochera() {
    const { data } = await _supabase.from('tickets').select('*').is('fecha_salida', null).order('fecha_entrada', { ascending: false });
    const tabla = document.getElementById('tabla-adentro');
    if(!tabla) return;
    tabla.innerHTML = data.map(t => `
        <tr class="border-b font-medium italic">
            <td class="p-5 font-black text-blue-800 text-2xl tracking-tighter uppercase italic">${t.placa}</td>
            <td class="p-5 text-center font-mono italic text-slate-500">${new Date(t.fecha_entrada).toLocaleTimeString()}</td>
            <td class="p-5 text-right font-black text-blue-400">
                <button onclick="liberar('${t.placa}', ${t.id}, '${t.fecha_entrada}')" class="bg-red-500 text-white px-4 py-2 rounded-xl text-xs font-black hover:bg-red-700 shadow-md uppercase italic tracking-widest mr-4">Cobrar</button>
                ID: ${t.id}
            </td>
        </tr>`).join('');
}

async function cargarHistorial() {
    const { data } = await _supabase.from('tickets').select('*').not('fecha_salida', 'is', null).order('fecha_salida', { ascending: false });
    const tabla = document.getElementById('tabla-historial');
    if(!tabla) return;
    let sumaTotal = 0;
    tabla.innerHTML = data.map(t => {
        sumaTotal += (t.monto || 0);
        return `<tr class="border-b text-sm italic font-medium">
            <td class="p-5 font-black text-slate-800 uppercase text-lg italic tracking-tighter">${t.placa}</td>
            <td class="p-5 text-slate-400 font-mono italic">${new Date(t.fecha_entrada).toLocaleTimeString()}</td>
            <td class="p-5 text-slate-400 font-mono italic">${new Date(t.fecha_salida).toLocaleTimeString()}</td>
            <td class="p-5 text-right font-black text-green-600 text-xl tracking-tighter italic">S/ ${t.monto}.00</td>
        </tr>`;
    }).join('');
    const contador = document.getElementById('totalGanadoDia');
    if(contador) contador.innerText = `S/ ${sumaTotal.toFixed(2)}`;
}

// ERROR 4: CARGAR TABLA PLANAS DEL DÍA
async function cargarTablaPlanas() {
    const hoy = new Date().toISOString().split('T')[0];
    const { data, error } = await _supabase.from('tarifas_planas').select('*').gte('fecha_entrada', hoy).order('fecha_entrada', { ascending: false });
    const tbody = document.getElementById('tabla-planas-body');
    if(!tbody || error) return;
    tbody.innerHTML = data.map(t => `
        <tr class="border-b italic">
            <td class="p-4 font-black text-2xl">${t.placa}</td>
            <td class="p-4"><span class="px-3 py-1 rounded-full text-[9px] font-black uppercase ${t.estado_pago === 'pagado' ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}">${t.estado_pago}</span></td>
            <td class="p-4 text-right">${t.estado_pago === 'pendiente' ? `<button onclick="cobrarPlana(${t.id})" class="text-blue-600 underline font-black text-xs uppercase italic">Cobrar</button>` : 'COMPLETO'}</td>
        </tr>`).join('');
}

async function guardarPlana(estado) {
    const inputPlaca = document.getElementById('placaPlana');
    const placa = inputPlaca.value.trim().toUpperCase();
    if(!placa) return alert("¡Nicolás, falta la placa!");
    const { error } = await _supabase.from('tarifas_planas').insert([{ placa, estado_pago: estado }]);
    if(!error) { 
        inputPlaca.value = "";
        cargarTablaPlanas();
        actualizarOcupacion();
        alert("✅ Plana registrada!");
    }
}

async function registrarAbonado() {
    const placa = document.getElementById('placaAbonado').value.trim().toUpperCase();
    const datos = document.getElementById('datosAbonado').value.trim();
    if(!placa) return alert("Ingresa la placa del abonado");
    const hoy = new Date();
    const vence = new Date();
    vence.setDate(hoy.getDate() + 31);
    const { error } = await _supabase.from('abonados').upsert({ placa, datos_extra: datos, fecha_pago: hoy.toISOString(), fecha_vencimiento: vence.toISOString() }, { onConflict: 'placa' });
    if(!error) {
        document.getElementById('placaAbonado').value = "";
        document.getElementById('datosAbonado').value = "";
        cargarAbonados();
        actualizarOcupacion();
        alert("✅ Abonado renovado");
    }
}

async function cargarAbonados() {
    const { data } = await _supabase.from('abonados').select('*').order('fecha_vencimiento', { ascending: true });
    const tbody = document.getElementById('tabla-abonados-body');
    if (!tbody) return;
    const ahora = new Date();
    tbody.innerHTML = data.map(a => {
        const vence = new Date(a.fecha_vencimiento);
        const diffDias = Math.ceil((vence - ahora) / (1000 * 60 * 60 * 24));
        const esCritico = diffDias <= 3;
        return `<tr class="border-b ${esCritico ? 'bg-red-50' : ''}"><td class="p-5 font-black text-2xl italic uppercase">${a.placa}</td><td class="p-5 text-xs font-bold text-slate-500 italic">${a.datos_extra || '-'}</td><td class="p-5 font-black ${esCritico ? 'text-red-600' : 'text-blue-600'}">${diffDias > 0 ? `${diffDias} días` : 'VENCIDO'}</td><td class="p-5 text-right"><span class="px-3 py-1 rounded-full text-[10px] font-black uppercase ${esCritico ? 'bg-red-600 text-white' : 'bg-green-100 text-green-600'}">${esCritico ? 'Cobrar' : 'OK'}</span></td></tr>`;
    }).join('');
}

// ERROR 5: ACTUALIZACIÓN AUTOMÁTICA DE OCUPACIÓN
async function actualizarOcupacion() {
    const { count: tActivos } = await _supabase.from('tickets').select('*', { count: 'exact', head: true }).is('fecha_salida', null);
    const hoy = new Date().toISOString().split('T')[0];
    const { count: pActivas } = await _supabase.from('tarifas_planas').select('*', { count: 'exact', head: true }).gte('fecha_entrada', hoy);
    const { count: aVigentes } = await _supabase.from('abonados').select('*', { count: 'exact', head: true }).gt('fecha_vencimiento', new Date().toISOString());

    const ocupados = (tActivos || 0) + (pActivas || 0);
    const disponibles = TOTAL_ESPACIOS - ocupados;

    if(document.getElementById('count-disponible')) document.getElementById('count-disponible').innerText = disponibles;
    if(document.getElementById('count-tickets')) document.getElementById('count-tickets').innerText = ocupados;
    if(document.getElementById('count-abonados')) document.getElementById('count-abonados').innerText = aVigentes || 0;
}

window.addEventListener('keydown', (e) => {
    if(e.key === "Enter" && document.activeElement.id === "placaInput") procesarEntrada();
    if(e.key === "Enter" && document.activeElement.id === "codigoSalida") buscarTicketSalida();
});

window.onload = () => {
    actualizarOcupacion();
    navegar('registro');
};