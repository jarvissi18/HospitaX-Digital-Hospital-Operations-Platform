"""Print a source-based inventory of FastAPI route decorators.
Run from backend/: python audit_routes.py
This is static inventory, not proof that endpoints work at runtime.
"""
import ast
import csv
from pathlib import Path

ROOT = Path(__file__).resolve().parent / "app" / "routers"
OUT = Path(__file__).resolve().parent / "route_inventory.csv"
METHODS = {"get": "GET", "post": "POST", "put": "PUT", "patch": "PATCH", "delete": "DELETE"}
rows = []

for file in sorted(ROOT.glob("*.py")):
    try:
        tree = ast.parse(file.read_text(encoding="utf-8"))
    except (SyntaxError, UnicodeDecodeError) as exc:
        rows.append([file.name, "", "", "SOURCE_PARSE_ERROR", str(exc)])
        continue
    for node in ast.walk(tree):
        if not isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            continue
        for decorator in node.decorator_list:
            if not isinstance(decorator, ast.Call) or not isinstance(decorator.func, ast.Attribute):
                continue
            method = METHODS.get(decorator.func.attr.lower())
            if not method:
                continue
            path = ast.unparse(decorator.args[0]) if decorator.args else ""
            rows.append([file.name, method, path, node.name, node.lineno])

with OUT.open("w", newline="", encoding="utf-8-sig") as handle:
    writer = csv.writer(handle)
    writer.writerow(["router_file", "method", "declared_path", "handler", "line"])
    writer.writerows(rows)
print(f"Found {len(rows)} route decorators across {len(list(ROOT.glob('*.py')))} router files.")
print(f"Inventory written to: {OUT}")
print("Note: inventory is not runtime functional verification.")
