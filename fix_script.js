const fs = require('fs');
const path = require('path');

const filePath = path.join('c:', 'Users', 'Admin', 'Documents', 'GitHub', 'tienda', 'script.js');
let content = fs.readFileSync(filePath, 'utf8');

// Fix 1: Purchases tab syntax (around line 4554)
// We look for the IIFE return and closing and fix it.
// Original:
// </div>
// );
// })()}
// We match with a regex that is flexible with indentation.
content = content.replace(/(<\/div>\s+)\);\s+(\s+\}\)\(\))/g, '$1)\n$2');

// Fix 2: Remove First Footer/Modal Block and Second main Tag
// We want to find the section from the first footer up to the second main tag.
// First footer starts around 6645.
// Second footer starts around 6826.

const firstFooterIndex = content.indexOf('{view !== \'admin\' && view !== \'login\' && view !== \'register\' && (');
const secondFooterIndex = content.lastIndexOf('{view !== \'admin\' && view !== \'login\' && view !== \'register\' && (');

if (firstFooterIndex !== secondFooterIndex && firstFooterIndex !== -1) {
    // We found duplicates. 
    // We'll also find the </main> tag that's between them.
    const redundantCloseMain = content.indexOf('</main>', firstFooterIndex);

    if (redundantCloseMain !== -1 && redundantCloseMain < secondFooterIndex) {
        // We'll remove from firstFooterIndex to the point just before the second footer.
        // BUT we need to make sure we don't break the admin view closing.

        // Actually, let's just replace the WHOLE problematic section with something clean.
        // We'll find the AccessDenied closing (around 6641).
        const accessDeniedEnd = content.indexOf('<AccessDenied onBack={() => setView(\'store\')} />\r\n                    ))}', 4103);
        // Wait! Indentation might vary. 
        // Let's use a regex for the AccessDenied closing.
        const accessDeniedPattern = /<AccessDenied onBack=\{\(\) => setView\('store'\)\} \/>\s+\)\s+\)\s+\}/;
        const match = content.match(accessDeniedPattern);

        if (match) {
            const startOfEnd = match.index + match[0].length;
            // From here up to the start of the SECOND footer, everything is mess.
            content = content.slice(0, startOfEnd) + '\n                )}\n            </main>\n\n            ' + content.slice(secondFooterIndex);
        }
    }
}

// Fix 3: Restore Privacy Policy view (if missing)
if (content.indexOf('view === \'privacy\'') === -1) {
    const mainEndIndex = content.lastIndexOf('</main>');
    if (mainEndIndex !== -1) {
        const privacyView = `
            {/* 8. VISTA POLÍTICA DE PRIVACIDAD */}
            {view === 'privacy' && (
                <div className="max-w-4xl mx-auto py-20 px-6 animate-fade-up">
                    <div className="glass p-12 rounded-[3rem] border border-slate-800">
                        <div className="prose prose-invert max-w-none">
                            <h1 className="text-5xl font-black mb-12 tracking-tighter italic">
                                Política de <span className="text-cyan-500 text-6xl">Privacidad</span>
                            </h1>
                            <p className="text-slate-400 text-lg leading-relaxed">
                                En <strong>{settings?.storeName || 'SUSTORE'}</strong>, valoramos tu privacidad y nos comprometemos a proteger tus datos personales. Esta política describe cómo recolectamos, usamos y resguardamos tu información.
                            </p>
                            <h2 className="text-2xl font-bold text-white mt-12 mb-6">1. Información Recolectada</h2>
                            <p className="text-slate-500 leadind-relaxed">
                                Recolectamos datos básicos como nombre, correo electrónico y número de teléfono únicamente cuando te registras o realizas un pedido para procesar tu compra correctamente.
                            </p>
                            <h2 className="text-2xl font-bold text-white mt-12 mb-6">2. Uso de los Datos</h2>
                            <p className="text-slate-500 leadind-relaxed">
                                Tu información se utiliza exclusivamente para:
                            </p>
                            <ul className="list-disc pl-6 text-slate-500 space-y-2">
                                <li>Gestionar tus pedidos y entregas.</li>
                                <li>Enviar actualizaciones sobre el estado de tu compra.</li>
                                <li>Mejorar nuestros servicios y experiencia de usuario.</li>
                            </ul>
                            <h2 className="text-2xl font-bold text-white mt-12 mb-6">3. Seguridad</h2>
                            <p className="text-slate-500 leadind-relaxed">
                                Implementamos medidas de seguridad robustas y encriptación de datos para asegurar que tu información esté protegida contra accesos no autorizados.
                            </p>
                            <h2 className="text-2xl font-bold text-white mt-12 mb-6">4. Contacto</h2>
                            <p className="text-slate-500 leadind-relaxed mb-12">
                                Si tienes dudas sobre nuestra política de privacidad, contáctanos a <span className="text-cyan-400">{settings?.contactEmail || 'soporte@sustore.sf'}</span>.
                            </p>
                            <button onClick={() => setView('store')} className="px-10 py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-bold transition flex items-center gap-3 border border-slate-700">
                                <ArrowLeft className="w-5 h-5" /> Volver a la Tienda
                            </button>
                        </div>
                    </div>
                </div>
            )}
        `;
        content = content.slice(0, mainEndIndex) + privacyView + content.slice(mainEndIndex);
    }
}

fs.writeFileSync(filePath, content);
console.log('File script.js optimized and fixed.');
