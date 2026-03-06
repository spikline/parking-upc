const URL_DB = 'https://jwdmfrqkjdgzzggkiipt.supabase.co';
const KEY_DB = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp3ZG1mcnFramRnenpnZ2tpaXB0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0MjAzMzQsImV4cCI6MjA4Nzk5NjMzNH0.6ikNM6UWV2wnovIq4lo79tQpUX4rt3a66q5nTYZT9gY';
const _supabase = supabase.createClient(URL_DB, KEY_DB);
const TOTAL_ESPACIOS = 450;

let ticketActivoSalida = null;
let chartIngresos = null;
let mesActual  = new Date().getMonth();
let anioActual = new Date().getFullYear();

lucide.createIcons();
setInterval(() => {
    const el = document.getElementById('reloj');
    if (el) el.innerText = new Date().toLocaleTimeString();
}, 1000);

// ─── NAVEGACIÓN ───────────────────────────────────────────────────────────────
async function navegar(vista) {
    const titulos = {
        'registro':     'Registrar Vehículo',
        'salida':       'Salida de Vehículo',
        'ingresados':   'Vehículos en Cochera',
        'ingresos-dia': 'Ingresos del Día',
        'abonados':     'Control de Abonados',
        'tarifa':       'Tarifa Plana',
        'estadisticas': 'Estadísticas del Negocio'
    };

    const h2 = document.getElementById('tituloVista');
    if (h2) h2.innerText = titulos[vista] || 'Parking Pro';

    document.querySelectorAll('.view-section').forEach(s => s.classList.add('hidden'));
    document.querySelectorAll('.btn-nav').forEach(b => {
        b.className = "btn-nav whitespace-nowrap w-full flex items-center gap-3 px-3 lg:px-4 py-2.5 lg:py-3 text-blue-100 hover:bg-white/10 rounded-xl transition-all font-medium text-sm text-left";
    });

    const btn = document.getElementById(`nav-${vista}`);
    if (btn) btn.className = "btn-nav whitespace-nowrap w-full flex items-center gap-3 px-3 lg:px-4 py-2.5 lg:py-3 rounded-xl transition-all font-bold text-sm bg-white/20 text-white border border-white/30 shadow-md text-left";

    const sec = document.getElementById(`sec-${vista}`);
    if (sec) sec.classList.remove('hidden');

    if (vista === 'ingresados')   cargarEnCochera();
    if (vista === 'ingresos-dia') cargarHistorial();
    if (vista === 'tarifa')       cargarTablaPlanas();
    if (vista === 'abonados')     cargarAbonados();
    if (vista === 'estadisticas') cargarEstadisticas();

    actualizarOcupacion();
}

// ─── LÍMITE DE CARACTERES ─────────────────────────────────────────────────────
document.querySelectorAll('input[type="text"]').forEach(input => {
    input.addEventListener('input', (e) => {
        if (e.target.value.length > 12) e.target.value = e.target.value.substring(0, 12);
    });
});

// ─── REGISTRO ─────────────────────────────────────────────────────────────────
async function procesarEntrada() {
    const el = document.getElementById('placaInput');
    const placa = el.value.trim().toUpperCase();
    if (!placa) return;

    const { data: yaAdentro } = await _supabase
        .from('tickets').select('id').eq('placa', placa).is('fecha_salida', null).maybeSingle();
    if (yaAdentro) {
        if (!confirm(`⚠️ La placa ${placa} ya tiene un ticket activo (#${yaAdentro.id}). ¿Registrar igual?`)) return;
    }

    const { data, error } = await _supabase.from('tickets').insert([{ placa }]).select().single();
    if (!error) {
        el.value = "";
        actualizarOcupacion();
        generarApartadoTicket(data);
        setTimeout(() => { window.print(); finalizarImpresion(); }, 300);
    } else {
        alert("❌ Error al registrar. Intenta de nuevo.");
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

// ─── SALIDA ───────────────────────────────────────────────────────────────────
async function buscarTicketSalida() {
    const id = document.getElementById('codigoSalida').value.trim();
    if (!id) return;

    const { data, error } = await _supabase
        .from('tickets').select('*').eq('id', id).is('fecha_salida', null).single();

    if (error || !data) return alert("❌ Ticket no encontrado o ya salió");

    ticketActivoSalida = data;
    const ahora  = new Date();
    const entrada = new Date(data.fecha_entrada);
    const diffMs  = ahora - entrada;
    const h = Math.floor(diffMs / 3600000);
    const m = Math.floor((diffMs % 3600000) / 60000);
    const s = Math.floor((diffMs % 60000) / 1000);
    let montoCalculado = (Math.floor(diffMs / 60000) > 15) ?
        Math.ceil((Math.floor(diffMs / 60000) - 15) / 60) * 5 : 0;

    document.getElementById('res-placa').innerText    = data.placa;
    document.getElementById('res-fecha-in').innerText = entrada.toLocaleDateString();
    document.getElementById('res-hora-in').innerText  = entrada.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    document.getElementById('res-fecha-out').innerText = ahora.toLocaleDateString();
    document.getElementById('res-hora-out').innerText  = ahora.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    document.getElementById('res-tiempo').innerText   = `${h}h ${m}m ${s}s`;
    document.getElementById('res-monto').innerText    = `S/ ${montoCalculado}.00`;

    document.getElementById('panelResultadoSalida').classList.remove('hidden');
    document.getElementById('btnBuscarSalida').classList.add('hidden');
    document.getElementById('btnFinalizarSalida').classList.remove('hidden');
    document.getElementById('btnFinalizarSalida').focus();
}

async function confirmarSalidaFinal() {
    if (!ticketActivoSalida) return;
    const salida = new Date();
    const diffMs = salida - new Date(ticketActivoSalida.fecha_entrada);
    const montoFinal = (Math.floor(diffMs / 60000) > 15) ? Math.ceil((Math.floor(diffMs / 60000) - 15) / 60) * 5 : 0;

    const { error } = await _supabase.from('tickets').update({
        fecha_salida: salida.toISOString(), monto: montoFinal
    }).eq('id', ticketActivoSalida.id);

    if (!error) {
        actualizarOcupacion();
        generarBoletaSalida(ticketActivoSalida, salida, montoFinal, diffMs);
        setTimeout(() => { window.print(); imprimirBoletaFinal(); }, 300);
    }
}

async function liberar(placa, id, entradaStr) {
    const entrada = new Date(entradaStr);
    const salida  = new Date();
    const diffMs  = salida - entrada;
    let montoFinal = (Math.floor(diffMs / 60000) > 15) ? Math.ceil((Math.floor(diffMs / 60000) - 15) / 60) * 5 : 0;

    const { error } = await _supabase.from('tickets').update({
        fecha_salida: salida.toISOString(), monto: montoFinal
    }).eq('id', id);

    if (!error) {
        actualizarOcupacion();
        generarBoletaSalida({ id, placa, fecha_entrada: entradaStr }, salida, montoFinal, diffMs);
        cargarEnCochera();
        setTimeout(() => { window.print(); imprimirBoletaFinal(); }, 300);
    }
}

function generarBoletaSalida(datos, fechaOut, monto, ms) {
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    document.getElementById('b-placa').innerText    = datos.placa;
    document.getElementById('b-fecha').innerText    = fechaOut.toLocaleDateString();
    document.getElementById('b-hora-in').innerText  = new Date(datos.fecha_entrada).toLocaleTimeString();
    document.getElementById('b-hora-out').innerText = fechaOut.toLocaleTimeString();
    document.getElementById('b-tiempo').innerText   = `${h}h ${m}m ${s}s`;
    document.getElementById('b-monto').innerText    = `S/ ${monto}.00`;
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

// ─── EN COCHERA ───────────────────────────────────────────────────────────────
async function cargarEnCochera() {
    const { data } = await _supabase.from('tickets').select('*').is('fecha_salida', null).order('fecha_entrada', { ascending: false });
    const tabla = document.getElementById('tabla-adentro');
    if (!tabla) return;
    if (!data || data.length === 0) {
        tabla.innerHTML = `<tr><td colspan="3" class="p-8 text-center text-slate-400 font-semibold italic">No hay vehículos en cochera ahora mismo</td></tr>`;
        return;
    }
    tabla.innerHTML = data.map(t => `
        <tr class="border-b font-medium italic">
            <td class="p-5 font-black text-blue-800 text-2xl tracking-tighter uppercase italic">${t.placa}</td>
            <td class="p-5 text-center font-mono italic text-slate-500">${new Date(t.fecha_entrada).toLocaleTimeString()}</td>
            <td class="p-5 text-right font-black text-blue-400">
                <button onclick="liberar('${t.placa}', ${t.id}, '${t.fecha_entrada}')"
                    class="bg-red-500 text-white px-4 py-2 rounded-xl text-xs font-black hover:bg-red-700 shadow-md uppercase italic tracking-widest mr-4">Cobrar</button>
                ID: ${t.id}
            </td>
        </tr>`).join('');
}

// ─── HISTORIAL DEL DÍA ────────────────────────────────────────────────────────
async function cargarHistorial() {
    const hoy = new Date();
    const inicioDia = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()).toISOString();
    const finDia    = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 23, 59, 59).toISOString();

    const { data } = await _supabase.from('tickets').select('*')
        .not('fecha_salida', 'is', null)
        .gte('fecha_salida', inicioDia).lte('fecha_salida', finDia)
        .order('fecha_salida', { ascending: false });

    const tabla = document.getElementById('tabla-historial');
    if (!tabla) return;
    let sumaTotal = 0;

    if (!data || data.length === 0) {
        tabla.innerHTML = `<tr><td colspan="5" class="p-8 text-center text-slate-400 font-semibold italic">Sin movimientos registrados hoy</td></tr>`;
        const contador = document.getElementById('totalGanadoDia');
        if (contador) contador.innerText = 'S/ 0.00';
        return;
    }

    tabla.innerHTML = data.map(t => {
        sumaTotal += (t.monto || 0);
        const diffMs = new Date(t.fecha_salida) - new Date(t.fecha_entrada);
        const h = Math.floor(diffMs / 3600000);
        const m = Math.floor((diffMs % 3600000) / 60000);
        const tiempoTexto = h > 0 ? `${h}h ${m}m` : `${m} min`;
        return `<tr class="border-b text-sm italic font-medium">
            <td class="p-5 font-black text-slate-800 uppercase text-lg italic tracking-tighter">${t.placa}</td>
            <td class="p-5 text-slate-400 font-mono italic">${new Date(t.fecha_entrada).toLocaleTimeString()}</td>
            <td class="p-5 text-slate-400 font-mono italic">${new Date(t.fecha_salida).toLocaleTimeString()}</td>
            <td class="p-5 font-black text-slate-600 italic font-mono">${tiempoTexto}</td>
            <td class="p-5 text-right font-black text-green-600 text-xl tracking-tighter italic">S/ ${t.monto}.00</td>
        </tr>`;
    }).join('');

    const contador = document.getElementById('totalGanadoDia');
    if (contador) contador.innerText = `S/ ${sumaTotal.toFixed(2)}`;
}

// ─── TARIFA PLANA ─────────────────────────────────────────────────────────────
async function cargarTablaPlanas() {
    const hoy = new Date().toISOString().split('T')[0];
    const { data, error } = await _supabase.from('tarifas_planas').select('*')
        .gte('fecha_entrada', hoy).order('fecha_entrada', { ascending: false });
    const tbody = document.getElementById('tabla-planas-body');
    if (!tbody || error) return;
    if (!data || data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="3" class="p-8 text-center text-slate-400 font-semibold italic">Sin tarifas planas registradas hoy</td></tr>`;
        return;
    }
    tbody.innerHTML = data.map(t => `
        <tr class="border-b italic">
            <td class="p-4 font-black text-2xl">${t.placa}</td>
            <td class="p-4"><span class="px-3 py-1 rounded-full text-[9px] font-black uppercase ${t.estado_pago === 'pagado' ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}">${t.estado_pago}</span></td>
            <td class="p-4 text-right">${t.estado_pago === 'pendiente'
                ? `<button onclick="cobrarPlana(${t.id})" class="bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-black hover:bg-blue-800 shadow-md uppercase italic">Cobrar S/25</button>`
                : `<span class="text-green-600 font-black text-xs uppercase italic">✓ Pagado</span>`
            }</td>
        </tr>`).join('');
}

async function cobrarPlana(id) {
    const { error } = await _supabase.from('tarifas_planas').update({ estado_pago: 'pagado' }).eq('id', id);
    if (!error) { cargarTablaPlanas(); actualizarOcupacion(); }
    else alert("❌ Error al cobrar. Intenta de nuevo.");
}

async function guardarPlana(estado) {
    const inputPlaca = document.getElementById('placaPlana');
    const placa = inputPlaca.value.trim().toUpperCase();
    if (!placa) return alert("¡Falta la placa!");
    const { error } = await _supabase.from('tarifas_planas').insert([{ placa, estado_pago: estado }]);
    if (!error) { inputPlaca.value = ""; cargarTablaPlanas(); actualizarOcupacion(); alert("✅ Tarifa plana registrada!"); }
    else alert("❌ Error al registrar. Intenta de nuevo.");
}

// ─── ABONADOS ─────────────────────────────────────────────────────────────────
async function registrarAbonado() {
    const placa = document.getElementById('placaAbonado').value.trim().toUpperCase();
    const datos = document.getElementById('datosAbonado').value.trim();
    if (!placa) return alert("Ingresa la placa del abonado");
    const hoy = new Date();
    const vence = new Date();
    vence.setDate(hoy.getDate() + 31);
    const { error } = await _supabase.from('abonados').upsert(
        { placa, datos_extra: datos, fecha_pago: hoy.toISOString(), fecha_vencimiento: vence.toISOString() },
        { onConflict: 'placa' }
    );
    if (!error) {
        document.getElementById('placaAbonado').value = "";
        document.getElementById('datosAbonado').value = "";
        cargarAbonados(); actualizarOcupacion();
        alert("✅ Abonado renovado por 31 días");
    } else alert("❌ Error al registrar. Intenta de nuevo.");
}

async function cargarAbonados() {
    const { data } = await _supabase.from('abonados').select('*').order('fecha_vencimiento', { ascending: true });
    const tbody = document.getElementById('tabla-abonados-body');
    if (!tbody) return;
    if (!data || data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="p-8 text-center text-slate-400 font-semibold italic">Sin abonados registrados</td></tr>`;
        return;
    }
    const ahora = new Date();
    const fF = (d) => d.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const fH = (d) => d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
    tbody.innerHTML = data.map(a => {
        const vence    = new Date(a.fecha_vencimiento);
        const pago     = new Date(a.fecha_pago);
        const diffDias = Math.ceil((vence - ahora) / (1000 * 60 * 60 * 24));
        const esCritico = diffDias <= 3;
        const esVencido = diffDias <= 0;
        return `<tr class="border-b ${esCritico ? 'bg-red-50' : ''}">
            <td class="p-5 font-black text-2xl italic uppercase">${a.placa}</td>
            <td class="p-5 text-xs font-bold text-slate-500 italic">${a.datos_extra || '-'}</td>
            <td class="p-5"><p class="font-black text-slate-700 text-sm">${fF(pago)}</p><p class="font-mono text-slate-400 text-xs">${fH(pago)}</p></td>
            <td class="p-5"><p class="font-black text-blue-600 text-sm">${fF(vence)}</p><p class="font-mono text-slate-400 text-xs">${esVencido ? 'VENCIDO' : `en ${diffDias} días`}</p></td>
            <td class="p-5 text-right"><span class="px-3 py-1 rounded-full text-[10px] font-black uppercase ${esCritico ? 'bg-red-600 text-white' : 'bg-green-100 text-green-600'}">${esCritico ? '⚠ Cobrar' : 'OK'}</span></td>
        </tr>`;
    }).join('');
}

// ─── OCUPACIÓN ────────────────────────────────────────────────────────────────
async function actualizarOcupacion() {
    const { count: tActivos } = await _supabase.from('tickets').select('*', { count: 'exact', head: true }).is('fecha_salida', null);
    const hoy = new Date().toISOString().split('T')[0];
    const { count: pActivas } = await _supabase.from('tarifas_planas').select('*', { count: 'exact', head: true }).gte('fecha_entrada', hoy);
    const { count: aVigentes } = await _supabase.from('abonados').select('*', { count: 'exact', head: true }).gt('fecha_vencimiento', new Date().toISOString());
    const ocupados    = (tActivos || 0) + (pActivas || 0);
    const disponibles = TOTAL_ESPACIOS - ocupados;
    if (document.getElementById('count-disponible')) document.getElementById('count-disponible').innerText = disponibles;
    if (document.getElementById('count-tickets'))    document.getElementById('count-tickets').innerText    = ocupados;
    if (document.getElementById('count-abonados'))   document.getElementById('count-abonados').innerText   = aVigentes || 0;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ─── ESTADÍSTICAS ─────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════
async function cargarEstadisticas() {
    actualizarTituloMes();
    await Promise.all([
        cargarCalendarioMes(),
        cargarResumenMes(),
        cargarCierreCajaHoy(),
        cargarGastos()
    ]);
}

function actualizarTituloMes() {
    const nombre = new Date(anioActual, mesActual, 1)
        .toLocaleDateString('es-PE', { month: 'long', year: 'numeric' });
    const el = document.getElementById('titulo-mes-calendario');
    if (el) el.innerText = nombre.charAt(0).toUpperCase() + nombre.slice(1);
}

function cambiarMes(delta) {
    mesActual += delta;
    if (mesActual > 11) { mesActual = 0; anioActual++; }
    if (mesActual < 0)  { mesActual = 11; anioActual--; }
    actualizarTituloMes();
    cargarCalendarioMes();
    cargarResumenMes();
    cargarGastos();
}

// ─── CALENDARIO MENSUAL ───────────────────────────────────────────────────────
async function cargarCalendarioMes() {
    const inicioMes = new Date(anioActual, mesActual, 1).toISOString();
    const finMes    = new Date(anioActual, mesActual + 1, 0, 23, 59, 59).toISOString();
    const inicioMesDate = new Date(anioActual, mesActual, 1).toISOString().split('T')[0];
    const finMesDate    = new Date(anioActual, mesActual + 1, 0).toISOString().split('T')[0];

    const [
        { data: tickets },
        { data: planas },
        { data: gastos },
        { data: cierres },
        { data: abonados }
    ] = await Promise.all([
        _supabase.from('tickets').select('fecha_salida, monto').not('fecha_salida', 'is', null).gte('fecha_salida', inicioMes).lte('fecha_salida', finMes),
        _supabase.from('tarifas_planas').select('fecha_entrada').eq('estado_pago', 'pagado').gte('fecha_entrada', inicioMesDate).lte('fecha_entrada', finMesDate),
        _supabase.from('gastos').select('fecha, monto, descripcion').gte('fecha', inicioMesDate).lte('fecha', finMesDate),
        _supabase.from('cierres_caja').select('fecha, efectivo, yape, notas').gte('fecha', inicioMesDate).lte('fecha', finMesDate),
        _supabase.from('abonados').select('fecha_pago').gte('fecha_pago', inicioMes).lte('fecha_pago', finMes)
    ]);

    const diasEnMes = new Date(anioActual, mesActual + 1, 0).getDate();
    const diasData  = {};

    for (let d = 1; d <= diasEnMes; d++) {
        const key = `${anioActual}-${String(mesActual + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
        diasData[key] = { tickets: 0, ticketsCount: 0, planas: 0, planasCount: 0, abonados: 0, abonadosCount: 0, gastos: 0, gastosDesc: [], cierre: null };
    }

    tickets?.forEach(t => {
        const key = t.fecha_salida.split('T')[0];
        if (diasData[key]) { diasData[key].tickets += (t.monto || 0); diasData[key].ticketsCount++; }
    });
    planas?.forEach(p => {
        const key = typeof p.fecha_entrada === 'string' ? p.fecha_entrada.split('T')[0] : p.fecha_entrada;
        if (diasData[key]) { diasData[key].planas += 25; diasData[key].planasCount++; }
    });
    abonados?.forEach(a => {
        const key = a.fecha_pago.split('T')[0];
        if (diasData[key]) { diasData[key].abonados += 450; diasData[key].abonadosCount++; }
    });
    gastos?.forEach(g => {
        const key = typeof g.fecha === 'string' ? g.fecha.split('T')[0] : g.fecha;
        if (diasData[key]) { diasData[key].gastos += (g.monto || 0); diasData[key].gastosDesc.push(g.descripcion); }
    });
    cierres?.forEach(c => {
        const key = c.fecha;
        if (diasData[key]) diasData[key].cierre = c;
    });

    const tbody  = document.getElementById('calendario-body');
    if (!tbody) return;

    const DIAS = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];
    const hoyStr = new Date().toISOString().split('T')[0];

    tbody.innerHTML = Object.entries(diasData).map(([key, d]) => {
        const fecha     = new Date(key + 'T12:00:00');
        const diaSemana = DIAS[(fecha.getDay() + 6) % 7];
        const numDia    = fecha.getDate();
        const esDomingo = fecha.getDay() === 0;
        const esSabado  = fecha.getDay() === 6;
        const esHoy     = key === hoyStr;
        const esFuturo  = key > hoyStr;
        const total     = d.tickets + d.planas + d.abonados;
        const neto      = total - d.gastos;
        const tieneDatos = total > 0 || d.gastos > 0;

        const colDia = esSabado ? 'text-blue-500' : esDomingo ? 'text-red-400' : 'text-slate-400';

        return `<tr class="border-b transition-colors ${esHoy ? 'bg-blue-50' : ''} ${esDomingo && !esHoy ? 'bg-red-50/20' : ''} ${esFuturo ? 'opacity-40' : ''}">
            <td class="p-3 lg:p-4">
                <div class="flex items-center gap-2 flex-wrap">
                    <span class="text-[10px] font-black uppercase ${colDia} w-7">${diaSemana}</span>
                    <span class="text-lg lg:text-xl font-black ${esHoy ? 'text-blue-600' : 'text-slate-700'}">${numDia}</span>
                    ${esHoy ? `<span class="text-[8px] bg-blue-600 text-white px-1.5 py-0.5 rounded-full font-black uppercase">Hoy</span>` : ''}
                </div>
            </td>
            <td class="p-3 lg:p-4 text-right">
                ${d.ticketsCount > 0
                    ? `<p class="font-black text-slate-800 text-sm">S/ ${d.tickets.toFixed(0)}</p><p class="text-[9px] text-slate-400 font-bold">${d.ticketsCount} veh.</p>`
                    : `<p class="text-slate-300 text-xs">—</p>`}
            </td>
            <td class="p-3 lg:p-4 text-right">
                ${d.planasCount > 0
                    ? `<p class="font-black text-purple-600 text-sm">S/ ${d.planas.toFixed(0)}</p><p class="text-[9px] text-slate-400 font-bold">${d.planasCount} planas</p>`
                    : `<p class="text-slate-300 text-xs">—</p>`}
            </td>
            <td class="p-3 lg:p-4 text-right">
                ${d.abonadosCount > 0
                    ? `<p class="font-black text-blue-600 text-sm">S/ ${d.abonados.toFixed(0)}</p><p class="text-[9px] text-slate-400 font-bold">${d.abonadosCount} abonados</p>`
                    : `<p class="text-slate-300 text-xs">—</p>`}
            </td>
            <td class="p-3 lg:p-4 text-right">
                ${d.gastos > 0
                    ? `<p class="font-black text-red-500 text-sm">- S/ ${d.gastos.toFixed(0)}</p><p class="text-[9px] text-slate-400 font-bold" title="${d.gastosDesc.join(', ')}">${d.gastosDesc.length} gasto(s)</p>`
                    : `<p class="text-slate-300 text-xs">—</p>`}
            </td>
            <td class="p-3 lg:p-4 text-right">
                ${tieneDatos
                    ? `<p class="font-black text-base lg:text-lg ${neto >= 0 ? 'text-green-600' : 'text-red-600'}">S/ ${neto.toFixed(0)}</p>`
                    : `<p class="text-slate-300 text-xs">—</p>`}
            </td>
            <td class="p-3 lg:p-4 text-center">
                ${d.cierre
                    ? `<div><p class="text-[9px] font-black text-green-600 uppercase">✓ Cerrado</p><p class="text-[9px] text-slate-400">Ef: S/${d.cierre.efectivo} / Yape: S/${d.cierre.yape}</p></div>`
                    : esHoy
                        ? `<button onclick="scrollACierreCaja()" class="text-[9px] bg-blue-600 text-white px-2 py-1 rounded-lg font-black uppercase hover:bg-blue-800 transition-colors">Cerrar Caja</button>`
                        : `<p class="text-slate-300 text-xs">—</p>`
                }
            </td>
        </tr>`;
    }).join('');
}

function scrollACierreCaja() {
    document.getElementById('sec-cierre-caja')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ─── RESUMEN DEL MES ──────────────────────────────────────────────────────────
async function cargarResumenMes() {
    const inicioMes     = new Date(anioActual, mesActual, 1).toISOString();
    const finMes        = new Date(anioActual, mesActual + 1, 0, 23, 59, 59).toISOString();
    const inicioMesDate = new Date(anioActual, mesActual, 1).toISOString().split('T')[0];
    const finMesDate    = new Date(anioActual, mesActual + 1, 0).toISOString().split('T')[0];

    const [
        { data: tickets },
        { data: planas },
        { data: gastos },
        { data: abonados }
    ] = await Promise.all([
        _supabase.from('tickets').select('monto, fecha_salida').not('fecha_salida', 'is', null).gte('fecha_salida', inicioMes).lte('fecha_salida', finMes),
        _supabase.from('tarifas_planas').select('id').eq('estado_pago', 'pagado').gte('fecha_entrada', inicioMesDate).lte('fecha_entrada', finMesDate),
        _supabase.from('gastos').select('monto').gte('fecha', inicioMesDate).lte('fecha', finMesDate),
        _supabase.from('abonados').select('id').gte('fecha_pago', inicioMes).lte('fecha_pago', finMes)
    ]);

    const totalTickets  = tickets?.reduce((s, t) => s + (t.monto || 0), 0) || 0;
    const totalPlanas   = (planas?.length  || 0) * 25;
    const totalAbonados = (abonados?.length || 0) * 450;
    const totalGastos   = gastos?.reduce((s, g) => s + (g.monto || 0), 0) || 0;
    const totalIngresos = totalTickets + totalPlanas + totalAbonados;
    const gananciaNeta  = totalIngresos - totalGastos;

    // Día más rentable del mes
    const porDia = {};
    tickets?.forEach(t => {
        const key = t.fecha_salida.split('T')[0];
        porDia[key] = (porDia[key] || 0) + (t.monto || 0);
    });
    planas?.forEach(p => {
        const key = typeof p.fecha_entrada === 'string' ? p.fecha_entrada.split('T')[0] : String(p.fecha_entrada);
        porDia[key] = (porDia[key] || 0) + 25;
    });
    let mejorDia = '---', mejorMonto = 0;
    Object.entries(porDia).forEach(([d, m]) => {
        if (m > mejorMonto) { mejorMonto = m; mejorDia = new Date(d + 'T12:00:00').toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit' }); }
    });

    const diasConDatos = Object.keys(porDia).length;
    const promedio     = diasConDatos > 0 ? totalIngresos / diasConDatos : 0;

    const set = (id, val) => { const el = document.getElementById(id); if (el) el.innerText = val; };
    set('res-total-tickets',   `S/ ${totalTickets.toFixed(2)}`);
    set('res-total-planas',    `S/ ${totalPlanas.toFixed(2)}`);
    set('res-total-abonados',  `S/ ${totalAbonados.toFixed(2)}`);
    set('res-total-gastos',    `S/ ${totalGastos.toFixed(2)}`);
    set('res-total-ingresos',  `S/ ${totalIngresos.toFixed(2)}`);
    set('res-ganancia-neta',   `S/ ${gananciaNeta.toFixed(2)}`);
    set('res-count-tickets',   tickets?.length  || 0);
    set('res-count-planas',    planas?.length   || 0);
    set('res-count-abonados',  abonados?.length || 0);
    set('res-promedio-diario', `S/ ${promedio.toFixed(2)}`);
    set('res-mejor-dia',       mejorDia !== '---' ? `${mejorDia} (S/ ${mejorMonto})` : '---');
}

// ─── CIERRE DE CAJA ───────────────────────────────────────────────────────────
async function cargarCierreCajaHoy() {
    const hoy       = new Date().toISOString().split('T')[0];
    const inicioHoy = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()).toISOString();
    const finHoy    = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate(), 23, 59, 59).toISOString();

    const [
        { data: tickets },
        { data: planas },
        { data: abonados },
        { data: cierre }
    ] = await Promise.all([
        _supabase.from('tickets').select('monto').not('fecha_salida', 'is', null).gte('fecha_salida', inicioHoy).lte('fecha_salida', finHoy),
        _supabase.from('tarifas_planas').select('id').eq('estado_pago', 'pagado').gte('fecha_entrada', hoy).lte('fecha_entrada', hoy),
        _supabase.from('abonados').select('id').gte('fecha_pago', inicioHoy).lte('fecha_pago', finHoy),
        _supabase.from('cierres_caja').select('*').eq('fecha', hoy).maybeSingle()
    ]);

    const totalTickets  = tickets?.reduce((s, t) => s + (t.monto || 0), 0) || 0;
    const totalPlanas   = (planas?.length  || 0) * 25;
    const totalAbonados = (abonados?.length || 0) * 450;
    const totalAuto     = totalTickets + totalPlanas + totalAbonados;

    const set = (id, val) => { const el = document.getElementById(id); if (el) el.innerText = val; };
    set('cierre-auto-tickets',  `S/ ${totalTickets.toFixed(2)} (${tickets?.length || 0} vehículos)`);
    set('cierre-auto-planas',   `S/ ${totalPlanas.toFixed(2)} (${planas?.length || 0} planas)`);
    set('cierre-auto-abonados', `S/ ${totalAbonados.toFixed(2)} (${abonados?.length || 0} renovaciones)`);
    set('cierre-auto-total',    `S/ ${totalAuto.toFixed(2)}`);

    if (cierre) {
        const totalManual = (cierre.efectivo || 0) + (cierre.yape || 0);
        const diff = totalAuto - totalManual;
        set('cierre-efectivo-guardado', `S/ ${cierre.efectivo}`);
        set('cierre-yape-guardado',     `S/ ${cierre.yape}`);
        set('cierre-notas-guardado',    cierre.notas || '—');
        set('cierre-diferencia',        diff === 0 ? '✓ Cuadra perfecto' : `Diferencia: ${diff > 0 ? '+' : ''}S/ ${diff.toFixed(2)}`);
        const elDif = document.getElementById('cierre-diferencia');
        if (elDif) elDif.className = `font-black text-lg ${diff === 0 ? 'text-green-600' : 'text-red-500'}`;
        document.getElementById('panel-cierre-guardado')?.classList.remove('hidden');
        document.getElementById('panel-cierre-form')?.classList.add('hidden');
    } else {
        document.getElementById('panel-cierre-guardado')?.classList.add('hidden');
        document.getElementById('panel-cierre-form')?.classList.remove('hidden');
    }
}

async function guardarCierreCaja() {
    const efectivo = parseFloat(document.getElementById('input-efectivo').value) || 0;
    const yape     = parseFloat(document.getElementById('input-yape').value)     || 0;
    const notas    = document.getElementById('input-notas-cierre').value.trim();
    const hoy      = new Date().toISOString().split('T')[0];

    if (efectivo === 0 && yape === 0) return alert("Ingresa al menos el efectivo o el yape del día");

    const { error } = await _supabase.from('cierres_caja').upsert(
        { fecha: hoy, efectivo, yape, notas },
        { onConflict: 'fecha' }
    );

    if (!error) {
        document.getElementById('input-efectivo').value      = "";
        document.getElementById('input-yape').value          = "";
        document.getElementById('input-notas-cierre').value  = "";
        await cargarCierreCajaHoy();
        await cargarCalendarioMes();
        alert("✅ Caja cerrada correctamente");
    } else {
        alert("❌ Error al guardar. Verifica que la tabla 'cierres_caja' existe y que la columna 'fecha' tiene restricción UNIQUE.");
    }
}

// ─── GASTOS ───────────────────────────────────────────────────────────────────
async function registrarGasto() {
    const desc  = document.getElementById('gastoDescripcion').value.trim();
    const monto = parseFloat(document.getElementById('gastoMonto').value);
    if (!desc || isNaN(monto) || monto <= 0) return alert("Completa descripción y monto válido");

    const hoy = new Date().toISOString().split('T')[0];
    const { error } = await _supabase.from('gastos').insert([{ descripcion: desc, monto, fecha: hoy }]);

    if (!error) {
        document.getElementById('gastoDescripcion').value = "";
        document.getElementById('gastoMonto').value       = "";
        await cargarEstadisticas();
        alert("✅ Gasto registrado");
    } else {
        alert("❌ Error al guardar gasto.");
    }
}

async function cargarGastos() {
    const inicioMesDate = new Date(anioActual, mesActual, 1).toISOString().split('T')[0];
    const finMesDate    = new Date(anioActual, mesActual + 1, 0).toISOString().split('T')[0];

    const { data } = await _supabase.from('gastos').select('*')
        .gte('fecha', inicioMesDate).lte('fecha', finMesDate)
        .order('fecha', { ascending: false });

    const tbody = document.getElementById('tabla-gastos-body');
    if (!tbody) return;

    if (!data || data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="3" class="p-6 text-center text-slate-400 italic font-semibold">Sin gastos registrados este mes</td></tr>`;
        return;
    }

    tbody.innerHTML = data.map(g => {
        const fecha = new Date(g.fecha + 'T12:00:00');
        return `<tr class="border-b italic">
            <td class="p-4 font-semibold text-slate-700">${g.descripcion}</td>
            <td class="p-4 text-slate-400 font-mono text-sm">${fecha.toLocaleDateString('es-PE', { day:'2-digit', month:'2-digit', year:'numeric' })}</td>
            <td class="p-4 text-right font-black text-red-500">- S/ ${Number(g.monto).toFixed(2)}</td>
        </tr>`;
    }).join('');
}

// ─── TECLADO ──────────────────────────────────────────────────────────────────
window.addEventListener('keydown', (e) => {
    if (e.key === "Enter" && document.activeElement.id === "placaInput")   procesarEntrada();
    if (e.key === "Enter" && document.activeElement.id === "codigoSalida") buscarTicketSalida();
});

// ─── INICIO ───────────────────────────────────────────────────────────────────
window.onload = () => {
    actualizarOcupacion();
    navegar('registro');
};