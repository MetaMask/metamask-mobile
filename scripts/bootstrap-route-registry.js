const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const prettier = require('prettier');

const repoRoot = path.resolve(__dirname, '..');
const routesPath = path.join(
  repoRoot,
  'app',
  'constants',
  'navigation',
  'Routes.ts',
);
const pageObjectsRoot = path.join(repoRoot, 'tests', 'page-objects');
const registryPath = path.join(
  pageObjectsRoot,
  'route-registry',
  'route-registry.ts',
);
const NON_SCREEN_KEY_PATHS = new Set([
  'MAIN_FLOW',
  'HOME_TABS',
  'RAMP.ID',
  'RAMP.MODALS.ID',
  'DEPOSIT.ID',
  'DEPOSIT.ROOT',
  'DEPOSIT.MODALS.ID',
  'MODAL.ROOT_MODAL_FLOW',
  'ONBOARDING.ROOT_NAV',
  'ONBOARDING.SUCCESS_FLOW',
  'ONBOARDING.HOME_NAV',
  'ONBOARDING.NAV',
  'WALLET.TAB_STACK_FLOW',
  'BRIDGE.ROOT',
  'BRIDGE.MODALS.ROOT',
  'PERPS.ROOT',
  'PERPS.MODALS.ROOT',
  'MARKET_INSIGHTS.ROOT',
  'SOCIAL.ROOT',
  'PREDICT.ROOT',
  'PREDICT.MODALS.ROOT',
  'EARN.ROOT',
  'EARN.MODALS.ROOT',
  'MONEY.ROOT',
  'MONEY.MODALS.ROOT',
  'SET_PASSWORD_FLOW.ROOT',
  'CARD.ROOT',
  'CARD.ONBOARDING.ROOT',
  'CARD.MODALS.ID',
  'AGENTIC_CLI_DASHBOARD_WEBVIEW.ID',
  'AGENTIC_CLI_APPROVAL.ID',
]);

function getPropertyName(propertyName) {
  if (ts.isIdentifier(propertyName) || ts.isStringLiteral(propertyName)) {
    return propertyName.text;
  }
  return undefined;
}

function extractRoutesFromSource(source) {
  const sourceFile = ts.createSourceFile(
    routesPath,
    source,
    ts.ScriptTarget.Latest,
    true,
  );
  const routes = [];

  function visitObject(objectLiteral, parentPath = '') {
    for (const property of objectLiteral.properties) {
      if (!ts.isPropertyAssignment(property)) {
        continue;
      }

      const name = getPropertyName(property.name);
      if (!name) {
        continue;
      }

      const keyPath = parentPath ? `${parentPath}.${name}` : name;
      if (ts.isStringLiteral(property.initializer)) {
        routes.push({ value: property.initializer.text, keyPath });
      } else if (ts.isObjectLiteralExpression(property.initializer)) {
        visitObject(property.initializer, keyPath);
      }
    }
  }

  function visit(node) {
    const initializer =
      ts.isVariableDeclaration(node) && node.initializer
        ? ts.isAsExpression(node.initializer) ||
          ts.isTypeAssertionExpression(node.initializer)
          ? node.initializer.expression
          : node.initializer
        : undefined;
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.name.text === 'Routes' &&
      initializer &&
      ts.isObjectLiteralExpression(initializer)
    ) {
      visitObject(initializer);
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return routes;
}

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(entryPath) : [entryPath];
  });
}

function normalize(value) {
  return value.replace(/[^a-z0-9]/gi, '').toLowerCase();
}

function normalizeScreenName(value) {
  return normalize(value).replace(/(?:view|page|screen|modal|sheet)$/, '');
}

function getPageObjects() {
  return walk(pageObjectsRoot)
    .filter(
      (filePath) =>
        filePath.endsWith('.ts') &&
        !filePath.endsWith('.test.ts') &&
        !filePath.includes(`${path.sep}route-registry${path.sep}`),
    )
    .flatMap((filePath) => {
      const source = fs.readFileSync(filePath, 'utf8');
      const defaultExport = source.match(
        /export\s+default\s+new\s+([A-Za-z_$][\w$]*)/,
      );
      const namedExport = source.match(
        /export\s+(?:declare\s+)?(?:class|const|function)\s+([A-Za-z_$][\w$]*)/,
      );
      const exportName = defaultExport?.[1] ?? namedExport?.[1];

      if (!exportName) {
        return [];
      }

      const baseName = path.basename(filePath, '.ts');
      return [
        {
          filePath,
          baseName,
          exportName,
          normalizedBaseName: normalize(baseName),
          normalizedClassName: normalize(defaultExport?.[1] ?? namedExport[1]),
          isDefaultExport: Boolean(defaultExport),
        },
      ];
    });
}

function choosePageObject(route, pageObjects) {
  const normalizedRoute = normalize(route.value);
  const directMatches = pageObjects.filter(
    (pageObject) =>
      pageObject.normalizedBaseName === normalizedRoute,
  );
  if (directMatches.length === 1) {
    return { pageObject: directMatches[0], tier: 1 };
  }

  const suffixMatches = pageObjects.filter(
    (pageObject) =>
      normalizeScreenName(pageObject.baseName) ===
      normalizeScreenName(route.value),
  );
  if (suffixMatches.length === 1) {
    return { pageObject: suffixMatches[0], tier: 2 };
  }

  const classMatches = pageObjects.filter(
    (pageObject) => pageObject.normalizedClassName === normalizedRoute,
  );
  if (classMatches.length === 1) {
    return { pageObject: classMatches[0], tier: 3 };
  }

  return undefined;
}

function generateRegistry(routes, pageObjects) {
  const uniqueRoutes = new Map();
  for (const route of routes) {
    const existing = uniqueRoutes.get(route.value);
    if (existing) {
      existing.keyPaths.push(route.keyPath);
    } else {
      uniqueRoutes.set(route.value, { ...route, keyPaths: [route.keyPath] });
    }
  }

  const entries = [];

  for (const route of uniqueRoutes.values()) {
    const isNavigator = route.keyPaths.some((keyPath) =>
      NON_SCREEN_KEY_PATHS.has(keyPath),
    );
    const match = choosePageObject(route, pageObjects);

    let value = 'null';
    let annotation = 'NO-PAGE-OBJECT';
    if (isNavigator) {
      value = 'NOT_A_SCREEN';
      annotation = 'NOT-A-SCREEN';
    } else if (match) {
      value = JSON.stringify(match.pageObject.exportName);
      annotation = `TIER-${match.tier} MATCH`;
    }

    entries.push(
      `  ${JSON.stringify(route.value)}: ${value}, // ${annotation} (${route.keyPaths.join(
        ', ',
      )})`,
    );
  }

  return `/**
 * AUTO-GENERATED by scripts/bootstrap-route-registry.js.
 *
 * Review every entry before committing. Use NOT_A_SCREEN for navigator hosts
 * and redirects, null for screens without a page object, and a page-object
 * class name for verified coverage.
 */

export type PageObject = string;

export const NOT_A_SCREEN = 'not-a-screen' as const;

export type RoutePageObjectRegistry = Record<
  string,
  PageObject | typeof NOT_A_SCREEN | null
>;

export const ROUTE_PAGE_OBJECT_REGISTRY: RoutePageObjectRegistry = {
${entries.join('\n')}
};
`;
}

async function main() {
  const routes = extractRoutesFromSource(fs.readFileSync(routesPath, 'utf8'));
  const pageObjects = getPageObjects();
  fs.mkdirSync(path.dirname(registryPath), { recursive: true });
  const output = await prettier.format(generateRegistry(routes, pageObjects), {
    filepath: registryPath,
    parser: 'typescript',
    singleQuote: true,
  });
  fs.writeFileSync(
    registryPath,
    output,
    'utf8',
  );
  console.log(
    `Generated ${new Set(routes.map(({ value }) => value)).size} route entries from ${routes.length} route constants.`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
