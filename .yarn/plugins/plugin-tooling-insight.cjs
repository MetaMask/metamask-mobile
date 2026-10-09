const path = require('path');

const plugin = path.join(
  __dirname,
  '../../node_modules/@metamask/tooling-insight/dist/yarn-plugin.cjs',
);

try {
  module.exports = require(plugin);
} catch {
  // Yarn loads this plugin before install, when node_modules is absent.
  module.exports = { name: 'tooling-insight', factory: () => ({}) };
}
