import vm from 'node:vm';

/** Execute a generated WebView snippet against the test's browser fixtures. */
export function runWebViewSnippet(
  source: string,
  bindings: Record<string, unknown>,
): void {
  vm.compileFunction(source, Object.keys(bindings))(...Object.values(bindings));
}
