// ============================================
// FIRESTORE SECURITY RULES - SUSTORE 63266
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
    // FUNCIONES DE SEGURIDAD
    // ========================================

    // Verificar si es Super Admin
    function isSuperAdmin() {
      return request.auth != null &&
        request.auth.token.email == 'lautarocorazza63@gmail.com';
    }

    // Verificar si está en el equipo como admin
    function isTeamAdmin() {
      let configData = get(/databases/$(database)/documents/artifacts/sustore-63266-prod/public/data/settings/config).data;
      return request.auth != null &&
        configData.teamRoles != null &&
        configData.teamRoles[request.auth.token.email] == 'admin';
    }

    // Verificar si es Admin (cualquier tipo)
    function isAdmin() {
      return isSuperAdmin() || isTeamAdmin();
    }

    // Verificar autenticación
    function isAuthenticated() {
      return request.auth != null;
    }

    // Verificar que es el propietario del documento
    function isOwner(userId) {
      return request.auth != null && request.auth.uid == userId;
    }

    // Validar tamaño de documento (prevenir abuse)
    function isValidSize() {
      return request.resource.size() < 1000000; // 1MB max
    }

    // Validar campos requeridos para usuario
    function isValidUser() {
      let data = request.resource.data;
      return data.keys().hasAll(['email', 'name']) &&
             data.email is string &&
             data.email.size() <= 254 &&
             data.name is string &&
             data.name.size() <= 100 &&
             request.auth != null &&
             data.email == request.auth.token.email;
    }

    // Validar campos requeridos para producto
    function isValidProduct() {
      let data = request.resource.data;
      return data.keys().hasAll(['name', 'basePrice', 'category']) &&
             data.name is string &&
             data.name.size() <= 200 &&
             data.basePrice is number &&
             data.basePrice >= 0 &&
             data.category is string;
    }

    // Validar campos requeridos para pedido
    function isValidOrder() {
      let data = request.resource.data;
      return data.keys().hasAll(['items', 'total', 'customer']) &&
             data.items is list &&
             data.total is number &&
             data.total >= 0;
    }

    // Prevenir escalación de privilegios
    function noPrivilegeEscalation() {
      return !request.resource.data.keys().hasAny(['role', 'isAdmin', '_adminVerified']) ||
             isAdmin();
    }

    // ========================================
    // REGLAS PARA DATOS DE LA APLICACIÓN
    // ========================================
    match /artifacts/{appId}/public/data/{collectionName}/{docId} {

      // ----------------------------------------
      // LECTURA: Datos públicos permitidos
      // ----------------------------------------
      allow read: if collectionName in ['products', 'settings', 'promos', 'categories'];

      // Lectura de usuarios: solo admin o el propio usuario
      allow read: if collectionName == 'users' &&
        (isAdmin() || isOwner(docId));

      // Lectura de pedidos: solo admin o el cliente del pedido
      allow read: if collectionName == 'orders' &&
        (isAdmin() || (isAuthenticated() && resource.data.customerId == request.auth.uid));

      // Lectura de carritos: solo el propietario
      allow read: if collectionName == 'carts' && isOwner(docId);

      // Lectura de cupones: público para validar, pero no mostrar códigos
      allow read: if collectionName == 'coupons';

      // Datos sensibles solo para admin
      allow read: if collectionName in ['suppliers', 'expenses', 'purchases', 'investments'] && isAdmin();

      // ----------------------------------------
      // PRODUCTOS: Solo admin puede crear/editar/eliminar
      // ----------------------------------------
      allow write: if collectionName == 'products' &&
        isAdmin() &&
        isValidSize() &&
        isValidProduct();

      // ----------------------------------------
      // SETTINGS: Solo admin puede modificar configuración
      // ----------------------------------------
      allow write: if collectionName == 'settings' &&
        isAdmin() &&
        isValidSize();

      // ----------------------------------------
      // CUPONES: Solo admin puede gestionar cupones
      // ----------------------------------------
      allow write: if collectionName == 'coupons' &&
        isAdmin() &&
        isValidSize();

      // ----------------------------------------
      // PROMOS: Solo admin puede gestionar promos
      // ----------------------------------------
      allow write: if collectionName == 'promos' && isAdmin();

      // ----------------------------------------
      // PROVEEDORES/GASTOS/COMPRAS: Solo admin
      // ----------------------------------------
      allow write: if collectionName in ['suppliers', 'expenses', 'purchases', 'investments'] && isAdmin();

      // ----------------------------------------
      // USUARIOS:
      // - Cualquiera autenticado puede crear su cuenta
      // - Solo el propio usuario puede actualizar su perfil
      // - No puede cambiar su propio rol
      // - Admin puede ver/editar todos
      // ----------------------------------------
      allow create: if collectionName == 'users' &&
        isAuthenticated() &&
        docId == request.auth.uid &&
        isValidUser() &&
        noPrivilegeEscalation();

      allow update: if collectionName == 'users' &&
        (isOwner(docId) || isAdmin()) &&
        noPrivilegeEscalation();

      allow delete: if collectionName == 'users' && isAdmin();

      // ----------------------------------------
      // CARRITOS:
      // - Usuario autenticado puede gestionar su propio carrito
      // ----------------------------------------
      allow write: if collectionName == 'carts' &&
        isAuthenticated() &&
        isOwner(docId);

      // ----------------------------------------
      // PEDIDOS (Orders):
      // - Solo admin puede escribir pedidos (creación via servidor)
      // ----------------------------------------
      allow write: if collectionName == 'orders' && isAdmin();
    }

    // ========================================
    // REGLA PARA CONFIGURACIÓN DE VERSIÓN
    // ========================================
    match /artifacts/{appId}/public/config {
      allow read: if true;
      allow write: if isAdmin();
    }

    // ========================================
    // BLOQUEAR TODO LO DEMÁS
    // ========================================
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
*/

// ============================================
// NOTAS DE SEGURIDAD IMPORTANTES
// ============================================
//
// 1. NUNCA confíes en datos del cliente
//    - Siempre valida en el servidor (Firestore Rules)
//    - El cliente puede ser manipulado
//
// 2. Principio de mínimo privilegio
//    - Solo dar acceso a lo que realmente se necesita
//    - Separar datos públicos de privados
//
// 3. Validar TODOS los campos de entrada
//    - Tipo de dato correcto
//    - Longitud máxima
//    - Valores permitidos
//
// 4. Prevenir escalación de privilegios
//    - No permitir que usuarios cambien su propio rol
//    - Solo admin puede modificar roles
//
// 5. Rate limiting
//    - Firebase tiene límites automáticos
//    - Implementar límites adicionales en Cloud Functions
//
// ============================================
