function coerceMessages(input) {
    if (!Array.isArray(input)) return [];
    return input
        .filter(m => m && (m.role === 'client' || m.role === 'model') && typeof m.text === 'string')
        .map(m => ({
            role: m.role === 'client' ? 'user' : 'assistant',
            content: String(m.text).slice(0, 800),
        }))
        .slice(-16);
}

function buildSystemPrompt(context) {
    const storeName = context?.storeName ? String(context.storeName).slice(0, 80) : 'la tienda';
    const about = context?.aboutUsText ? String(context.aboutUsText).slice(0, 800) : '';
    const shipping = context?.shipping ? String(context.shipping).slice(0, 800) : '';
    const payments = context?.payments ? String(context.payments).slice(0, 800) : '';
    const categories = Array.isArray(context?.categories) ? context.categories.map(c => String(c).slice(0, 60)).slice(0, 20) : [];
    const productHints = Array.isArray(context?.productHints) ? context.productHints.map(p => String(p).slice(0, 160)).slice(0, 30) : [];

    const lines = [
        `Sos un asistente de compras para ${storeName}.`,
        `Objetivo: ayudar a encontrar productos, responder preguntas de envío/pagos y guiar al checkout.`,
        `Reglas:`,
        `- Responder en español (Argentina) y de forma concisa.`,
        `- No inventar stock, precios o políticas si no están en el contexto.`,
        `- Si falta info, pedir un dato concreto (ej: ciudad, presupuesto, categoría) o sugerir WhatsApp si existe.`,
        `- Cuando recomiendes, ofrece 3-5 opciones y una pregunta de seguimiento.`,
    ];

    if (about) lines.push(`Sobre la tienda: ${about}`);
    if (shipping) lines.push(`Envío/retiro: ${shipping}`);
    if (payments) lines.push(`Pagos: ${payments}`);
    if (categories.length > 0) lines.push(`Categorías: ${categories.join(', ')}`);
    if (productHints.length > 0) lines.push(`Productos relevantes (resumen):\n${productHints.map(s => `- ${s}`).join('\n')}`);

    return lines.join('\n');
}

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return res.status(501).json({ error: 'AI not configured' });

    const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const messages = coerceMessages(body.messages);
    const context = body.context && typeof body.context === 'object' ? body.context : {};

    const userText = typeof body.userText === 'string' ? body.userText.slice(0, 800) : null;
    if (userText) messages.push({ role: 'user', content: userText });

    const payload = {
        model,
        temperature: 0.4,
        messages: [
            { role: 'system', content: buildSystemPrompt(context) },
            ...messages,
        ],
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    let upstream;
    try {
        upstream = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
            signal: controller.signal,
        });
    } catch (error) {
        clearTimeout(timeoutId);
        const message = error?.name === 'AbortError' ? 'AI upstream timeout' : 'AI upstream error';
        return res.status(502).json({ error: message });
    } finally {
        clearTimeout(timeoutId);
    }

    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
        const message = data?.error?.message || data?.message || 'Upstream error';
        return res.status(502).json({ error: message });
    }

    const text = data?.choices?.[0]?.message?.content;
    if (!text || typeof text !== 'string') return res.status(502).json({ error: 'Invalid AI response' });
    return res.status(200).json({ text });
}
