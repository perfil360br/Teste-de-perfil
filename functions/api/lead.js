const UPSTREAM = "https://script.google.com/macros/s/AKfycbxMsj3rc4QwEeRNpDLyvA46-iwS_OQryvxeNFVBdDGNKlaVId_tcyhl0GsvRNarIAVD/exec";

export async function onRequestPost({ request }) {
  let lead;
  try {
    const body = await request.text();
    if (body.length > 10000) return json({ ok: false, error: "Cadastro muito grande." }, 413, request);
    lead = JSON.parse(body);
    if (!lead || !lead.id || !lead.studentName || !lead.studentWhatsapp || !lead.studentEmail) {
      return json({ ok: false, error: "Dados obrigatórios ausentes." }, 400, request);
    }

    const upstream = await fetch(UPSTREAM, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(lead),
      redirect: "follow",
    });
    if (!upstream.ok) return json({ ok: false, error: "Falha ao salvar o cadastro." }, 502, request);
    const result = await upstream.json();
    if (!result.ok || result.id !== lead.id) {
      return json({ ok: false, error: result.error || "Cadastro não confirmado." }, 502, request);
    }
    return json({ ok: true, id: result.id, sheetAction: result.sheetAction }, 200, request);
  } catch (error) {
    console.error("Falha no envio do lead:", error);
    return json({ ok: false, error: "Cadastro não confirmado. Tente novamente." }, 502, request);
  }
}

export function onRequestOptions({ request }) {
  return new Response(null, {
    status: 204,
    headers: { ...corsHeaders(request), "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type" },
  });
}

function corsHeaders(request) {
  return request.headers.get("Origin") === "https://perfil360br.github.io"
    ? { "Access-Control-Allow-Origin": "https://perfil360br.github.io", "Vary": "Origin" }
    : {};
}

function json(data, status = 200, request) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json;charset=utf-8", "Cache-Control": "no-store", ...corsHeaders(request) },
  });
}
