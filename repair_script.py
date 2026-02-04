import re

path = r'c:\Users\Admin\Desktop\Tienda\CLIENTES\Sustore\script.js'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

content, _ = re.subn(
    r'Avatar del Asistente</p>\s+</div>\s+</div>\s+</div>\s+ \)\}',
    r'Avatar del Asistente</p>\n                                     </div>\n                                 </div>\n                             </div>\n                         </div>\n                     </div>\n                 ) : null\n             }',
    content,
)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
