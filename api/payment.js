import { MercadoPagoConfig, Preference } from 'mercadopago';

// Inicializamos Mercado Pago con tu Access Token (Secreto)
// Vercel inyectará esto desde las variables de entorno
const client = new MercadoPagoConfig({ 
    accessToken: process.env.MP_ACCESS_TOKEN 
});

export default async function handler(req, res) {
    if (req.method === 'POST') {
        try {
            const { items } = req.body;

            // Configuración de la Preferencia de Pago
            const body = {
                items: items.map(item => ({
                    id: item.id,
                    title: item.title,
                    quantity: Number(item.quantity),
                    unit_price: Number(item.unit_price),
                    currency_id: "ARS"
                })),
                back_urls: {
                    success: "[https://tienda-chi-rouge.vercel.app](https://tienda-chi-rouge.vercel.app)", // Tu URL real
                    failure: "[https://tienda-chi-rouge.vercel.app](https://tienda-chi-rouge.vercel.app)", 
                    pending: "[https://tienda-chi-rouge.vercel.app](https://tienda-chi-rouge.vercel.app)"
                },
                auto_return: "approved",
            };

            const preference = new Preference(client);
            const result = await preference.create({ body });

            // Devolvemos el ID de la preferencia al frontend
            res.status(200).json({ id: result.id });
        } catch (error) {
            console.error("Error creando preferencia:", error);
            res.status(500).json({ error: "Error al procesar el pago" });
        }
    } else {
        // Si intentan entrar por navegador directo
        res.setHeader('Allow', ['POST']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}
