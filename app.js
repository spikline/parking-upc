const URL_DB = 'https://jwdmfrqkjdgzzggkiipt.supabase.co';
const KEY_DB = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp3ZG1mcnFramRnenpnZ2tpaXB0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0MjAzMzQsImV4cCI6MjA4Nzk5NjMzNH0.6ikNM6UWV2wnovIq4lo79tQpUX4rt3a66q5nTYZT9gY';
const _supabase = supabase.createClient(URL_DB, KEY_DB);

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

// LÓGICA DE REGISTRO E IMPRESIÓN
async function procesarEntrada() {
    const el = document.getElementById('placaInput');
    const placa = el.value.trim().toUpperCase();
    if(!placa) return alert("Escribe la placa");

    // Insertar y obtener datos generados por Supabase
    const { data, error } = await _supabase
        .from('tickets')
        .insert([{ placa }])
        .select()
        .single();

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

async function cargarEnCochera() {
    const { data } = await _supabase.from('tickets').select('*').is('fecha_salida', null).order('fecha_entrada', { ascending: false });
    const tabla = document.getElementById('tabla-adentro');
    tabla.innerHTML = data.map(t => `
        <tr class="border-b border-slate-50 font-medium">
            <td class="p-5 font-black text-blue-800 text-2xl tracking-tighter">${t.placa}</td>
            <td class="p-5 text-center text-slate-500 font-mono italic">${new Date(t.fecha_entrada).toLocaleTimeString()}</td>
            <td class="p-5 text-right"><button onclick="liberar('${t.placa}', ${t.id}, '${t.fecha_entrada}')" class="bg-red-500 text-white px-4 py-2 rounded-xl text-xs font-black hover:bg-red-700 shadow-md uppercase italic tracking-widest">Cobrar</button></td>
        </tr>`).join('');
}

async function liberar(placa, id, entradaStr) {
    const entrada = new Date(entradaStr);
    const salida = new Date();
    const diff = Math.floor((salida - entrada) / 60000);
    let monto = (diff > 15) ? Math.ceil((diff - 15) / 60) * 5 : 0; 

    const { error } = await _supabase.from('tickets').update({ fecha_salida: salida.toISOString(), monto_total: monto }).eq('id', id);
    if(!error) { alert(`COBRO: S/ ${monto}.00 (Tiempo: ${diff} min)`); cargarEnCochera(); }
}

async function cargarHistorial() {
    const { data } = await _supabase.from('tickets').select('*').not('fecha_salida', 'is', null).order('fecha_salida', { ascending: false });
    const tabla = document.getElementById('tabla-historial');
    tabla.innerHTML = data.map(t => `
        <tr class="border-b text-sm italic font-medium">
            <td class="p-5 font-bold text-slate-800 uppercase text-lg tracking-tighter font-black">${t.placa}</td>
            <td class="p-5 text-slate-400 font-mono">${new Date(t.fecha_entrada).toLocaleTimeString()}</td>
            <td class="p-5 text-slate-400 font-mono">${new Date(t.fecha_salida).toLocaleTimeString()}</td>
            <td class="p-5 text-right font-black text-green-600 text-xl tracking-tighter">S/ ${t.monto_total}.00</td>
        </tr>`).join('');
}

window.addEventListener('keydown', (e) => {
    if(e.key === "Enter" && document.activeElement.id === "placaInput") procesarEntrada();
    if(e.key === "Escape") document.getElementById('apartado-ticket').classList.add('hidden');
});