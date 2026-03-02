const URL_DB = 'https://jwdmfrqkjdgzzggkiipt.supabase.co';
const KEY_DB = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp3ZG1mcnFramRnenpnZ2tpaXB0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0MjAzMzQsImV4cCI6MjA4Nzk5NjMzNH0.6ikNM6UWV2wnovIq4lo79tQpUX4rt3a66q5nTYZT9gY';
const _supabase = supabase.createClient(URL_DB, KEY_DB);

let ticketActivoSalida = null;

lucide.createIcons();
setInterval(() => { document.getElementById('reloj').innerText = new Date().toLocaleTimeString(); }, 1000);

async function navegar(vista) {
    document.querySelectorAll('.view-section').forEach(s => s.classList.add('hidden'));
    document.querySelectorAll('.btn-nav').forEach(b => {
        b.className = "btn-nav w-full flex items-center gap-4 px-4 py-3 text-blue-100 hover:bg-blue-700/50 rounded-xl transition-all font-medium text-left";
    });

    const btn = document.getElementById(`nav-${vista}`);
    if (btn) btn.className = "btn-nav w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all font-semibold bg-blue-600 text-white shadow-lg border border-blue-400/30 text-left";

    const sec = document.getElementById(`sec-${vista}`);
    if (sec) sec.classList.remove('hidden');

    if (vista === 'ingresados') cargarEnCochera();
    if (vista === 'ingresos-dia') cargarHistorial();
}

// INGRESO
async function procesarEntrada() {
    const el = document.getElementById('placaInput');
    const placa = el.value.trim().toUpperCase();
    if(!placa) return;
    const { data, error } = await _supabase.from('tickets').insert([{ placa }]).select().single();
    if(!error) { generarApartadoTicket(data); el.value = ""; }
}

function generarApartadoTicket(datos) {
    const fecha = new Date(datos.fecha_entrada);
    document.getElementById('t-numero').innerText = `#${datos.id}`;
    document.getElementById('t-placa-ticket').innerText = datos.placa;
    document.getElementById('t-fecha').innerText = fecha.toLocaleDateString();
    document.getElementById('t-hora').innerText = fecha.toLocaleTimeString();
    document.getElementById('apartado-ticket').classList.remove('hidden');
    document.getElementById('btnConfirmarTicket').focus();
    lucide.createIcons();
}

function finalizarImpresion() {
    window.print(); 
    document.getElementById('apartado-ticket').classList.add('hidden');
    document.getElementById('placaInput').focus();
}

// SALIDA POR CÓDIGO
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
    let monto = (Math.floor(diffMs / 60000) > 15) ? Math.ceil((Math.floor(diffMs / 60000) - 15) / 60) * 5 : 0;

    document.getElementById('res-tiempo').innerText = `${h}h ${m}m ${s}s`;
    document.getElementById('res-monto').innerText = `S/ ${monto}.00`;
    document.getElementById('panelResultadoSalida').classList.remove('hidden');
    document.getElementById('btnBuscarSalida').classList.add('hidden');
    document.getElementById('btnFinalizarSalida').classList.remove('hidden');
    document.getElementById('btnFinalizarSalida').focus();
}

// COBRAR DESDE TABLA O BUSCADOR
async function confirmarSalidaFinal() {
    const salida = new Date();
    const diffMs = salida - new Date(ticketActivoSalida.fecha_entrada);
    const monto = (Math.floor(diffMs / 60000) > 15) ? Math.ceil((Math.floor(diffMs / 60000) - 15) / 60) * 5 : 0;

    const { error } = await _supabase.from('tickets').update({ 
        fecha_salida: salida.toISOString(), 
        monto_total: monto 
    }).eq('id', ticketActivoSalida.id);

    if(!error) { 
        generarBoletaSalida(ticketActivoSalida, salida, monto, diffMs); 
    }
}

// Nueva función para el botón "Cobrar" de la tabla
async function liberar(placa, id, entradaStr) {
    const entrada = new Date(entradaStr);
    const salida = new Date();
    const diffMs = salida - entrada;
    const diffMin = Math.floor(diffMs / 60000);
    let monto = (diffMin > 15) ? Math.ceil((diffMin - 15) / 60) * 5 : 0;

    const { error } = await _supabase.from('tickets').update({ 
        fecha_salida: salida.toISOString(), 
        monto_total: monto 
    }).eq('id', id);

    if(!error) {
        const tempObj = { id, placa, fecha_entrada: entradaStr };
        generarBoletaSalida(tempObj, salida, monto, diffMs);
        cargarEnCochera();
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
    document.getElementById('btnImprimirBoleta').focus();
}

function imprimirBoletaFinal() {
    window.print();
    document.getElementById('apartado-boleta').classList.add('hidden');
    cargarHistorial(); // Refresca ingresos del día y contador
    cargarEnCochera(); // Refresca lista actual
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
    // Actualizamos la tabla para que use la función liberar() con el botón
    tabla.innerHTML = data.map(t => `
        <tr class="border-b font-medium italic">
            <td class="p-5 font-black text-blue-800 text-2xl tracking-tighter italic uppercase">${t.placa}</td>
            <td class="p-5 text-center font-mono italic text-slate-500">${new Date(t.fecha_entrada).toLocaleTimeString()}</td>
            <td class="p-5 text-right italic font-black text-blue-400">
                <button onclick="liberar('${t.placa}', ${t.id}, '${t.fecha_entrada}')" class="bg-red-500 text-white px-4 py-2 rounded-xl text-xs font-black hover:bg-red-700 shadow-md uppercase italic tracking-widest mr-4">Cobrar</button>
                ID: ${t.id}
            </td>
        </tr>`).join('');
}

async function cargarHistorial() {
    const { data } = await _supabase.from('tickets').select('*').not('fecha_salida', 'is', null).order('fecha_salida', { ascending: false });
    const tabla = document.getElementById('tabla-historial');
    let sumaTotal = 0;

    tabla.innerHTML = data.map(t => {
        sumaTotal += (t.monto_total || 0);
        return `
            <tr class="border-b text-sm italic font-medium">
                <td class="p-5 font-black text-slate-800 uppercase text-lg italic tracking-tighter font-black">${t.placa}</td>
                <td class="p-5 text-slate-400 font-mono italic">${new Date(t.fecha_entrada).toLocaleTimeString()}</td>
                <td class="p-5 text-slate-400 font-mono italic">${new Date(t.fecha_salida).toLocaleTimeString()}</td>
                <td class="p-5 text-right font-black text-green-600 text-xl tracking-tighter italic">S/ ${t.monto_total}.00</td>
            </tr>`;
    }).join('');

    // Actualizamos el contador de recaudación
    const contador = document.getElementById('totalGanadoDia');
    if(contador) contador.innerText = `S/ ${sumaTotal.toFixed(2)}`;
}

window.addEventListener('keydown', (e) => {
    if(e.key === "Enter" && document.activeElement.id === "placaInput") procesarEntrada();
    if(e.key === "Enter" && document.activeElement.id === "codigoSalida") buscarTicketSalida();
    if(e.key === "Escape") { 
        document.getElementById('apartado-ticket').classList.add('hidden'); 
        document.getElementById('apartado-boleta').classList.add('hidden'); 
    }
});