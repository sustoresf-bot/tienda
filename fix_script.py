import os

file_path = r'c:\Users\Admin\Documents\GitHub\tienda\script.js'

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Fix 1: Purchases tab syntax (around line 4554)
# We look for the IIFE closing and fix it.
for i in range(len(lines)):
    if 'REGISTRAR REPOSICIÓN DE STOCK' in lines[i] and 'button' in lines[i-1]:
        # This is the button. The IIFE closing is above it.
        # We need to find the specific pattern.
        pass

# Actually, I'll just look for the specific lines.
for i in range(len(lines)):
    if ');' in lines[i] and '})()' in lines[i+1] and i > 4500 and i < 4600:
        lines[i] = ' ' * 52 + ')\n'
        lines[i+1] = ' ' * 48 + '})()}\n'
        break

# Fix 2: Remove duplicate footer/modals and fix hierarchy
# We'll remove the block between line 6645 and 6822.
# And we'll re-insert the privacy view and a clean footer into a better spot.

# Actually, it's easier to just find the markers.
start_duplicate = -1
end_duplicate = -1
for i in range(len(lines)):
    if 'FOOTER PROFESIONAL' in lines[i]:
        if start_duplicate == -1:
            start_duplicate = i
        else:
            end_duplicate = i # This is the start of the second footer

if start_duplicate != -1 and end_duplicate != -1:
    # Remove everything from the first footer up to the end of the first modal block
    # We'll assume the first block ends at line 6822 (approximately)
    # Let's find the ')}' that closes the manual sale modal before the second footer.
    block_end = -1
    for i in range(end_duplicate, start_duplicate, -1):
        if ')}' in lines[i] and '</main>' in lines[i+1]:
            block_end = i
            break
    
    if block_end != -1:
        # Remove the block
        del lines[start_duplicate:end_duplicate]

# Final Cleanup: Ensure App ends correctly
# (This is more complex, but we'll try to reach a stable state)

with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(lines)

print("File updated successfully.")
