"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";

type Producto = {
  id: number;
  nombre: string;
  precio: number;
  categoria: string;
  imagen?: string;
  stock?: number;
  destacado?: boolean;
  descuento?: number;
};

type ProductoCarrito = Producto & {
  cantidad: number;
};

export default function Home() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [carrito, setCarrito] = useState<ProductoCarrito[]>([]);
  const [mostrarCarrito, setMostrarCarrito] = useState(false);
  const [mostrarCheckout, setMostrarCheckout] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [pedidoCreado, setPedidoCreado] = useState<any>(null);
  const [busqueda, setBusqueda] = useState("");
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState("Todas");
  const productosRef = useRef<HTMLElement | null>(null);

  const [cliente, setCliente] = useState({
    nombre: "",
    telefono: "",
    direccion: "",
    observaciones: "",
  });

  useEffect(() => {
    cargarProductos();
  }, []);

  async function cargarProductos() {
    const { data, error } = await supabase
      .from("productos")
      .select("*")
      .eq("activo", true)
      .order("id", { ascending: true });

    if (error) {
      console.error("Error cargando productos:", error);
      setCargando(false);
      return;
    }

    const productosFormateados = data.map((producto: any) => ({
      id: producto.id,
      nombre: producto.nombre,
      precio: Number(producto.precio),
      categoria: producto["categorías"] || producto.categoria || "Sin categoría",
      imagen: producto.imagen,
      stock: producto.existencias || producto.stock || 0,
      destacado: producto.destacado,
      descuento: producto.descuento || 0,
      
    }));

    setProductos(productosFormateados);
    setCargando(false);
  }

  function limpiarTelefono(valor: string) {
    return valor.replace(/\D/g, "");
  }

function seleccionarCategoria(nombre: string) {
  setCategoriaSeleccionada(nombre);

  setTimeout(() => {
    productosRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });

    setTimeout(() => {
      window.scrollBy({
        top: 120,
        behavior: "smooth",
      });
    }, 300);
  }, 100);
}

  function formatearPrecio(valor: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(valor);
}

function precioFinal(producto: Producto) {
  const descuento = producto.descuento || 0;
  return Math.round(producto.precio - (producto.precio * descuento) / 100);
}

  function telefonoValido() {
    const telefonoLimpio = limpiarTelefono(cliente.telefono);
    return telefonoLimpio.length >= 8 && telefonoLimpio.length <= 15;
  }

  function nombreValido() {
    return cliente.nombre.trim().length >= 3;
  }

  function direccionValida() {
    return cliente.direccion.trim().length >= 5;
  }

  const formularioValido = nombreValido() && telefonoValido() && direccionValida();

  function agregarAlCarrito(producto: Producto) {
    const productoExiste = carrito.find((item) => item.id === producto.id);

    if (productoExiste) {
      setCarrito(
        carrito.map((item) =>
          item.id === producto.id
            ? { ...item, cantidad: item.cantidad + 1 }
            : item
        )
      );
    } else {
      setCarrito([...carrito, { ...producto, cantidad: 1 }]);
    }
  }

  function sumarCantidad(id: number) {
    setCarrito(
      carrito.map((item) =>
        item.id === id ? { ...item, cantidad: item.cantidad + 1 } : item
      )
    );
  }

  function restarCantidad(id: number) {
    setCarrito(
      carrito
        .map((item) =>
          item.id === id ? { ...item, cantidad: item.cantidad - 1 } : item
        )
        .filter((item) => item.cantidad > 0)
    );
  }

  const cantidadTotal = carrito.reduce((suma, item) => suma + item.cantidad, 0);

const categorias = [
  { nombre: "Todas", icono: "🛍️" },
  { nombre: "Bebidas", icono: "🥤" },
  { nombre: "Golosinas", icono: "🍫" },
  { nombre: "Congelados", icono: "🧊" },
  { nombre: "Almacén", icono: "🛒" },
  { nombre: "Limpieza", icono: "🧽" },
];

const productosFiltrados = productos.filter((producto) => {
  const coincideBusqueda =
    producto.nombre
      .toLowerCase()
      .includes(busqueda.toLowerCase());

  const coincideCategoria =
    categoriaSeleccionada === "Todas" ||
    producto.categoria === categoriaSeleccionada;

  return coincideBusqueda && coincideCategoria;
});

const productosDestacados = productos.filter(
  (producto) => producto.destacado
);

const categoriaActual = categorias.find(
  (categoria) => categoria.nombre === categoriaSeleccionada
);

  const total = carrito.reduce(
    (suma, item) => suma + precioFinal(item) * item.cantidad,
    0
  );

  async function enviarPedido() {
    if (!formularioValido) {
      alert("Revisá los datos del cliente antes de enviar el pedido.");
      return;
    }

    if (carrito.length === 0) {
      alert("El carrito está vacío.");
      return;
    }

    setEnviando(true);

    const codigoSeguimiento = Math.floor(
      100000 + Math.random() * 900000
    ).toString();

    const telefonoLimpio = `+54${limpiarTelefono(cliente.telefono)}`;

    const { data: pedido, error: errorPedido } = await supabase
      .from("pedidos")
      .insert({
        nombre: cliente.nombre.trim(),
        telefono: telefonoLimpio,
        direccion: cliente.direccion.trim(),
        observaciones: cliente.observaciones.trim(),
        total,
        estado: "Pendiente de aceptación",
        codigo: codigoSeguimiento,
      })
      .select()
      .single();

    if (errorPedido) {
      console.error("Error creando pedido:", errorPedido);
      alert("Error al crear el pedido.");
      setEnviando(false);
      return;
    }

    const detalle = carrito.map((item) => ({
      pedido_id: pedido.id,
      producto_id: item.id,
      producto: item.nombre,
      cantidad: item.cantidad,
      precio: precioFinal(item),
      subtotal: precioFinal(item) * item.cantidad,
    }));

    const { error: errorDetalle } = await supabase
      .from("detalle_pedidos")
      .insert(detalle);

    if (errorDetalle) {
      console.error("Error guardando detalle:", errorDetalle);
      alert("El pedido se creó, pero hubo un error guardando los productos.");
      setEnviando(false);
      return;
    }

    setPedidoCreado(pedido);
    setCarrito([]);
    setMostrarCheckout(false);
    setEnviando(false);
    setCliente({
      nombre: "",
      telefono: "",
      direccion: "",
      observaciones: "",
    });
  }

  return (
    <div className="min-h-screen bg-gray-100 text-gray-900">
      <header className="sticky top-0 z-40 bg-red-600 text-white shadow-lg">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 p-3 sm:p-4">
          <div>
            <h1 className="text-2xl font-extrabold leading-none sm:text-4xl">
              SALVADORES X3
            </h1>
          </div>

            <div className="flex items-center gap-2">
            <a
              href="/mis-pedidos"
              className="rounded-xl bg-red-700 px-3 py-2 text-sm font-bold text-white sm:px-5 sm:text-base"
            >
              Mis pedidos
            </a>

            <button
              onClick={() => {
                setMostrarCarrito(true);
                setMostrarCheckout(false);
              }}
              className="rounded-xl bg-white px-3 py-2 text-sm font-bold text-red-600 sm:px-5 sm:text-base"
            >
              🛒 ({cantidadTotal}) {formatearPrecio(total)}
            </button>
          </div>
        </div>
      </header>

      <section className="bg-yellow-400 px-4 py-8">
        <div className="mx-auto max-w-7xl">

          <div className="mt-6">
            <input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="🔍 ¿Qué estás buscando?"
              className="w-full rounded-2xl bg-white p-4 text-lg shadow"
            />
          </div>

          <div className="mt-5 flex gap-3 overflow-x-auto pb-2">
            {categorias.map((categoria) => (
              <button
                key={categoria.nombre}
                onClick={() => seleccionarCategoria(categoria.nombre)}
                className={`min-w-[72px] rounded-2xl p-2 text-center shadow transition active:scale-95 ${
                  categoriaSeleccionada === categoria.nombre
                    ? "bg-red-600 text-white"
                    : "bg-white text-gray-900"
                }`}
              >
                <div className="text-xl">{categoria.icono}</div>
                <div className="mt-1 text-[10px] font-black">
                  {categoria.nombre}
                </div>
              </button>
            ))}
          </div>

<div className="mt-4 rounded-2xl bg-white p-3 shadow">
  <div className="flex items-center justify-around text-center text-xs font-bold">
    <div>
      🚚
      <p>Entrega rápida</p>
    </div>

    <div>
      💳
      <p>Pago seguro</p>
    </div>

    <div>
      📍
      <p>Cruz del Eje</p>
    </div>
  </div>
</div>
<p className="mt-3 text-center text-xs font-medium text-gray-600">
  Comprá online en minutos y seguí tu pedido en tiempo real.
</p>
        </div>
      </section>

      <main
        ref={productosRef}
        className="scroll-mt-24 mx-auto max-w-7xl p-4 sm:p-6"
      >
        <section>

          <section className="mb-6">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-xl font-black">
                🔥 Más vendidos
              </h3>
            </div>

            <div className="flex gap-3 overflow-x-auto pb-2">
              {productosDestacados.map((producto) => (
                <div
                  key={`destacado-${producto.id}`}
                  className="min-w-[155px] rounded-2xl bg-white p-3 shadow"
                >
                  <div className="flex h-24 items-center justify-center">
                    {producto.imagen && (
                      <img
                        src={producto.imagen}
                        alt={producto.nombre}
                        className="h-full w-full object-contain"
                      />
                    )}
                  </div>

                  <p className="mt-2 line-clamp-2 text-sm font-bold">
                    {producto.nombre}
                  </p>

                  <div className="mt-2">
                    {(producto.descuento || 0) > 0 && (
                      <span className="rounded-full bg-red-600 px-2 py-1 text-xs font-black text-white">
                        -{producto.descuento}%
                      </span>
                    )}

                    <p className="mt-1 text-2xl font-black text-red-600">
                      {formatearPrecio(precioFinal(producto))}
                    </p>

                    {(producto.descuento || 0) > 0 && (
                      <p className="text-xs text-gray-400 line-through">
                        {formatearPrecio(producto.precio)}
                      </p>
                    )}
                  </div>

                  <button
                    onClick={() => agregarAlCarrito(producto)}
                    className="mt-3 w-full rounded-xl bg-red-600 py-2 text-xs font-black text-white active:scale-95"
                  >
                    + Agregar
                  </button>
                </div>
              ))}
            </div>
          </section>

          <h3 className="mb-3 text-xl font-black sm:text-2xl">
            {categoriaSeleccionada === "Todas"
              ? "🛒 Todos los productos"
              : `${categoriaActual?.icono || "🛒"} ${categoriaSeleccionada}`}
          </h3>

          {cargando ? (
            <p>Cargando productos...</p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {productosFiltrados.map((producto) => (
            <div
              key={producto.id}
              className="overflow-hidden rounded-3xl bg-white shadow-lg transition hover:-translate-y-1 hover:shadow-xl"
            >
            <div className="flex h-40 items-center justify-center overflow-hidden bg-white p-4">
                  {producto.imagen ? (
                  <img
                    src={producto.imagen}
                    alt={producto.nombre}
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center bg-gray-200 text-xs text-gray-500">
                    Sin foto
                  </div>
                )}
              </div>

              <div className="p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
                  {producto.categoria}
                </p>

                <h4 className="mt-1 text-base font-black leading-tight">
                  {producto.nombre}
                </h4>

                <div className="mt-4 flex items-end justify-between gap-3">
                <div>
                  {(producto.descuento || 0) > 0 && (
                    <span className="rounded-full bg-red-600 px-2 py-1 text-xs font-black text-white">
                      -{producto.descuento}%
                    </span>
                  )}

                  <p className="mt-1 text-3xl font-black text-red-600">
                    {formatearPrecio(precioFinal(producto))}
                  </p>

                  {(producto.descuento || 0) > 0 && (
                    <p className="text-sm text-gray-400 line-through">
                      {formatearPrecio(producto.precio)}
                    </p>
                  )}
                </div>

                  <button
                    onClick={() => agregarAlCarrito(producto)}
                    className="rounded-2xl bg-red-600 px-5 py-3 text-sm font-black text-white shadow-md transition active:scale-95"
                  >
                    + Agregar
                  </button>
                </div>
              </div>
            </div>
          ))}
            </div>
          )}
        </section>
      </main>

      {mostrarCarrito && (
        <div className="fixed inset-0 z-50 bg-black/60 sm:flex sm:items-center sm:justify-center sm:p-4">
          <div className="h-full w-full overflow-y-auto bg-white p-4 sm:h-auto sm:max-h-[90vh] sm:max-w-2xl sm:rounded-2xl sm:p-6">
            <div className="sticky top-0 -mx-4 mb-4 flex items-center justify-between bg-white px-4 py-3 sm:static sm:mx-0 sm:p-0">
              <h3 className="text-2xl font-black">Tu carrito</h3>

              <button
                onClick={() => {
                  setMostrarCarrito(false);
                  setMostrarCheckout(false);
                  setPedidoCreado(null);
                }}
                className="rounded-lg bg-red-100 px-3 py-2 font-bold text-red-600"
              >
                Cerrar
              </button>
            </div>

            {pedidoCreado ? (
              <div className="rounded-xl border border-green-400 bg-green-50 p-5">
                <h4 className="text-2xl font-black text-green-700">
                  Pedido enviado correctamente
                </h4>

                <p className="mt-3 text-lg">
                  Número de pedido: <strong>#{pedidoCreado.id}</strong>
                </p>

                <p className="mt-2 text-lg">
                  Código de seguimiento:{" "}
                  <strong>{pedidoCreado.codigo}</strong>
                </p>

                <p className="mt-2">
                  Estado: <strong>{pedidoCreado.estado}</strong>
                </p>

                <p className="mt-3 text-sm text-gray-600">
                  Guardá este código. Lo vas a necesitar para consultar tu pedido.
                </p>
              </div>
            ) : carrito.length === 0 ? (
              <p>No agregaste productos todavía.</p>
            ) : (
              <>
                <div className="space-y-3">
                  {carrito.map((item) => (
                    <div key={item.id} className="rounded-xl border p-3">
                      <div className="flex justify-between gap-3">
                        <div>
                          <p className="font-bold">
                            {item.nombre} ({item.cantidad})
                          </p>
                          <p className="text-sm text-gray-500">
                            {formatearPrecio(precioFinal(item))} c/u
                          </p>
                        </div>

                        <p className="font-black">
                          {formatearPrecio(precioFinal(item) * item.cantidad)}
                        </p>
                      </div>

                      <div className="mt-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => restarCantidad(item.id)}
                            className="h-9 w-9 rounded-lg bg-gray-200 text-xl font-black"
                          >
                            -
                          </button>

                          <span className="text-lg font-black">
                            {item.cantidad}
                          </span>

                          <button
                            onClick={() => sumarCantidad(item.id)}
                            className="h-9 w-9 rounded-lg bg-gray-200 text-xl font-black"
                          >
                            +
                          </button>
                        </div>

                        <button
                          onClick={() =>
                            setCarrito(
                              carrito.filter((producto) => producto.id !== item.id)
                            )
                          }
                          className="font-bold text-red-600"
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex justify-between text-2xl font-black">
                  <span>Total</span>
                  <span>{formatearPrecio(total)}</span>
                </div>

                {!mostrarCheckout && (
                  <button
                    onClick={() => setMostrarCheckout(true)}
                    className="mt-5 w-full rounded-xl bg-green-600 py-4 text-lg font-black text-white active:scale-95"
                  >
                    Confirmar pedido
                  </button>
                )}

                {mostrarCheckout && (
                  <div className="mt-6 space-y-3">
                    <div>
                      <label className="mb-2 block font-bold text-gray-700">
                        👤 Nombre completo
                      </label>

                      <input
                        value={cliente.nombre}
                        onChange={(e) =>
                          setCliente({ ...cliente, nombre: e.target.value })
                        }
                        className="w-full rounded-xl border p-4 text-base"
                        placeholder="Ej: Gabriel Tarter"
                      />

                      {cliente.nombre && !nombreValido() && (
                        <p className="mt-1 text-sm font-bold text-red-600">
                          El nombre debe tener al menos 3 caracteres.
                        </p>
                      )}
                    </div>

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
                            value={cliente.telefono}
                            onChange={(e) =>
                              setCliente({
                                ...cliente,
                                telefono: limpiarTelefono(e.target.value),
                              })
                            }
                            type="tel"
                            inputMode="numeric"
                            className="flex-1 p-4 outline-none"
                            placeholder="3511234567"
                          />
                        </div>
                      </div>

                      <p className="mt-2 text-sm text-gray-500">
                         Ingresá el número utilizado al realizar el pedido.
                      </p>

                      {cliente.telefono && !telefonoValido() && (
                        <p className="mt-1 text-sm font-bold text-red-600">
                          Ingresá un número válido.
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="mb-2 block font-bold text-gray-700">
                        📍 Dirección de entrega
                      </label>

                      <input
                        value={cliente.direccion}
                        onChange={(e) =>
                          setCliente({ ...cliente, direccion: e.target.value })
                        }
                        className="w-full rounded-xl border p-4 text-base"
                        placeholder="Ej: Sarmiento 123"
                      />

                      {cliente.direccion && !direccionValida() && (
                        <p className="mt-1 text-sm font-bold text-red-600">
                          La dirección debe tener al menos 5 caracteres.
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="mb-2 block font-bold text-gray-700">
                        📝 Observaciones
                      </label>

                      <textarea
                        value={cliente.observaciones}
                        onChange={(e) =>
                          setCliente({ ...cliente, observaciones: e.target.value })
                        }
                        className="min-h-24 w-full rounded-xl border p-4 text-base"
                        placeholder="Ej: tocar timbre, casa de rejas negras..."
                      />
                    </div>

                    <div className="rounded-xl border border-yellow-400 bg-yellow-100 p-4">
                      <h4 className="text-lg font-black">
                        Datos para la transferencia
                      </h4>
                      <p>
                        <strong>Alias:</strong> maxikioscox3
                      </p>
                      <p>
                        <strong>Titular:</strong> Gabriel Tarter
                      </p>
                      <p>
                        <strong>Banco:</strong> Mercado Pago
                      </p>
                    </div>

                    <button
                      onClick={enviarPedido}
                      disabled={enviando || !formularioValido}
                      className="w-full rounded-xl bg-green-600 py-4 text-lg font-black text-white active:scale-95 disabled:bg-gray-400"
                    >
                      {enviando ? "Enviando pedido..." : "Enviar pedido"}
                    </button>

                    {!formularioValido && (
                      <p className="text-center text-sm font-bold text-gray-500">
                        Completá nombre, WhatsApp y dirección para enviar.
                      </p>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}