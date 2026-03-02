const URL_DB = 'https://jwdmfrqkjdgzzggkiipt.supabase.co';
const KEY_DB = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp3ZG1mcnFramRnenpnZ2tpaXB0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0MjAzMzQsImV4cCI6MjA4Nzk5NjMzNH0.6ikNM6UWV2wnovIq4lo79tQpUX4rt3a66q5nTYZT9gY';
const _supabase = supabase.createClient(URL_DB, KEY_DB);

let ticketActivoParaSalida = null;

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

async function procesarEntrada() {
    const el = document.getElementById('placaInput');
    const placa = el.value.trim().toUpperCase();
    if(!placa) return alert("Escribe la placa");

    const { data, error } = await _supabase.from('tickets').insert([{ placa }]).select().single();

    if(error) {
        alert("Error: " + error.message);
    } else {
        generarApartadoTicket(data);
        el.value = "";
    }
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

// NUEVA LÓGICA DE SALIDA POR CÓDIGO
async function buscarTicketSalida() {
    const idTicket = document.getElementById('codigoSalida').value.trim();
    if(!idTicket) return;

    const { data, error } = await _supabase.from('tickets').select('*').eq('id', idTicket).is('fecha_salida', null).single();
    if(error || !data) return alert("❌ Ticket no encontrado o ya salió");

    ticketActivoParaSalida = data;
    const entrada = new Date(data.fecha_entrada);
    const ahora = new Date();
    const diffMs = ahora - entrada;

    // Calculo HH:MM:SS
    const horas = Math.floor(diffMs / 3600000);
    const minutos = Math.floor((diffMs % 3600000) / 60000);
    const segundos = Math.floor((diffMs % 60000) / 1000);

    // Calculo Monto (15 min tolerancia)
    const minutosTotales = Math.floor(diffMs / 60000);
    let monto = (minutosTotales > 15) ? Math.ceil((minutosTotales - 15) / 60) * 5 : 0;

    document.getElementById('res-tiempo').innerText = `${horas}h ${minutos}m ${segundos}s`;
    document.getElementById('res-monto').innerText = `S/ ${monto}.00`;
    document.getElementById('res-entrada').innerText = entrada.toLocaleString();
    document.getElementById('res-salida').innerText = ahora.toLocaleString();

    document.getElementById('panelResultadoSalida').classList.remove('hidden');
    document.getElementById('btnBuscarSalida').classList.add('hidden');
    document.getElementById('btnFinalizarSalida').classList.remove('hidden');
    document.getElementById('btnFinalizarSalida').focus();
}

async function confirmarSalidaFinal() {
    const salida = new Date();
    const entrada = new Date(ticketActivoParaSalida.fecha_entrada);
    const diffMs = salida - entrada;
    const diffMin = Math.floor(diffMs / 60000);
    
    // Lógica de 15 min tolerancia [cite: 2026-02-19]
    const monto = (diffMin > 15) ? Math.ceil((diffMin - 15) / 60) * 5 : 0; 

    const { error } = await _supabase.from('tickets').update({ 
        fecha_salida: salida.toISOString(), 
        monto_total: monto 
    }).eq('id', ticketActivoParaSalida.id);

    if(!error) {
        generarBoletaSalida(ticketActivoParaSalida, salida, monto, diffMs);
    }
}

// Llena el nuevo apartado de boleta
function generarBoletaSalida(datos, fechaSalida, monto, diffMs) {
    const entrada = new Date(datos.fecha_entrada);
    
    // Formatear tiempo HH:MM:SS para la boleta [cite: 2026-03-02]
    const horas = Math.floor(diffMs / 3600000);
    const minutos = Math.floor((diffMs % 3600000) / 60000);
    const segundos = Math.floor((diffMs % 60000) / 1000);

    document.getElementById('b-placa').innerText = datos.placa;
    document.getElementById('b-fecha').innerText = fechaSalida.toLocaleDateString();
    document.getElementById('b-hora-in').innerText = entrada.toLocaleTimeString();
    document.getElementById('b-hora-out').innerText = fechaSalida.toLocaleTimeString();
    document.getElementById('b-tiempo').innerText = `${horas}h ${minutos}m ${segundos}s`;
    document.getElementById('b-monto').innerText = `S/ ${monto}.00`;

    document.getElementById('apartado-boleta').classList.remove('hidden');
    document.getElementById('btnImprimirBoleta').focus();
}

function imprimirBoletaFinal() {
    window.print();
    document.getElementById('apartado-boleta').classList.add('hidden');
    resetearSalida(); // Limpia la pantalla de salida y regresa al buscador
}

function resetearSalida() {
    document.getElementById('codigoSalida').value = "";
    document.getElementById('panelResultadoSalida').classList.add('hidden');
    document.getElementById('btnBuscarSalida').classList.remove('hidden');
    document.getElementById('btnFinalizarSalida').classList.add('hidden');
    ticketActivoParaSalida = null;
}

async function cargarEnCochera() {
    const { data } = await _supabase.from('tickets').select('*').is('fecha_salida', null).order('fecha_entrada', { ascending: false });
    const tabla = document.getElementById('tabla-adentro');
    tabla.innerHTML = data.map(t => `
        <tr class="border-b border-slate-50 font-medium italic">
            <td class="p-5 font-black text-blue-800 text-2xl tracking-tighter italic uppercase">${t.placa}</td>
            <td class="p-5 text-center text-slate-500 font-mono italic">${new Date(t.fecha_entrada).toLocaleTimeString()}</td>
            <td class="p-5 text-right italic font-black text-blue-400">ID: ${t.id}</td>
        </tr>`).join('');
}

async function cargarHistorial() {
    const { data } = await _supabase.from('tickets').select('*').not('fecha_salida', 'is', null).order('fecha_salida', { ascending: false });
    const tabla = document.getElementById('tabla-historial');
    tabla.innerHTML = data.map(t => `
        <tr class="border-b text-sm italic font-medium">
            <td class="p-5 font-bold text-slate-800 uppercase text-lg tracking-tighter font-black">${t.placa}</td>
            <td class="p-5 text-slate-400 font-mono italic">${new Date(t.fecha_entrada).toLocaleTimeString()}</td>
            <td class="p-5 text-slate-400 font-mono italic">${new Date(t.fecha_salida).toLocaleTimeString()}</td>
            <td class="p-5 text-right font-black text-green-600 text-xl tracking-tighter italic">S/ ${t.monto_total}.00</td>
        </tr>`).join('');
}

window.addEventListener('keydown', (e) => {
    if(e.key === "Enter" && document.activeElement.id === "placaInput") procesarEntrada();
    if(e.key === "Enter" && document.activeElement.id === "codigoSalida") buscarTicketSalida();
    if(e.key === "Escape") document.getElementById('apartado-ticket').classList.add('hidden');
});