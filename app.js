// CONFIGURACIÓN SUPABASE
const URL_DB = 'https://jwdmfrqkjdgzzggkiipt.supabase.co';
const KEY_DB = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp3ZG1mcnFramRnenpnZ2tpaXB0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0MjAzMzQsImV4cCI6MjA4Nzk5NjMzNH0.6ikNM6UWV2wnovIq4lo79tQpUX4rt3a66q5nTYZT9gY';
const _supabase = supabase.createClient(URL_DB, KEY_DB);

let modo = 'registrar'; 

// INICIALIZACIÓN
lucide.createIcons();
actualizarLista();
setInterval(() => { document.getElementById('reloj').innerText = new Date().toLocaleTimeString(); }, 1000);

// CAMBIO DE MODO (F1 / F2)
function cambiarVista(nuevoModo) {
    modo = nuevoModo;
    const titulo = document.getElementById('tituloVista');
    const btn = document.getElementById('btnEjecutar');
    const txt = document.getElementById('txtBtn');
    const panel = document.getElementById('panelMonto');
    const input = document.getElementById('placaInput');

    if(modo === 'registrar') {
        titulo.innerText = "Registrar Vehículo";
        txt.innerText = "REGISTRAR ENTRADA";
        btn.classList.replace('bg-red-600', 'bg-slate-900');
        panel.classList.add('hidden');
    } else {
        titulo.innerText = "Salida de Vehículo";
        txt.innerText = "COBRAR Y LIBERAR";
        btn.classList.replace('bg-slate-900', 'bg-red-600');
        panel.classList.remove('hidden');
    }
    input.focus();
}

// LÓGICA DE NEGOCIO (15 MIN TOLERANCIA)
async function procesar() {
    const placa = document.getElementById('placaInput').value.trim().toUpperCase();
    if(!placa) return;

    if(modo === 'registrar') {
        const { error } = await _supabase.from('tickets').insert([{ placa }]);
        if(error) alert("Error: " + error.message);
        else { 
            document.getElementById('placaInput').value = ""; 
            actualizarLista(); 
        }
    } else {
        const { data, error } = await _supabase.from('tickets').select('*').eq('placa', placa).is('fecha_salida', null).single();
        if(error || !data) return alert("Vehículo no encontrado");

        const diff = Math.floor((new Date() - new Date(data.fecha_entrada)) / 60000);
        let monto = (diff > 15) ? Math.ceil((diff - 15) / 60) * 5 : 0;

        await _supabase.from('tickets').update({ fecha_salida: new Date().toISOString(), monto_total: monto }).eq('id', data.id);
        alert(`💰 COBRAR S/ ${monto}.00\nTiempo: ${diff} min`);
        document.getElementById('placaInput').value = "";
        actualizarLista();
    }
}

async function actualizarLista() {
    const { data } = await _supabase.from('tickets').select('*').order('created_at', { ascending: false }).limit(6);
    const lista = document.getElementById('lista');
    if(data) {
        lista.innerHTML = data.map(t => `
            <div class="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-3xl hover:shadow-lg transition-all">
                <div class="flex items-center gap-4">
                    <div class="w-12 h-12 bg-white rounded-2xl flex items-center justify-center font-black text-blue-600 shadow-sm border border-slate-100">${t.placa.slice(0,2)}</div>
                    <div>
                        <p class="font-black text-slate-800 text-lg leading-tight tracking-tighter">${t.placa}</p>
                        <p class="text-[9px] font-bold text-slate-400 uppercase tracking-widest">${new Date(t.fecha_entrada).toLocaleTimeString()}</p>
                    </div>
                </div>
                <span class="${t.fecha_salida ? 'bg-slate-200 text-slate-500' : 'bg-green-100 text-green-700'} px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest italic">
                    ${t.fecha_salida ? 'Cerrado' : 'ACTIVO'}
                </span>
            </div>
        `).join('');
    }
}

// ATAJOS DE TECLADO
window.addEventListener('keydown', (e) => {
    if(e.key === "F1") { e.preventDefault(); cambiarVista('registrar'); }
    if(e.key === "F2") { e.preventDefault(); cambiarVista('salida'); }
    if(e.key === "Enter" && document.activeElement.id === "placaInput") procesar();
});