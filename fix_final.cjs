const fs = require('fs');
const filePath = 'c:/Users/Admin/Desktop/Tienda/CLIENTES/Sustore/script.js';

try {
    let content = fs.readFileSync(filePath, 'utf8');

    const replacements = [
        { bad: 'INFORMACIN BSICA', good: 'INFORMACIÓN BÁSICA' },
        { bad: 'Informacin de la Tienda', good: 'Información de la Tienda' },
        { bad: 'Telfono', good: 'Teléfono' },
        { bad: 'Direccin', good: 'Dirección' },
        { bad: 'Informacin bsica', good: 'Información básica' },
        { bad: 'Informacin bsica', good: 'Información básica' },
        { bad: 'men hamburguesa', good: 'menú hamburguesa' },
        { bad: 'vinculacin', good: 'vinculación' },
        { bad: 'praxeles', good: 'píxeles' },
        { bad: 'pxeles', good: 'píxeles' },
        { bad: 'visualizacin', good: 'visualización' },
        { bad: 'visualizacin', good: 'visualización' },
        { bad: 'Configuracin', good: 'Configuración' },
        { bad: 'Configuracin', good: 'Configuración' },
        { bad: 'Mtodos', good: 'Métodos' },
        { bad: 'Mtodos', good: 'Métodos' },
        { bad: 'Optimizacin', good: 'Optimización' },
        { bad: 'Optimizacin', good: 'Optimización' },
        { bad: 'Ttulo', good: 'Título' },
        { bad: 'Ttulo', good: 'Título' },
        { bad: 'pestaa', good: 'pestaña' },
        { bad: 'Descripcin', good: 'Descripción' },
        { bad: 'Descripcin', good: 'Descripción' },
        { bad: 'Envos', good: 'Envíos' },
        { bad: 'Envos', good: 'Envíos' },
        { bad: 'pas', good: 'país' },
        { bad: 'pas', good: 'país' },
        { bad: 'Visitanos', good: 'Visítanos' },
        { bad: 'Cannica', good: 'Canónica' },
        { bad: 'Cannica', good: 'Canónica' },
        { bad: 'Botn', good: 'Botón' },
        { bad: 'Botn', good: 'Botón' },
        { bad: 'Categoras', good: 'Categorías' },
        { bad: 'Categoras', good: 'Categorías' },
        { bad: 'Categora', good: 'Categoría' },
        { bad: 'Categora', good: 'Categoría' },
        { bad: 'participacin', good: 'participación' },
        { bad: 'participacin', good: 'participación' },
        { bad: 'Polticas', good: 'Políticas' },
        { bad: 'Polticas', good: 'Políticas' },
        { bad: 'Pgina', good: 'Página' },
        { bad: 'Pgina', good: 'Página' },
        { bad: 'Trminos', good: 'Términos' },
        { bad: 'Trminos', good: 'Términos' },
        { bad: 'Privacidad', good: 'Privacidad' },
        { bad: 'Suscripcin', good: 'Suscripción' },
        { bad: 'Suscripcin', good: 'Suscripción' },
        { bad: 'Facturacin', good: 'Facturación' },
        { bad: 'Facturacin', good: 'Facturación' },
    ];

    replacements.forEach(({ bad, good }) => {
        // split/join method to replace all occurrences
        content = content.split(bad).join(good);
    });

    // Regex fixes
    content = content.replace(/Configuraci.n/g, 'Configuración');
    content = content.replace(/Informaci.n/g, 'Información');
    content = content.replace(/Descripci.n/g, 'Descripción');
    content = content.replace(/Categor.as/g, 'Categorías');
    content = content.replace(/Categor.a/g, 'Categoría');
    content = content.replace(/Optimizaci.n/g, 'Optimización');

    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Encoding fixes applied successfully.');
} catch (error) {
    console.error('Error processing file:', error);
    process.exit(1);
}
