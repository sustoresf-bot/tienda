import { MercadoPagoConfig, Preference } from 'mercadopago';
import { getStoreAccessTokenForOperations } from './store-credentials.js';

export async function createPreferenceForStore({ db, storeId, body }) {
    const { accessToken } = await getStoreAccessTokenForOperations({ db, storeId });
    const client = new MercadoPagoConfig({ accessToken });
    const preference = new Preference(client);
    return preference.create({ body });
}
