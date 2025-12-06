import { MercadoPagoConfig, Preference } from 'mercadopago';

const client = new MercadoPagoConfig({ 
    accessToken: process.env.MP_ACCESS_TOKEN 
});

export default async function handler(req, res) {
    if (req.method === 'POST') {
        try {
            const { items } = req.body;

            const body = {
                items: items.map(item => ({
                    id: item.id,
                    title: item.title,
                    quantity: Number(item.quantity),
                    unit_price: Number(item.unit_price),
                    currency_id: "ARS"
                })),
                back_urls: {
                    success: "https://tienda-4yap07jca-sustoresf-bots-projects.vercel.app", 
                    failure: "https://tienda-4yap07jca-sustoresf-bots-projects.vercel.app", 
                    pending: "https://tienda-4yap07jca-sustoresf-bots-projects.vercel.app"
                },
                auto_return: "approved",
            };

            const preference = new Preference(client);
            const result = await preference.create({ body });

            // CAMBIO CLAVE: Devolvemos init_point para redirección directa
            res.status(200).json({ 
                id: result.id, 
                url: result.init_point 
            });
            
        } catch (error) {
            console.error("Error creando preferencia:", error);
            res.status(500).json({ error: "Error al procesar el pago" });
        }
    } else {
        res.setHeader('Allow', ['POST']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}
