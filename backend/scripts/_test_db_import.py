import sys
# Ensure project root on sys.path so 'backend' package is importable
sys.path.insert(0, r'C:/Users/Trova/Lumino ai')
try:
    import backend.database
    print('import_ok')
except Exception as e:
    print('import_failed', e)
    sys.exit(2)
