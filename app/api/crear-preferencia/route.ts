import { MercadoPagoConfig, Preference } from "mercadopago";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;

    if (!accessToken) {
      return NextResponse.json(
        { error: "Falta MERCADOPAGO_ACCESS_TOKEN en .env.local" },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { pedidoId, total, nombre, telefono, codigo } = body;

    if (!pedidoId || !total || !telefono || !codigo) {
      return NextResponse.json(
        { error: "Faltan datos del pedido." },
        { status: 400 }
      );
    }

    const telefonoSeguro = encodeURIComponent(String(telefono));
    const codigoSeguro = encodeURIComponent(String(codigo));

    const urlRetorno = `http://localhost:3000/mis-pedidos?telefono=${telefonoSeguro}&codigo=${codigoSeguro}`;

    const client = new MercadoPagoConfig({
      accessToken,
    });

    const preference = new Preference(client);

    const resultado = await preference.create({
      body: {
        items: [
          {
            id: String(pedidoId),
            title: `Pedido #${pedidoId} - Maxikiosco X3`,
            quantity: 1,
            unit_price: Number(total),
            currency_id: "ARS",
          },
        ],
        payer: {
          name: nombre || "Cliente",
        },
        back_urls: {
          success: urlRetorno,
          failure: urlRetorno,
          pending: urlRetorno,
        },
        external_reference: String(pedidoId),
      },
    });

    return NextResponse.json({
      init_point: resultado.init_point,
      sandbox_init_point: resultado.sandbox_init_point,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: "Error creando preferencia de pago.",
        detalle: error?.message || error,
        causa: error?.cause || null,
      },
      { status: 500 }
    );
  }
}