/* eslint-disable import-x/no-commonjs */
const ts = require('typescript');

const CACHE_KEY = 'metamask-dependency-extractor-v1';

const SETUP_FILE =
  /(?:^|\/)app\/util\/test\/testSetup(?:View)?\.js$/;

/**
 * @param {string} filePath
 * @returns {ts.ScriptKind}
 */
function scriptKind(filePath) {
  if (filePath.endsWith('.tsx')) {
    return ts.ScriptKind.TSX;
  }
  if (filePath.endsWith('.ts')) {
    return ts.ScriptKind.TS;
  }
  if (filePath.endsWith('.jsx')) {
    return ts.ScriptKind.JSX;
  }
  return ts.ScriptKind.JS;
}

/**
 * @param {ts.Node} node
 * @returns {string | null}
 */
function stringArgument(node) {
  if (!node) {
    return null;
  }
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    return node.text;
  }
  return null;
}

/**
 * Runtime dependencies for Jest's module graph.
 *
 * Type-only imports are omitted. `jest.mock(module, factory)` is not an edge,
 * because the factory replaces the module. A file that calls
 * `jest.requireActual` or `jest.unmock` for that module keeps the edge.
 * Setup files (`testSetup.js`, `testSetupView.js`) are the global cut points:
 * their factory mocks do not connect `store`, `Engine` and the rest to every suite.
 *
 * @param {string} code
 * @param {string} filePath
 * @returns {string[]}
 */
function extractDependencies(code, filePath) {
  const source = ts.createSourceFile(
    filePath,
    code,
    ts.ScriptTarget.Latest,
    true,
    scriptKind(filePath),
  );
  const dependencies = new Set();
  const factoryMocks = new Set();
  const keptByActual = new Set();

  /**
   * @param {string | null} specifier
   */
  const addDependency = (specifier) => {
    if (specifier) {
      dependencies.add(specifier);
    }
  };

  /**
   * @param {ts.Node} node
   */
  const visit = (node) => {
    if (ts.isImportDeclaration(node) && node.moduleSpecifier) {
      const specifier = stringArgument(node.moduleSpecifier);
      const clause = node.importClause;
      if (!clause || !clause.isTypeOnly) {
        const named =
          clause?.namedBindings && ts.isNamedImports(clause.namedBindings)
            ? clause.namedBindings.elements
            : [];
        const hasValueNamed = named.some((element) => !element.isTypeOnly);
        const hasValueDefault = Boolean(clause?.name);
        const hasNamespace = Boolean(
          clause?.namedBindings && ts.isNamespaceImport(clause.namedBindings),
        );
        if (!clause || hasValueNamed || hasValueDefault || hasNamespace) {
          addDependency(specifier);
        }
      }
    } else if (
      ts.isExportDeclaration(node) &&
      node.moduleSpecifier &&
      !node.isTypeOnly
    ) {
      const specifier = stringArgument(node.moduleSpecifier);
      if (node.exportClause && ts.isNamedExports(node.exportClause)) {
        if (node.exportClause.elements.some((element) => !element.isTypeOnly)) {
          addDependency(specifier);
        }
      } else {
        addDependency(specifier);
      }
    } else if (ts.isCallExpression(node)) {
      const { expression } = node;
      if (
        expression.kind === ts.SyntaxKind.ImportKeyword ||
        (ts.isIdentifier(expression) && expression.text === 'require')
      ) {
        addDependency(stringArgument(node.arguments[0]));
      } else if (
        ts.isPropertyAccessExpression(expression) &&
        ts.isIdentifier(expression.expression) &&
        expression.expression.text === 'jest'
      ) {
        const specifier = stringArgument(node.arguments[0]);
        const method = expression.name.text;
        if (method === 'mock' || method === 'doMock') {
          if (specifier && node.arguments.length >= 2) {
            factoryMocks.add(specifier);
          } else {
            addDependency(specifier);
          }
        } else if (
          (method === 'requireActual' || method === 'unmock') &&
          specifier
        ) {
          keptByActual.add(specifier);
          addDependency(specifier);
        }
      }
    }

    ts.forEachChild(node, visit);
  };

  visit(source);

  for (const mocked of factoryMocks) {
    if (!keptByActual.has(mocked)) {
      dependencies.delete(mocked);
    }
  }

  // A setup file's factory mock is a cut even when the same file also imports it.
  if (SETUP_FILE.test(filePath.replace(/\\/g, '/'))) {
    for (const mocked of factoryMocks) {
      if (!keptByActual.has(mocked)) {
        dependencies.delete(mocked);
      }
    }
  }

  return [...dependencies];
}

module.exports = {
  extractDependencies,
  /**
   * @param {string} code
   * @param {string} filePath
   * @param {(code: string, filePath: string) => string[]} defaultExtract
   * @returns {string[]}
   */
  extract(code, filePath, defaultExtract) {
    try {
      return extractDependencies(code, filePath);
    } catch {
      return defaultExtract(code, filePath);
    }
  },
  getCacheKey() {
    return CACHE_KEY;
  },
};
