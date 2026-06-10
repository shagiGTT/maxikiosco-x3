"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function MisPedidos() {
  const [telefono, setTelefono] = useState("");
  const [codigo, setCodigo] = useState("");
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [busco, setBusco] = useState(false);

  function limpiarTelefono(valor: string) {
    return valor.replace(/\D/g, "");
  }

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
        return "bg-yellow-100 text-yellow-700";
      case "Aceptado - listo para pagar":
        return "bg-green-100 text-green-700";
      case "Preparando":
        return "bg-purple-100 text-purple-700";
      case "En camino":
        return "bg-orange-100 text-orange-700";
      case "Entregado":
        return "bg-emerald-100 text-emerald-700";
      case "Cancelado":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  }

  async function buscarPedidos(mostrarCarga = true) {
    if (!telefono || !codigo) {
      alert("Ingresá número y código de seguimiento.");
      return;
    }

    if (mostrarCarga) setBuscando(true);

    setBusco(true);

    const telefonoCompleto = `+54${limpiarTelefono(telefono)}`;

    const { data: pedidosEncontrados, error: errorPedidos } = await supabase
      .from("pedidos")
      .select("*")
      .eq("telefono", telefonoCompleto)
      .eq("codigo", codigo)
      .order("id", { ascending: false });

    if (errorPedidos) {
      console.error(errorPedidos);
      alert("Error buscando pedidos.");
      setBuscando(false);
      return;
    }

    const pedidosConDetalles = await Promise.all(
      (pedidosEncontrados || []).map(async (pedido) => {
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

    setPedidos(pedidosConDetalles);
    setBuscando(false);
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    const telefonoUrl = params.get("telefono");
    const codigoUrl = params.get("codigo");

    if (telefonoUrl && codigoUrl) {
      setTelefono(limpiarTelefono(telefonoUrl));
      setCodigo(codigoUrl);
      setBusco(true);

      window.history.replaceState({}, "", "/mis-pedidos");
      return;
    }

    const telefonoPago = sessionStorage.getItem("telefonoPago");
    const codigoPago = sessionStorage.getItem("codigoPago");

    if (telefonoPago && codigoPago) {
      setTelefono(telefonoPago);
      setCodigo(codigoPago);
      setBusco(true);

      sessionStorage.removeItem("telefonoPago");
      sessionStorage.removeItem("codigoPago");
    }
  }, []);

  useEffect(() => {
    if (!telefono || !codigo || !busco) return;

    buscarPedidos(false);

    const intervalo = setInterval(() => {
      buscarPedidos(false);
    }, 10000);

    return () => clearInterval(intervalo);
  }, [busco, telefono, codigo]);

  return (
    <div className="min-h-screen bg-gray-100 p-4 text-gray-900">
      <div className="mx-auto max-w-2xl">
        <a href="/" className="font-bold text-red-600">
          ← Volver a la tienda
        </a>

        <h1 className="mt-4 text-3xl font-black text-red-600">Mis Pedidos</h1>

        <p className="mt-2 text-gray-600">
          Ingresá tu número y código de seguimiento para ver el estado.
        </p>

        <div className="mt-6 rounded-2xl bg-white p-4 shadow">
          <div>
            <label className="mb-2 block font-bold text-gray-700">
              📱 Número
            </label>

            <div className="overflow-hidden rounded-xl border-2 border-green-200 bg-white">
              <div className="flex items-center">
                <div className="bg-green-50 px-4 py-4 font-bold text-green-700">
                  🇦🇷 +54
                </div>

                <input
                  value={telefono}
                  onChange={(e) => setTelefono(limpiarTelefono(e.target.value))}
                  type="tel"
                  inputMode="numeric"
                  className="flex-1 p-4 outline-none"
                  placeholder="3511234567"
                />
              </div>
            </div>
          </div>

          <div className="mt-4">
            <label className="mb-2 block font-bold text-gray-700">
              🔐 Código de seguimiento
            </label>

            <input
              value={codigo}
              onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ""))}
              className="w-full rounded-xl border p-4 text-base"
              placeholder="Ej: 583921"
            />
          </div>

          <button
            onClick={() => buscarPedidos(true)}
            disabled={buscando}
            className="mt-4 w-full rounded-xl bg-red-600 py-4 text-lg font-black text-white disabled:bg-gray-400"
          >
            {buscando ? "Buscando..." : "Buscar mi pedido"}
          </button>
        </div>

        <div className="mt-6 space-y-4">
          {pedidos.map((pedido) => (
            <div key={pedido.id} className="rounded-2xl bg-white p-4 shadow">
              <div className="flex justify-between gap-3">
                <h2 className="text-xl font-black">Pedido #{pedido.id}</h2>

                <span
                  className={`rounded-full px-3 py-1 text-sm font-bold ${colorEstado(
                    pedido.estado
                  )}`}
                >
                  {pedido.estado}
                </span>
              </div>

              <p className="mt-2">
                <strong>Total:</strong> {formatearPrecio(pedido.total)}
              </p>

              <p>
                <strong>Dirección:</strong> {pedido.direccion}
              </p>

              <p>
                <strong>Fecha:</strong>{" "}
                {new Date(pedido.created_at).toLocaleString("es-AR")}
              </p>

              {pedido.estado === "Aceptado - listo para pagar" && (
                <div className="mt-4 rounded-xl border border-green-300 bg-green-50 p-4">
                  <h3 className="text-lg font-black text-green-700">
                    Tu pedido fue aceptado
                  </h3>

                  <p className="mt-2 text-sm text-gray-700">
                    Ya podés realizar el pago para que preparemos tu pedido.
                  </p>

                  <button
                    onClick={async () => {
                      sessionStorage.setItem("telefonoPago", telefono);
                      sessionStorage.setItem("codigoPago", codigo);

                      const respuesta = await fetch("/api/crear-preferencia", {
                        method: "POST",
                        headers: {
                          "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                          pedidoId: pedido.id,
                          total: pedido.total,
                          nombre: pedido.nombre,
                          telefono,
                          codigo,
                        }),
                      });

                      const data = await respuesta.json();

                      if (data.init_point) {
                        window.location.href = data.init_point;
                      } else {
                        alert(data.error || "No se pudo iniciar el pago.");
                      }
                    }}
                    className="mt-4 w-full rounded-xl bg-green-600 py-4 text-lg font-black text-white"
                  >
                    💳 Pagar pedido
                  </button>
                </div>
              )}

              <div className="mt-4 rounded-xl bg-gray-50 p-3">
                <h3 className="mb-2 font-black">Productos</h3>

                {pedido.detalle_pedidos?.map((item: any) => (
                  <div
                    key={item.id}
                    className="flex justify-between border-b py-2 last:border-b-0"
                  >
                    <div>
                      <p className="font-bold">
                        {item.producto} ({item.cantidad})
                      </p>
                      <p className="text-sm text-gray-500">
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
          ))}

          {busco && pedidos.length === 0 && !buscando && (
            <p className="text-center text-gray-500">
              No encontramos pedidos con esos datos.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}