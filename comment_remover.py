import re
import sys

def remove_comments(text):
    # Regex for C-style comments (// and /* */)
    # This is a common challenge.
    # A robust way is to use a state machine, not just regex,
    # to avoid matching // inside strings.

    # Simple state machine:
    # 0: code
    # 1: inside // comment
    # 2: inside /* */ comment
    # 3: inside " string
    # 4: inside ' string

    result = []
    i = 0
    n = len(text)

    while i < n:
        if i + 1 < n and text[i:i+2] == '//' and state == 0:
            # Found //, skip until end of line
            while i < n and text[i] != '\n':
                i += 1
            continue
        # ... and so on
        # This is getting complex.

    return text

# Actually, the user wants me to do this safely.
# If I use a library, I don't have one in the sandbox.
# I will write a simpler, safer approach:
# Look for // that is NOT preceded by ' or " or /
