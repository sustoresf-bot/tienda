
def check_balance(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()
    
    stack = []
    line_num = 1
    col_num = 1
    
    # Simple state machine to ignore comments and strings
    in_string = None # '"', "'", '`'
    in_comment = None # '//', '/*'
    
    i = 0
    while i < len(content):
        char = content[i]
        
        if in_comment == '//':
            if char == '\n':
                in_comment = None
        elif in_comment == '/*':
            if char == '*' and i+1 < len(content) and content[i+1] == '/':
                in_comment = None
                i += 1
        elif in_string:
            if char == in_string:
                if content[i-1] != '\\':
                    in_string = None
        else:
            if char == '/' and i+1 < len(content):
                if content[i+1] == '/':
                    in_comment = '//'
                    i += 1
                elif content[i+1] == '*':
                    in_comment = '/*'
                    i += 1
            elif char in '"\'`':
                in_string = char
            elif char in '({[':
                stack.append((char, line_num, col_num))
            elif char in ')}]':
                if not stack:
                    print(f"Extra closing {char} at line {line_num}, col {col_num}")
                else:
                    opening, l, c = stack.pop()
                    if (opening == '(' and char != ')') or \
                       (opening == '{' and char != '}') or \
                       (opening == '[' and char != ']'):
                        print(f"Mismatch: {opening} at {l}:{c} with {char} at {line_num}:{col_num}")
        
        if char == '\n':
            line_num += 1
            col_num = 1
        else:
            col_num += 1
        i += 1
    
    for char, l, c in stack:
        print(f"Unclosed {char} from line {l}, col {c}")

if __name__ == "__main__":
    import sys
    check_balance(sys.argv[1])
