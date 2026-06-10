import { MercadoPagoConfig, Payment } from "mercadopago";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const paymentId = body?.data?.id;

    if (!paymentId) {
      return NextResponse.json({ ok: true });
    }

    const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;

    if (!accessToken) {
      return NextResponse.json(
        { error: "Falta MERCADOPAGO_ACCESS_TOKEN" },
        { status: 500 }
      );
    }

    const client = new MercadoPagoConfig({
      accessToken,
    });

    const payment = new Payment(client);

    const pago = await payment.get({
      id: paymentId,
    });

    const pedidoId = pago.external_reference;

    if (!pedidoId) {
      return NextResponse.json({ ok: true });
    }

    if (pago.status !== "approved") {
      await supabaseAdmin
        .from("pedidos")
        .update({
          payment_id: String(paymentId),
          estado_pago: pago.status || "unknown",
        })
        .eq("id", Number(pedidoId));

      return NextResponse.json({ ok: true });
    }

    const { error } = await supabaseAdmin
      .from("pedidos")
      .update({
        estado: "Preparando",
        payment_id: String(paymentId),
        estado_pago: pago.status,
        fecha_pago: new Date().toISOString(),
      })
      .eq("id", Number(pedidoId));

    if (error) {
      return NextResponse.json(
        { error: "Error actualizando pedido", detalle: error },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: "Error procesando webhook",
        detalle: error?.message || error,
      },
      { status: 500 }
    );
  }
}