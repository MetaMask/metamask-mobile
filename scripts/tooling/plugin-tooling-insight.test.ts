/**
 * Yarn evaluates `.yarn/plugins/plugin-tooling-insight.cjs` with Node's loader.
 * The spy uses that builtin Module._load, the same one Yarn calls.
 */
import path from 'node:path';

const repoRoot = path.resolve(__dirname, '../..');
const stubPath = path.join(
  repoRoot,
  '.yarn/plugins/plugin-tooling-insight.cjs',
);
const pluginPath = path.join(
  path.dirname(stubPath),
  '../../node_modules/@metamask/tooling-insight/dist/yarn-plugin.cjs',
);

type ModuleLoad = (
  request: string,
  parent: NodeJS.Module | null | undefined,
  isMain: boolean,
) => unknown;

interface NodeModuleLoader {
  _cache: Record<string, NodeJS.Module>;
  _load: ModuleLoad;
  createRequire: (filename: string) => (request: string) => unknown;
}

interface ToolingInsightPlugin {
  name: string;
  factory: () => {
    hooks?: {
      wrapScriptExecution?: () => void;
    };
  };
}

const nodeModule = process.getBuiltinModule('module') as NodeModuleLoader;
const nodeRequire = nodeModule.createRequire(stubPath);

/**
 * Node's loader, saved before the spy replaces Module._load.
 * Requests other than the package plugin go through this.
 */
const originalLoad: ModuleLoad = nodeModule._load.bind(nodeModule);

function installLoad(onPlugin: () => unknown): void {
  const load: ModuleLoad = (request, parent, isMain) => {
    if (request === pluginPath) {
      return onPlugin();
    }
    return originalLoad(request, parent, isMain);
  };

  jest.spyOn(nodeModule, '_load').mockImplementation(load);
}

function loadStub(): ToolingInsightPlugin {
  jest.resetModules();
  delete nodeModule._cache[stubPath];
  return nodeRequire(stubPath) as ToolingInsightPlugin;
}

describe('plugin-tooling-insight', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    jest.resetModules();
    delete nodeModule._cache[stubPath];
  });

  it('exports an empty factory when the package plugin cannot be loaded', () => {
    installLoad(() => {
      const error = new Error(
        `Cannot find module '${pluginPath}'`,
      ) as NodeJS.ErrnoException;
      error.code = 'MODULE_NOT_FOUND';
      throw error;
    });

    const plugin = loadStub();

    expect(plugin.name).toBe('tooling-insight');
    expect(plugin.factory()).toEqual({});
  });

  it('re-exports the package plugin when that file loads', () => {
    const wrapScriptExecution = () => undefined;
    const loaded = {
      name: 'tooling-insight',
      factory: () => ({ hooks: { wrapScriptExecution } }),
    };
    installLoad(() => loaded);

    const plugin = loadStub();

    expect(plugin).toBe(loaded);
    expect(plugin.factory().hooks?.wrapScriptExecution).toBe(
      wrapScriptExecution,
    );
  });
});
