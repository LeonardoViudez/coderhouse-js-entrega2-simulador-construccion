// variables fijas

const LADRILLOS_POR_M2_COMUN = 60;
const LADRILLOS_POR_M2_HUECO = 45;

const LADRILLOS_POR_PALLET_COMUN = 1000;
const LADRILLOS_POR_PALLET_HUECO = 144;

const BOLSAS_CEMENTO_POR_M2 = 0.2; //1 bolsa cada 5m2
const BOLSAS_ARENA_POR_M2 = 0.3;   //1 bolsa cada 3,3m2

const COSTO_PALLET_LADRILLO_COMUN = 120000;
const COSTO_PALLET_LADRILLO_HUECO = 100000;

const STORAGE_KEY = "simulacionesConstruccion";


function formatearPesos(valor) {
  if (isNaN(valor)) return "-";
  return valor.toLocaleString("es-AR");
}

// materiales en base a m2 y tipo de ladrillo
function calcularMateriales(m2, tipoLadrillo) {
  const ladrillosPorM2 = tipoLadrillo === "comun"
    ? LADRILLOS_POR_M2_COMUN
    : LADRILLOS_POR_M2_HUECO;

  const ladrillosPorPallet = tipoLadrillo === "comun"
    ? LADRILLOS_POR_PALLET_COMUN
    : LADRILLOS_POR_PALLET_HUECO;

  const costoPallet = tipoLadrillo === "comun"
    ? COSTO_PALLET_LADRILLO_COMUN
    : COSTO_PALLET_LADRILLO_HUECO;

  const ladrillosNecesarios = m2 * ladrillosPorM2;
  const pallets = Math.ceil(ladrillosNecesarios / ladrillosPorPallet);
  const bolsasCemento = Math.ceil(m2 * BOLSAS_CEMENTO_POR_M2);
  const bolsasArena = Math.ceil(m2 * BOLSAS_ARENA_POR_M2);

  return { pallets, bolsasCemento, bolsasArena, costoPallet };
}

// local storage

function cargarHistorial() {
  const guardado = localStorage.getItem(STORAGE_KEY);
  if (!guardado) return [];

  try {
    const parsed = JSON.parse(guardado);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("Error leyendo historial", error);
    return [];
  }
}

function guardarHistorial(historial) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(historial));
}

function formatearFecha(fechaISO) {
  const fecha = new Date(fechaISO);
  return fecha.toLocaleString("es-AR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

// Render de resultados

function actualizarResultados(simulacion) {
  const spanM2 = document.getElementById("resumen-m2");
  const spanTipo = document.getElementById("resumen-tipo-ladrillo");
  const listaMateriales = document.getElementById("lista-materiales");
  const resumenTotal = document.getElementById("resumen-total");

  spanM2.textContent = simulacion.m2;
  spanTipo.textContent = simulacion.tipoLadrillo;

  // limpiar la lista
  listaMateriales.innerHTML = "";

  simulacion.materiales.forEach((mat) => {
    const li = document.createElement("li");
    li.className = "d-flex justify-content-between align-items-center mb-1 small";

    const subtotal = mat.cantidad * mat.precioUnitario;

    // icono según el material
    const icono = document.createElement("i");
    icono.className = mat.iconClass + " me-1";

    const contIzq = document.createElement("div");
    contIzq.appendChild(icono);
    contIzq.append(
      document.createTextNode(`${mat.nombre}: ${mat.cantidad}`)
    );

    const contDer = document.createElement("span");
    contDer.className = "fw-semibold";
    contDer.textContent = "$ " + formatearPesos(subtotal);

    li.appendChild(contIzq);
    li.appendChild(contDer);

    listaMateriales.appendChild(li);
  });

  resumenTotal.textContent = "$ " + formatearPesos(simulacion.costoTotal);
}

// export de historial

function actualizarHistorial(historial) {
  const tbody = document.getElementById("tbody-historial");
  tbody.innerHTML = "";

  if (historial.length === 0) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 4;
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

    const tdTotal = document.createElement("td");
    tdTotal.className = "text-end";
    tdTotal.textContent = "$ " + formatearPesos(simulacion.costoTotal);

    tr.appendChild(tdFecha);
    tr.appendChild(tdM2);
    tr.appendChild(tdTipo);
    tr.appendChild(tdTotal);

    tbody.appendChild(tr);
  });
}

// main: eventos y flujo

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("form-simulador");
  const inputM2 = document.getElementById("input-m2");
  const selectTipo = document.getElementById("select-tipo-ladrillo");
  const inputPrecioCemento = document.getElementById("input-precio-cemento");
  const inputPrecioArena = document.getElementById("input-precio-arena");

  let historial = cargarHistorial();
  actualizarHistorial(historial);

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    // Validación HTML5 con Bootstrap 5
    if (!form.checkValidity()) {
      form.classList.add("was-validated");
      return;
    }
    const m2 = Number(inputM2.value);
    const tipoLadrillo = selectTipo.value;
    const precioCemento = Number(inputPrecioCemento.value);
    const precioArena = Number(inputPrecioArena.value);

    const materialesCalc = calcularMateriales(m2, tipoLadrillo);
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

    let costoTotal = 0;
    materiales.forEach((mat) => {
      costoTotal += mat.cantidad * mat.precioUnitario;
    });

    const simulacion = {
      id: Date.now(),
      fecha: new Date().toISOString(),
      m2,
      tipoLadrillo,
      precioCemento,
      precioArena,
      materiales,
      costoTotal,
    };

    // muestra resultados en el panel de la derecha
    actualizarResultados(simulacion);

    // actualizar historial (el más nuevo primero)
    historial.unshift(simulacion);
    guardarHistorial(historial);
    actualizarHistorial(historial);

    // deja activada la clase de validación para que se vean los estados del form
    form.classList.add("was-validated");
  });
});
