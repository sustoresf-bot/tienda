import re

path = r'c:\Users\Admin\Desktop\Tienda\CLIENTES\Sustore\script.js'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Area 2: Settings (around 10134)
content = re.sub(r'Avatar del Asistente</p>\s+</div>\s+</div>\s+</div>\s+ \)\}', 
                 r'Avatar del Asistente</p>\n                                     </div>\n                                 </div>\n                             </div>\n                         </div>\n                     </div>\n                 ) : null\n             }', content)

# Area 3: Admin (around 10962)
content = re.sub(r'</main >\s+\)\s+}', 
                 r')\n                        }', content)

# Area 4: Footer (around 11144)
content = re.sub(r'</div>\s+</div>\s+</main >', 
                 r'</div>\n                                 </main >', content)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
