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
  }

  if (!autorizado) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100 p-4 text-gray-900">
        <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow">
          <h1 className="text-3xl font-black text-red-600">
            🔒 Panel Admin
          </h1>

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

  return (
    <div className="min-h-screen bg-gray-100 p-3 text-gray-900 sm:p-4">
      <div className="mx-auto max-w-[1600px]">
        {avisoNuevoPedido && (
          <div className="mb-4 rounded-xl bg-green-600 p-4 text-center text-lg font-black text-white shadow">
            🔔 Nuevo pedido recibido
          </div>
        )}

        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-3xl font-black text-red-600">Panel Admin</h1>
            <p className="text-sm text-gray-600">
              Tablero de pedidos Maxikiosco X3
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

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl bg-white p-4 shadow">
            <p className="text-sm text-gray-500">Total pedidos</p>
            <p className="text-2xl font-black">{pedidos.length}</p>
          </div>

          <div className="rounded-xl bg-white p-4 shadow">
            <p className="text-sm text-gray-500">Activos</p>
            <p className="text-2xl font-black text-red-600">
              {pedidosActivos.length}
            </p>
          </div>

          <div className="rounded-xl bg-white p-4 shadow">
            <p className="text-sm text-gray-500">Pendientes</p>
            <p className="text-2xl font-black text-yellow-600">{pendientes}</p>
          </div>

          <div className="rounded-xl bg-white p-4 shadow">
            <p className="text-sm text-gray-500">Entregados</p>
            <p className="text-2xl font-black text-emerald-600">
              {pedidosEntregados.length}
            </p>
          </div>
        </div>

        {cargando ? (
          <p className="mt-6">Cargando pedidos...</p>
        ) : (
          <>
            <div className="mt-6 overflow-x-auto pb-4">
              <div className="grid min-w-[900px] grid-cols-4 gap-4">
                {estadosActivos.map((estado) => {
                  const pedidosDelEstado = pedidos.filter(
                    (pedido) => pedido.estado === estado
                  );

                  return (
                    <section
                      key={estado}
                      className="rounded-2xl bg-white p-3 shadow"
                    >
                      <div
                        className={`mb-3 rounded-xl border px-3 py-2 ${colorEstado(
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

                      <div className="space-y-3">
                        {pedidosDelEstado.map((pedido) => (
                          <div
                            key={pedido.id}
                            className="rounded-xl border bg-gray-50 p-3 shadow-sm"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <h3 className="text-lg font-black">
                                  #{pedido.id}
                                </h3>

                                <p className="text-sm font-bold">
                                  {pedido.nombre}
                                </p>

                                <p className="text-xs text-gray-500">
                                  {new Date(
                                    pedido.created_at
                                  ).toLocaleString("es-AR")}
                                </p>
                              </div>

                              <p className="text-lg font-black text-red-600">
                                {formatearPrecio(pedido.total)}
                              </p>
                            </div>

                            <p className="mt-2 text-xs text-gray-700">
                              📍 {pedido.direccion}
                            </p>

                            <p className="text-xs text-gray-600">
                              📱 {pedido.telefono}
                            </p>

                            <div className="mt-2 flex flex-wrap gap-2">
                              <a
                                href={`tel:${pedido.telefono}`}
                                className="rounded-lg bg-blue-100 px-2 py-1 text-xs font-bold text-blue-700"
                              >
                                📞
                              </a>

                              <a
                                href={`https://wa.me/${pedido.telefono.replace(
                                  "+",
                                  ""
                                )}`}
                                target="_blank"
                                className="rounded-lg bg-green-100 px-2 py-1 text-xs font-bold text-green-700"
                              >
                                💬
                              </a>
                            </div>

                            <details className="mt-3 rounded-lg bg-white p-2">
                              <summary className="cursor-pointer text-sm font-bold">
                                Ver detalle
                              </summary>

                              {pedido.observaciones && (
                                <p className="mt-2 text-xs">
                                  <strong>Obs:</strong> {pedido.observaciones}
                                </p>
                              )}

                              <p className="mt-2 text-xs">
                                <strong>Código:</strong> {pedido.codigo}
                              </p>

                              <div className="mt-2 space-y-2">
                                {pedido.detalle_pedidos.map((item: any) => (
                                  <div
                                    key={item.id}
                                    className="border-b pb-2 text-xs last:border-b-0"
                                  >
                                    <div className="flex justify-between gap-2">
                                      <span>
                                        <strong>{item.producto}</strong> (
                                        {item.cantidad})
                                      </span>

                                      <strong>
                                        {formatearPrecio(item.subtotal)}
                                      </strong>
                                    </div>

                                    <p className="text-gray-500">
                                      {formatearPrecio(item.precio)} c/u
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </details>

                            <select
                              value={pedido.estado}
                              onChange={(e) =>
                                cambiarEstado(pedido.id, e.target.value)
                              }
                              className="mt-3 w-full rounded-lg border p-2 text-xs font-bold"
                            >
                              {estadosTodos.map((estado) => (
                                <option key={estado} value={estado}>
                                  {estado}
                                </option>
                              ))}
                            </select>
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

            <section className="mt-6 rounded-2xl bg-white p-4 shadow">
              <h2 className="text-xl font-black text-gray-800">Historial</h2>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <details className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                  <summary className="cursor-pointer font-black text-emerald-700">
                    ✅ Entregados ({pedidosEntregados.length})
                  </summary>

                  <div className="mt-3 space-y-2">
                    {pedidosEntregados.map((pedido) => (
                      <div
                        key={pedido.id}
                        className="rounded-lg bg-white p-3 text-sm shadow-sm"
                      >
                        <div className="flex justify-between">
                          <strong>
                            #{pedido.id} - {pedido.nombre}
                          </strong>
                          <strong>{formatearPrecio(pedido.total)}</strong>
                        </div>

                        <p className="text-xs text-gray-500">
                          {new Date(pedido.created_at).toLocaleString("es-AR")}
                        </p>
                      </div>
                    ))}

                    {pedidosEntregados.length === 0 && (
                      <p className="text-sm font-bold text-gray-500">
                        Sin pedidos entregados.
                      </p>
                    )}
                  </div>
                </details>

                <details className="rounded-xl border border-red-200 bg-red-50 p-4">
                  <summary className="cursor-pointer font-black text-red-700">
                    🔴 Cancelados ({pedidosCancelados.length})
                  </summary>

                  <div className="mt-3 space-y-2">
                    {pedidosCancelados.map((pedido) => (
                      <div
                        key={pedido.id}
                        className="rounded-lg bg-white p-3 text-sm shadow-sm"
                      >
                        <div className="flex justify-between">
                          <strong>
                            #{pedido.id} - {pedido.nombre}
                          </strong>
                          <strong>{formatearPrecio(pedido.total)}</strong>
                        </div>

                        <p className="text-xs text-gray-500">
                          {new Date(pedido.created_at).toLocaleString("es-AR")}
                        </p>
                      </div>
                    ))}

                    {pedidosCancelados.length === 0 && (
                      <p className="text-sm font-bold text-gray-500">
                        Sin pedidos cancelados.
                      </p>
                    )}
                  </div>
                </details>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}