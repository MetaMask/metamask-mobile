import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const stubSource = path.join(__dirname, 'plugin-tooling-insight.cjs');
const packagePluginPath = path.join(
  __dirname,
  '../../node_modules/@metamask/tooling-insight/dist/yarn-plugin.cjs',
);

interface ToolingInsightPlugin {
  name: string;
  factory: () => Record<string, unknown>;
}

describe('plugin-tooling-insight', () => {
  const roots: string[] = [];
  const previousParentMarker = process.env.TOOL_USAGE_PARENT;

  afterEach(() => {
    for (const root of roots.splice(0)) {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  // The package plugin marks this process as the Yarn parent when it loads.
  afterAll(() => {
    if (previousParentMarker === undefined) {
      delete process.env.TOOL_USAGE_PARENT;
    } else {
      process.env.TOOL_USAGE_PARENT = previousParentMarker;
    }
  });

  it('re-exports the package plugin', () => {
    const requirePlugin = createRequire(stubSource);
    const stub = requirePlugin(stubSource) as ToolingInsightPlugin;
    const packagePlugin = requirePlugin(
      packagePluginPath,
    ) as ToolingInsightPlugin;

    expect(stub).toBe(packagePlugin);
  });

  it('exports an empty factory when Yarn loads the plugin before install', () => {
    const root = fs.mkdtempSync(
      path.join(os.tmpdir(), 'tooling-insight-plugin-'),
    );
    roots.push(root);
    const pluginDir = path.join(root, '.yarn', 'plugins');
    fs.mkdirSync(pluginDir, { recursive: true });
    const stubPath = path.join(pluginDir, 'plugin-tooling-insight.cjs');
    fs.copyFileSync(stubSource, stubPath);

    const plugin = createRequire(stubPath)(stubPath) as ToolingInsightPlugin;

    expect(plugin.name).toBe('tooling-insight');
    expect(plugin.factory()).toEqual({});
  });
});
