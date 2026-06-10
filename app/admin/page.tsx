"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

const estadosActivos = [
  "Pendiente de aceptación",
  "Aceptado - listo para pagar",
  "Preparando",
  "En camino",
];

const estadosTodos = [
  "Pendiente de aceptación",
  "Aceptado - listo para pagar",
  "Preparando",
  "En camino",
  "Entregado",
  "Cancelado",
];

function formatearPrecio(valor: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(valor);
}

function colorEstado(estado: string) {
  switch (estado) {
    case "Pendiente de aceptación":
      return "bg-yellow-100 text-yellow-700 border-yellow-300";
    case "Aceptado - listo para pagar":
      return "bg-green-100 text-green-700 border-green-300";
    case "Preparando":
      return "bg-purple-100 text-purple-700 border-purple-300";
    case "En camino":
      return "bg-orange-100 text-orange-700 border-orange-300";
    case "Entregado":
      return "bg-emerald-100 text-emerald-700 border-emerald-300";
    case "Cancelado":
      return "bg-red-100 text-red-700 border-red-300";
    default:
      return "bg-gray-100 text-gray-700 border-gray-300";
  }
}

export default function Admin() {
  const [autorizado, setAutorizado] = useState(false);
  const [password, setPassword] = useState("");
  const [errorLogin, setErrorLogin] = useState("");
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  const [avisoNuevoPedido, setAvisoNuevoPedido] = useState(false);
  const [pedidoSeleccionado, setPedidoSeleccionado] = useState<any | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [filtroPago, setFiltroPago] = useState("todos");

  useEffect(() => {
    if (!autorizado) return;

    cargarPedidos();

    const intervalo = setInterval(() => {
      cargarPedidos();
    }, 10000);

    return () => clearInterval(intervalo);
  }, [autorizado]);

  function ingresar() {
    if (password === process.env.NEXT_PUBLIC_ADMIN_PASSWORD) {
      setAutorizado(true);
      setErrorLogin("");
    } else {
      setErrorLogin("Contraseña incorrecta.");
    }
  }

  async function cargarPedidos() {
    setCargando(true);

    const { data: pedidosData, error } = await supabase
      .from("pedidos")
      .select("*")
      .order("id", { ascending: false });

    if (error) {
      console.error(error);
      alert("Error cargando pedidos.");
      setCargando(false);
      return;
    }

    const pedidosConDetalles = await Promise.all(
      (pedidosData || []).map(async (pedido) => {
        const { data: detalles } = await supabase
          .from("detalle_pedidos")
          .select("*")
          .eq("pedido_id", pedido.id);

        return {
          ...pedido,
          detalle_pedidos: detalles || [],
        };
      })
    );

    setPedidos((pedidosActuales) => {
      if (
        pedidosActuales.length > 0 &&
        pedidosConDetalles.length > pedidosActuales.length
      ) {
        setAvisoNuevoPedido(true);

        setTimeout(() => {
          setAvisoNuevoPedido(false);
        }, 5000);
      }

      return pedidosConDetalles;
    });

    setCargando(false);
  }

  async function cambiarEstado(id: number, nuevoEstado: string) {
    const { error } = await supabase
      .from("pedidos")
      .update({ estado: nuevoEstado })
      .eq("id", id);

    if (error) {
      console.error(error);
      alert("Error cambiando estado.");
      return;
    }

    cargarPedidos();

    setPedidoSeleccionado((pedidoActual: any) =>
      pedidoActual?.id === id
        ? { ...pedidoActual, estado: nuevoEstado }
        : pedidoActual
    );
  }

  if (!autorizado) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100 p-4 text-gray-900">
        <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow">
          <h1 className="text-3xl font-black text-red-600">🔒 Panel Admin</h1>

          <p className="mt-2 text-gray-600">
            Ingresá la contraseña para administrar pedidos.
          </p>

          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            className="mt-5 w-full rounded-xl border p-4 text-base"
            placeholder="Contraseña"
            onKeyDown={(e) => {
              if (e.key === "Enter") ingresar();
            }}
          />

          {errorLogin && (
            <p className="mt-2 font-bold text-red-600">{errorLogin}</p>
          )}

          <button
            onClick={ingresar}
            className="mt-4 w-full rounded-xl bg-red-600 py-4 text-lg font-black text-white"
          >
            Ingresar
          </button>

          <a href="/" className="mt-4 block text-center font-bold text-red-600">
            Volver a la tienda
          </a>
        </div>
      </div>
    );
  }

  const pedidosActivos = pedidos.filter(
    (pedido) => pedido.estado !== "Entregado" && pedido.estado !== "Cancelado"
  );

  const pedidosEntregados = pedidos.filter(
    (pedido) => pedido.estado === "Entregado"
  );

  const pedidosCancelados = pedidos.filter(
    (pedido) => pedido.estado === "Cancelado"
  );

  const pendientes = pedidos.filter(
    (pedido) => pedido.estado === "Pendiente de aceptación"
  ).length;

  const pedidosFiltrados = pedidos.filter((pedido) => {
  const texto = busqueda.toLowerCase();

  const coincideBusqueda =
    pedido.nombre?.toLowerCase().includes(texto) ||
    pedido.telefono?.toLowerCase().includes(texto) ||
    pedido.direccion?.toLowerCase().includes(texto) ||
    pedido.codigo?.toLowerCase().includes(texto) ||
    String(pedido.id).includes(texto);

  const coincidePago =
    filtroPago === "todos" ||
    (filtroPago === "pagados" && pedido.estado_pago === "approved") ||
    (filtroPago === "sin_pagar" && pedido.estado_pago !== "approved");

  return coincideBusqueda && coincidePago;
});

  return (
    <div className="min-h-screen bg-gray-100 p-3 text-gray-900 sm:p-4">
      <div className="mx-auto max-w-[1800px]">
        {avisoNuevoPedido && (
          <div className="mb-3 rounded-xl bg-green-600 p-3 text-center text-base font-black text-white shadow">
            🔔 Nuevo pedido recibido
          </div>
        )}

        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-3xl font-black text-red-600">Panel Admin</h1>
            <p className="text-sm text-gray-600">
              Tablero compacto de pedidos Maxikiosco X3
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={cargarPedidos}
              className="rounded-xl bg-gray-900 px-4 py-3 text-sm font-bold text-white"
            >
              Actualizar
            </button>

            <button
              onClick={() => setAutorizado(false)}
              className="rounded-xl bg-gray-700 px-4 py-3 text-sm font-bold text-white"
            >
              Salir
            </button>

            <a
              href="/"
              className="rounded-xl bg-red-600 px-4 py-3 text-sm font-bold text-white"
            >
              Tienda
            </a>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="rounded-xl bg-white p-3 shadow">
            <p className="text-xs text-gray-500">Total pedidos</p>
            <p className="text-2xl font-black">{pedidos.length}</p>
          </div>

          <div className="rounded-xl bg-white p-3 shadow">
            <p className="text-xs text-gray-500">Activos</p>
            <p className="text-2xl font-black text-red-600">
              {pedidosActivos.length}
            </p>
          </div>

          <div className="rounded-xl bg-white p-3 shadow">
            <p className="text-xs text-gray-500">Pendientes</p>
            <p className="text-2xl font-black text-yellow-600">{pendientes}</p>
          </div>

          <div className="rounded-xl bg-white p-3 shadow">
            <p className="text-xs text-gray-500">Entregados</p>
            <p className="text-2xl font-black text-emerald-600">
              {pedidosEntregados.length}
            </p>
          </div>
        </div>


        <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_180px]">
        <input
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="rounded-xl border bg-white px-4 py-3 text-sm font-bold shadow-sm outline-none"
          placeholder="🔍 Buscar por pedido, nombre, teléfono, código o dirección..."
        />

        <select
          value={filtroPago}
          onChange={(e) => setFiltroPago(e.target.value)}
          className="rounded-xl border bg-white px-4 py-3 text-sm font-bold shadow-sm outline-none"
        >
          <option value="todos">Todos</option>
          <option value="pagados">Pagados</option>
          <option value="sin_pagar">Sin pagar</option>
        </select>
      </div>
        {cargando ? (
          <p className="mt-6">Cargando pedidos...</p>
        ) : (
          <>
            <div className="mt-4 overflow-x-auto pb-3">
              <div className="grid min-w-[1000px] grid-cols-4 gap-3">
                {estadosActivos.map((estado) => {
                const pedidosDelEstado = pedidosFiltrados.filter(
                  (pedido) => pedido.estado === estado
                );

                  return (
                    <section
                      key={estado}
                      className="rounded-2xl bg-white p-2 shadow"
                    >
                      <div
                        className={`mb-2 rounded-xl border px-3 py-2 ${colorEstado(
                          estado
                        )}`}
                      >
                        <h2 className="text-sm font-black leading-tight">
                          {estado}
                        </h2>

                        <p className="text-xs font-bold">
                          {pedidosDelEstado.length} pedido(s)
                        </p>
                      </div>

                      <div className="max-h-[520px] space-y-2 overflow-y-auto pr-1">
                        {pedidosDelEstado.map((pedido) => (
                          <div
                            key={pedido.id}
                            className="rounded-xl border bg-gray-50 p-2 shadow-sm"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <h3 className="text-base font-black">
                                    #{pedido.id}
                                  </h3>

                                  <span className="text-[11px] text-gray-500">
                                    {new Date(
                                      pedido.created_at
                                    ).toLocaleTimeString("es-AR", {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </span>
                                </div>

                                <p className="truncate text-xs font-bold">
                                  {pedido.nombre}
                                </p>

                                <p className="truncate text-[11px] text-gray-500">
                                  📍 {pedido.direccion}
                                </p>
                              </div>

                              <div className="text-right">
                                <p className="text-sm font-black text-red-600">
                                  {formatearPrecio(pedido.total)}
                                </p>

                                {pedido.estado_pago === "approved" ? (
                                  <p className="mt-1 rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-black text-emerald-700">
                                    ✅ PAGADO
                                  </p>
                                ) : (
                                  <p className="mt-1 rounded-full bg-gray-200 px-2 py-1 text-[10px] font-black text-gray-600">
                                    SIN PAGAR
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="mt-2 flex items-center justify-between gap-2">
                              <div className="flex gap-1">
                                <a
                                  href={`tel:${pedido.telefono}`}
                                  className="rounded-md bg-blue-100 px-2 py-1 text-[11px] font-bold text-blue-700"
                                >
                                  📞
                                </a>

                                <a
                                  href={`https://wa.me/${pedido.telefono.replace(
                                    "+",
                                    ""
                                  )}`}
                                  target="_blank"
                                  className="rounded-md bg-green-100 px-2 py-1 text-[11px] font-bold text-green-700"
                                >
                                  💬
                                </a>
                              </div>

                              <button
                                onClick={() => setPedidoSeleccionado(pedido)}
                                className="rounded-md bg-gray-900 px-3 py-1 text-[11px] font-bold text-white"
                              >
                                Ver
                              </button>
                            </div>
                          </div>
                        ))}

                        {pedidosDelEstado.length === 0 && (
                          <div className="rounded-xl border border-dashed p-4 text-center text-xs font-bold text-gray-400">
                            Sin pedidos
                          </div>
                        )}
                      </div>
                    </section>
                  );
                })}
              </div>
            </div>

            <section className="mt-4 rounded-2xl bg-white p-4 shadow">
              <h2 className="text-xl font-black text-gray-800">Historial</h2>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <details className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                  <summary className="cursor-pointer font-black text-emerald-700">
                    ✅ Entregados ({pedidosEntregados.length})
                  </summary>
                </details>

                <details className="rounded-xl border border-red-200 bg-red-50 p-4">
                  <summary className="cursor-pointer font-black text-red-700">
                    🔴 Cancelados ({pedidosCancelados.length})
                  </summary>
                </details>
              </div>
            </section>
          </>
        )}
      </div>

      {pedidoSeleccionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-2xl font-black">
                  Pedido #{pedidoSeleccionado.id}
                </h2>
                <p className="text-sm text-gray-500">
                  {new Date(pedidoSeleccionado.created_at).toLocaleString(
                    "es-AR"
                  )}
                </p>
              </div>

              <button
                onClick={() => setPedidoSeleccionado(null)}
                className="rounded-lg bg-gray-100 px-3 py-2 font-black"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 rounded-xl bg-gray-50 p-3 text-sm">
              <p>
                <strong>Cliente:</strong> {pedidoSeleccionado.nombre}
              </p>
              <p>
                <strong>Teléfono:</strong> {pedidoSeleccionado.telefono}
              </p>
              <p>
                <strong>Dirección:</strong> {pedidoSeleccionado.direccion}
              </p>
              {pedidoSeleccionado.observaciones && (
                <p>
                  <strong>Obs:</strong> {pedidoSeleccionado.observaciones}
                </p>
              )}
              <p>
                <strong>Código:</strong> {pedidoSeleccionado.codigo}
              </p>
            </div>

            <div className="mt-4 rounded-xl bg-green-50 p-3 text-sm">
              <p>
                <strong>Pago:</strong>{" "}
                {pedidoSeleccionado.estado_pago === "approved"
                  ? "✅ Aprobado"
                  : "❌ Sin pagar"}
              </p>

              {pedidoSeleccionado.payment_id && (
                <p>
                  <strong>Operación MP:</strong>{" "}
                  {pedidoSeleccionado.payment_id}
                </p>
              )}

              {pedidoSeleccionado.fecha_pago && (
                <p>
                  <strong>Fecha pago:</strong>{" "}
                  {new Date(pedidoSeleccionado.fecha_pago).toLocaleString(
                    "es-AR"
                  )}
                </p>
              )}

              <p className="mt-2 text-lg font-black text-red-600">
                Total: {formatearPrecio(pedidoSeleccionado.total)}
              </p>
            </div>

            <div className="mt-4">
              <h3 className="font-black">Productos</h3>

              <div className="mt-2 space-y-2">
                {pedidoSeleccionado.detalle_pedidos?.map((item: any) => (
                  <div
                    key={item.id}
                    className="flex justify-between border-b pb-2 text-sm last:border-b-0"
                  >
                    <div>
                      <p className="font-bold">
                        {item.producto} ({item.cantidad})
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatearPrecio(item.precio)} c/u
                      </p>
                    </div>

                    <p className="font-black">
                      {formatearPrecio(item.subtotal)}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <select
              value={pedidoSeleccionado.estado}
              onChange={(e) =>
                cambiarEstado(pedidoSeleccionado.id, e.target.value)
              }
              className="mt-4 w-full rounded-xl border p-3 text-sm font-bold"
            >
              {estadosTodos.map((estado) => (
                <option key={estado} value={estado}>
                  {estado}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  );
}