# Sustore (dev)

## Correr en local

1. Crear `.env` (o `.env.local`) copiando de `.env.example`.
2. Completar variables mínimas:
   - `FIREBASE_SERVICE_ACCOUNT` (recomendado) **o** `FIREBASE_PROJECT_ID` + `FIREBASE_CLIENT_EMAIL` + `FIREBASE_PRIVATE_KEY`
   - `SUPER_ADMIN_EMAIL` (si vas a bootstrapear el Super Admin en localhost)
   - `SUSTORE_APP_ID` (si querés forzar una tienda por defecto en local)
3. Iniciar:

```bash
npm start
```

El servidor de desarrollo carga automáticamente `.env.local` y `.env`.

## Firebase Admin (por qué fallaba login legacy)

Los endpoints `/api/auth/legacy-login` y `/api/auth/bootstrap-super-admin` usan Firebase Admin SDK (Auth + Firestore).
Si el backend no tiene credenciales, vas a ver errores como “Unable to detect a Project Id…”.

Opciones de configuración:

- **Opción A (simple):** `FIREBASE_SERVICE_ACCOUNT` con el JSON completo (en una sola línea).
- **Opción A2 (más segura en local):** guardar el JSON como archivo `.firebase-service-account.json` y setear `FIREBASE_SERVICE_ACCOUNT_FILE=.firebase-service-account.json` (el archivo está ignorado por git).
- **Opción B:** variables separadas:
  - `FIREBASE_PROJECT_ID`
  - `FIREBASE_CLIENT_EMAIL`
  - `FIREBASE_PRIVATE_KEY` (pegado con `\n` en lugar de saltos reales)

Para verificar si el backend quedó configurado, hacé un GET a `/api/auth/legacy-login` (devuelve `firebaseAdmin.configured`).
