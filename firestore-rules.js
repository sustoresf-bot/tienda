// ============================================
// FIRESTORE SECURITY RULES - SUSTORE
// ============================================
//
// INSTRUCCIONES:
// 1. Ve a la consola de Firebase: https://console.firebase.google.com
// 2. Selecciona tu proyecto "sustore-63266"
// 3. Ve a Firestore Database → Rules
// 4. Reemplaza TODO el contenido con las reglas de abajo
// 5. Click en "Publish"
//
// ============================================

/*
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // ========================================
    // FUNCIÓN: Verificar si es Super Admin
    // ========================================
    function isSuperAdmin() {
      return request.auth != null &&
        request.auth.token.email == 'lautarocorazza63@gmail.com';
    }

    // ========================================
    // FUNCIÓN: Verificar si está en el equipo como admin
    // ========================================
    function isTeamAdmin() {
      let configData = get(/databases/$(database)/documents/artifacts/sustore-prod-v3/public/data/settings/config).data;
      return request.auth != null &&
        configData.team != null &&
        configData.team.hasAny([{'email': request.auth.token.email, 'role': 'admin'}]);
    }

    // ========================================
    // FUNCIÓN: Verificar si es Admin (cualquier tipo)
    // ========================================
    function isAdmin() {
      return isSuperAdmin() || isTeamAdmin();
    }

    // ========================================
    // REGLAS PARA DATOS DE LA APLICACIÓN
    // ========================================
    match /artifacts/{appId}/public/data/{collectionName}/{docId} {

      // ----------------------------------------
      // LECTURA: Todos pueden leer (tienda pública)
      // ----------------------------------------
      allow read: if true;

      // ----------------------------------------
      // PRODUCTOS: Solo admin puede crear/editar/eliminar
      // ----------------------------------------
      allow write: if collectionName == 'products' && isAdmin();

      // ----------------------------------------
      // SETTINGS: Solo admin puede modificar configuración
      // ----------------------------------------
      allow write: if collectionName == 'settings' && isAdmin();

      // ----------------------------------------
      // CUPONES: Solo admin puede gestionar cupones
      // ----------------------------------------
      allow write: if collectionName == 'coupons' && isAdmin();

      // ----------------------------------------
      // PROMOS: Solo admin puede gestionar promos
      // ----------------------------------------
      allow write: if collectionName == 'promos' && isAdmin();

      // ----------------------------------------
      // PROVEEDORES: Solo admin puede gestionar proveedores
      // ----------------------------------------
      allow write: if collectionName == 'suppliers' && isAdmin();

      // ----------------------------------------
      // GASTOS: Solo admin puede registrar gastos
      // ----------------------------------------
      allow write: if collectionName == 'expenses' && isAdmin();

      // ----------------------------------------
      // COMPRAS (Mayoristas): Solo admin puede gestionar
      // ----------------------------------------
      allow write: if collectionName == 'purchases' && isAdmin();

      // ----------------------------------------
      // USUARIOS:
      // - Cualquiera puede crear su cuenta (registro)
      // - Solo el propio usuario puede actualizar su perfil
      // - Admin puede ver/editar todos
      // ----------------------------------------
      allow create: if collectionName == 'users' && request.auth != null;
      allow update, delete: if collectionName == 'users' &&
        (request.auth.uid == docId || isAdmin());

      // ----------------------------------------
      // CARRITOS:
      // - Usuario autenticado puede gestionar su propio carrito
      // ----------------------------------------
      allow write: if collectionName == 'carts' &&
        request.auth != null && request.auth.uid == docId;

      // ----------------------------------------
      // PEDIDOS (Orders):
      // - Usuarios autenticados pueden CREAR pedidos
      // - Solo admin puede ACTUALIZAR o ELIMINAR pedidos
      // ----------------------------------------
      allow create: if collectionName == 'orders' && request.auth != null;
      allow update, delete: if collectionName == 'orders' && isAdmin();
    }

    // ========================================
    // REGLA PARA CONFIGURACIÓN DE VERSIÓN
    // ========================================
    match /artifacts/{appId}/public/config {
      allow read: if true;
      allow write: if isAdmin();
    }
  }
}
*/

// ============================================
// REGLAS SIMPLIFICADAS (Si las anteriores fallan)
// ============================================
// Si tienes problemas con la función isTeamAdmin(),
// usa estas reglas más simples que solo verifican
// el email del super admin:

/*
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isSuperAdmin() {
      return request.auth != null &&
        request.auth.token.email == 'lautarocorazza63@gmail.com';
    }

    match /artifacts/{appId}/public/data/{collectionName}/{docId} {
      // Lectura pública
      allow read: if true;

      // Solo super admin puede escribir en colecciones críticas
      allow write: if collectionName in ['products', 'settings', 'coupons', 'promos', 'suppliers', 'expenses', 'purchases']
        && isSuperAdmin();

      // Usuarios pueden crear cuentas y pedidos
      allow create: if collectionName in ['users', 'orders', 'carts'] && request.auth != null;

      // Usuarios solo pueden editar su propio perfil
      allow update: if collectionName == 'users' && request.auth != null;
    }

    match /artifacts/{appId}/public/config {
      allow read: if true;
      allow write: if isSuperAdmin();
    }
  }
}
*/

// ============================================
// NOTAS IMPORTANTES
// ============================================
//
// 1. Estas reglas asumen que usas Firebase Anonymous Auth
//    combinado con tu propio sistema de usuarios en Firestore.
//
// 2. Para que 'request.auth.token.email' funcione,
//    el usuario debe haber iniciado sesión con un método
//    que incluya email (Google, Email/Password, etc.)
//
// 3. Si usas SOLO Anonymous Auth, necesitarás modificar
//    la lógica para verificar el email desde tu colección
//    de usuarios en lugar del token de auth.
//
// 4. ALTERNATIVA SIMPLE: Si tienes problemas, puedes
//    hardcodear los UIDs de los admins en las reglas:
//
//    function isAdmin() {
//      return request.auth.uid in ['UID_ADMIN_1', 'UID_ADMIN_2'];
//    }
//
// ============================================
