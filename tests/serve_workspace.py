"""Build the stock page and an opt-in fixture in one disposable static export."""

from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from shutil import copy2, copytree
from subprocess import run
from tempfile import TemporaryDirectory


root = Path(__file__).resolve().parents[1]
with TemporaryDirectory(prefix="minimal-todo-") as directory:
    fixture = Path(directory)
    for name in ("app", "features", "lib"):
        copytree(root / name, fixture / name)
    for name in ("next.config.ts", "package.json", "package-lock.json",
                 "postcss.config.mjs", "tsconfig.json"):
        copy2(root / name, fixture / name)
    (fixture / "node_modules").symlink_to(root / "node_modules", target_is_directory=True)
    example = fixture / "app" / "enhanced"
    example.mkdir()
    (example / "page.tsx").write_text(
        'import { WorkspaceProvider } from "@/features/workspace/WorkspaceContext";\n'
        'import { TodosWorkspace } from "@/features/workspace/Workspace";\n'
        'export default function Example() {\n'
        '  return <WorkspaceProvider><TodosWorkspace enhancedInteractions /></WorkspaceProvider>;\n'
        '}\n'
    )
    run(["npm", "run", "build"], cwd=fixture, check=True)
    handler = partial(SimpleHTTPRequestHandler, directory=str(fixture / "out"))
    with ThreadingHTTPServer(("127.0.0.1", 4173), handler) as server:
        server.serve_forever()
