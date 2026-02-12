// ======================
// CONSTANTES DE CÁLCULO (lógica)
// ======================

const LADRILLOS_POR_M2_COMUN = 60;
const LADRILLOS_POR_M2_HUECO = 45;

const LADRILLOS_POR_PALLET_COMUN = 1000;
const LADRILLOS_POR_PALLET_HUECO = 144;

const BOLSAS_CEMENTO_POR_M2 = 0.2; // 1 bolsa cada 5m2
const BOLSAS_ARENA_POR_M2 = 0.3;   // 1 bolsa cada 3,3m2

const STORAGE_KEY = "simulacionesConstruccion_v3";
const CONFIG_URL = "./data/config.json";

// config cargada desde JSON
let appConfig = null;

// ======================
// HELPERS
// ======================

function toast(msg, type = "ok") {
  const isError = type === "error";
  Toastify({
    text: msg,
    duration: 2800,
    gravity: "top",
    position: "right",
    close: true,
    stopOnFocus: true,
    style: {
      background: isError
        ? "linear-gradient(to right, #b00020, #ff1744)"
        : "linear-gradient(to right, #0f9d58, #1aa260)"
    }
  }).showToast();
}

function formatearPesos(valor) {
  if (isNaN(valor)) return "-";
  return Number(valor).toLocaleString("es-AR");
}

function formatearFecha(fechaISO) {
  const fecha = new Date(fechaISO);
  return fecha.toLocaleString("es-AR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function cargarHistorial() {
  const guardado = localStorage.getItem(STORAGE_KEY);
  if (!guardado) return [];
  try {
    const parsed = JSON.parse(guardado);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function guardarHistorial(historial) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(historial));
}

// ======================
// CONFIG JSON (fetch)
// ======================

async function cargarConfig() {
  const resp = await fetch(CONFIG_URL);
  if (!resp.ok) throw new Error("No se pudo cargar el config.json");
  const data = await resp.json();

  // Validación
  if (!data?.preciosMateriales || !data?.costosFijos || !Array.isArray(data?.provincias)) {
    throw new Error("config.json inválido");
  }

  return data;
}

function poblarProvincias(selectProvincia, provincias) {
  selectProvincia.innerHTML = "";
  const optDefault = document.createElement("option");
  optDefault.value = "";
  optDefault.disabled = true;
  optDefault.selected = true;
  optDefault.textContent = "Elegí una provincia";
  selectProvincia.appendChild(optDefault);

  provincias.forEach((p) => {
    const opt = document.createElement("option");
    opt.value = p.id;
    opt.textContent = p.nombre;
    selectProvincia.appendChild(opt);
  });
}

function setEstadoConfig(texto, visible = true) {
  const el = document.getElementById("estado-config");
  if (!el) return;
  el.style.display = visible ? "block" : "none";
  el.textContent = texto;
}

// ======================
// CÁLCULOS
// ======================

function calcularMateriales(m2, tipoLadrillo, config) {
  const ladrillosPorM2 = tipoLadrillo === "comun"
    ? LADRILLOS_POR_M2_COMUN
    : LADRILLOS_POR_M2_HUECO;

  const ladrillosPorPallet = tipoLadrillo === "comun"
    ? LADRILLOS_POR_PALLET_COMUN
    : LADRILLOS_POR_PALLET_HUECO;

  // costo desde el JSON
  const costoPallet = tipoLadrillo === "comun"
    ? config.costosFijos.palletLadrilloComun
    : config.costosFijos.palletLadrilloHueco;

  const ladrillosNecesarios = m2 * ladrillosPorM2;
  const pallets = Math.ceil(ladrillosNecesarios / ladrillosPorPallet);
  const bolsasCemento = Math.ceil(m2 * BOLSAS_CEMENTO_POR_M2);
  const bolsasArena = Math.ceil(m2 * BOLSAS_ARENA_POR_M2);

  return { pallets, bolsasCemento, bolsasArena, costoPallet };
}

function calcularEnvio(provinciaObj, bolsasCemento, bolsasArena) {
  if (!provinciaObj?.envio) return 0;
  const costoCem = (provinciaObj.envio.cemento || 0) * bolsasCemento;
  const costoAre = (provinciaObj.envio.arena || 0) * bolsasArena;
  return costoCem + costoAre;
}

// ======================
// RENDER RESULTADOS
// ======================

function actualizarResultados(simulacion) {
  const spanM2 = document.getElementById("resumen-m2");
  const spanTipo = document.getElementById("resumen-tipo-ladrillo");
  const spanProv = document.getElementById("resumen-provincia");

  const listaMateriales = document.getElementById("lista-materiales");
  const resumenMateriales = document.getElementById("resumen-materiales");
  const resumenEnvio = document.getElementById("resumen-envio");
  const resumenTotal = document.getElementById("resumen-total");

  spanM2.textContent = simulacion.m2;
  spanTipo.textContent = simulacion.tipoLadrillo;
  spanProv.textContent = simulacion.provinciaNombre || "-";

  // listado materiales
  listaMateriales.innerHTML = "";
  simulacion.materiales.forEach((mat) => {
    const li = document.createElement("li");
    li.className = "d-flex justify-content-between align-items-center mb-1 small";

    const subtotal = mat.cantidad * mat.precioUnitario;

    const icono = document.createElement("i");
    icono.className = mat.iconClass + " me-1";

    const contIzq = document.createElement("div");
    contIzq.appendChild(icono);
    contIzq.append(document.createTextNode(`${mat.nombre}: ${mat.cantidad}`));

    const contDer = document.createElement("span");
    contDer.className = "fw-semibold";
    contDer.textContent = "$ " + formatearPesos(subtotal);

    li.appendChild(contIzq);
    li.appendChild(contDer);
    listaMateriales.appendChild(li);
  });

  // totales
  resumenMateriales.textContent = "$ " + formatearPesos(simulacion.costoMateriales);
  resumenEnvio.textContent = "$ " + formatearPesos(simulacion.costoEnvio);
  resumenTotal.textContent = "$ " + formatearPesos(simulacion.costoTotalFinal);
}

// ======================
// RENDERS HISTORIAL
// ======================

function actualizarHistorial(historial) {
  const tbody = document.getElementById("tbody-historial");
  tbody.innerHTML = "";

  if (historial.length === 0) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 5;
    td.className = "text-muted small text-center";
    td.textContent = "Todavía no hay simulaciones guardadas.";
    tr.appendChild(td);
    tbody.appendChild(tr);
    return;
  }

  historial.forEach((simulacion) => {
    const tr = document.createElement("tr");

    const tdFecha = document.createElement("td");
    tdFecha.textContent = formatearFecha(simulacion.fecha);

    const tdM2 = document.createElement("td");
    tdM2.textContent = simulacion.m2;

    const tdTipo = document.createElement("td");
    tdTipo.textContent = simulacion.tipoLadrillo;

    const tdProv = document.createElement("td");
    tdProv.textContent = simulacion.provinciaId || "-";

    const tdTotal = document.createElement("td");
    tdTotal.className = "text-end";
    tdTotal.textContent = "$ " + formatearPesos(simulacion.costoTotalFinal);

    tr.appendChild(tdFecha);
    tr.appendChild(tdM2);
    tr.appendChild(tdTipo);
    tr.appendChild(tdProv);
    tr.appendChild(tdTotal);

    tbody.appendChild(tr);
  });
}

// ======================
// MAIN
// ======================

document.addEventListener("DOMContentLoaded", async () => {
  const form = document.getElementById("form-simulador");
  const inputM2 = document.getElementById("input-m2");
  const selectTipo = document.getElementById("select-tipo-ladrillo");
  const selectProvincia = document.getElementById("select-provincia");
  const checkEnvio = document.getElementById("check-envio");
  const btnCalcular = document.getElementById("btn-calcular");
  const btnLimpiar = document.getElementById("btn-limpiar-historial");

  const refCem = document.getElementById("precio-ref-cemento");
  const refAre = document.getElementById("precio-ref-arena");

  // cargar historial
  let historial = cargarHistorial();
  actualizarHistorial(historial);

  // arrancar bloqueado hasta cargar config
  if (btnCalcular) btnCalcular.disabled = true;

  // cargar config JSON
  try {
    appConfig = await cargarConfig();

    poblarProvincias(selectProvincia, appConfig.provincias);

    // mostrar precios referencia
    refCem.textContent = "$ " + formatearPesos(appConfig.preciosMateriales.cemento25kg);
    refAre.textContent = "$ " + formatearPesos(appConfig.preciosMateriales.arena25kg);

    setEstadoConfig("Los precios están actualizados para los materiales de tu próxima casa ✅", true);
    if (btnCalcular) btnCalcular.disabled = false;

    toast("Precios oficiales cargados Easy Argentina S.A.", "ok");
  } catch (e) {
    setEstadoConfig("Error cargando config.json ❌", true);
    toast("Error cargando config.json. Revisá /data/config.json", "error");
    // si falla, no calcular
    if (btnCalcular) btnCalcular.disabled = true;
    return;
  }

  // limpia historial
  btnLimpiar?.addEventListener("click", () => {
    historial = [];
    guardarHistorial(historial);
    actualizarHistorial(historial);

    // limpiar resultados visuales
    document.getElementById("resumen-m2").textContent = "-";
    document.getElementById("resumen-tipo-ladrillo").textContent = "-";
    document.getElementById("resumen-provincia").textContent = "-";
    document.getElementById("lista-materiales").innerHTML = '<li class="text-muted small">Todavía no hay simulaciones.</li>';
    document.getElementById("resumen-materiales").textContent = "$ -";
    document.getElementById("resumen-envio").textContent = "$ -";
    document.getElementById("resumen-total").textContent = "$ -";

    toast("Historial limpiado", "ok");
  });

  // envio
  form.addEventListener("submit", (event) => {
    event.preventDefault();

    if (!form.checkValidity()) {
      form.classList.add("was-validated");
      toast("Revisá los campos del formulario", "error");
      return;
    }

    const m2 = Number(inputM2.value);
    const tipoLadrillo = selectTipo.value;
    const provinciaId = selectProvincia.value;

    // buscar provincia en config
    const provinciaObj = appConfig.provincias.find((p) => p.id === provinciaId);
    const provinciaNombre = provinciaObj ? provinciaObj.nombre : "-";

    // calcular materiales
    const materialesCalc = calcularMateriales(m2, tipoLadrillo, appConfig);

    // precios base desde JSON
    const precioCemento = appConfig.preciosMateriales.cemento25kg;
    const precioArena = appConfig.preciosMateriales.arena25kg;

    const materiales = [
      {
        nombre: `Pallets de ladrillo ${tipoLadrillo}`,
        cantidad: materialesCalc.pallets,
        precioUnitario: materialesCalc.costoPallet,
        iconClass: "fa-solid fa-bricks text-success",
      },
      {
        nombre: "Bolsas de cemento 25kg",
        cantidad: materialesCalc.bolsasCemento,
        precioUnitario: precioCemento,
        iconClass: "fa-solid fa-sack-xmark text-secondary",
      },
      {
        nombre: "Bolsas de arena 25kg",
        cantidad: materialesCalc.bolsasArena,
        precioUnitario: precioArena,
        iconClass: "fa-solid fa-mound text-warning",
      },
    ];

    // costo materiales
    let costoMateriales = 0;
    materiales.forEach((mat) => {
      costoMateriales += mat.cantidad * mat.precioUnitario;
    });

    // envío (si está ok)
    const costoEnvio = checkEnvio.checked
      ? calcularEnvio(provinciaObj, materialesCalc.bolsasCemento, materialesCalc.bolsasArena)
      : 0;

    const costoTotalFinal = costoMateriales + costoEnvio;

    const simulacion = {
      id: Date.now(),
      fecha: new Date().toISOString(),
      m2,
      tipoLadrillo,
      provinciaId,
      provinciaNombre,
      materiales,
      costoMateriales,
      costoEnvio,
      costoTotalFinal,
    };

    actualizarResultados(simulacion);

    historial.unshift(simulacion);
    guardarHistorial(historial);
    actualizarHistorial(historial);

    form.classList.add("was-validated");
    toast("Simulación guardada ✔", "ok");
  });
});
