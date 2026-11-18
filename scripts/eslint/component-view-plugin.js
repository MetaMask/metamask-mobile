/**
 * Checks a selector cannot express: a `{ timeout }` with no nearby comment,
 * and `jest.clearAllMocks()` when the file never resets implementations.
 *
 * Nested `findBy*` and fixed sleeps are `no-restricted-syntax` selectors in
 * eslint.config.mjs, under this plugin's re-exported rule so they can warn
 * while the error-level bans in .eslintrc.js stay errors.
 */
'use strict';

const SKILL_URL =
  'https://github.com/MetaMask/skills/blob/main/domains/testing/skills/mobile-testing/references/component-view.md';

const FIND_QUERY_NAME = /^find(?:All)?By[A-Z]/u;
const BOUNDARY_COMMENT_MIN_LENGTH = 8;

const BARE_TIMEOUT_MESSAGE = `A bare { timeout } on waitFor/findBy* is not a fix. Keep the default unless a debounce or chained query needs longer, and add a comment naming that async boundary (a comment on a shared timeout constant counts for every use). See the mobile-testing skill: ${SKILL_URL}`;

const CLEAR_ALL_MOCKS_MESSAGE = `jest.clearAllMocks() drops call history but keeps the last mockImplementation / mockResolvedValue, so a later test flakes ("Expected number of calls: N, Received: M"). Call mockReset() or jest.resetAllMocks() in beforeEach when a test changes implementations (mockRestore() / jest.restoreAllMocks() also drops that implementation). To drop call history only, mockClear() the specific mock. See the mobile-testing skill: ${SKILL_URL}`;

/**
 * @param {import('estree').Node | undefined | null} callee
 * @returns {string | undefined}
 */
function calleeName(callee) {
  if (!callee) {
    return undefined;
  }
  if (callee.type === 'Identifier') {
    return callee.name;
  }
  if (
    callee.type === 'MemberExpression' &&
    !callee.computed &&
    callee.property &&
    callee.property.type === 'Identifier'
  ) {
    return callee.property.name;
  }
  return undefined;
}

/**
 * @param {import('estree').Node} node
 * @param {(node: import('estree').Node) => void} visit
 * @returns {void}
 */
function walk(node, visit) {
  if (!node || typeof node !== 'object') {
    return;
  }
  visit(node);
  for (const key of Object.keys(node)) {
    if (key === 'parent') {
      continue;
    }
    const child = node[key];
    if (Array.isArray(child)) {
      for (const entry of child) {
        if (entry && typeof entry.type === 'string') {
          walk(entry, visit);
        }
      }
    } else if (child && typeof child.type === 'string') {
      walk(child, visit);
    }
  }
}

/**
 * @param {import('eslint').SourceCode} sourceCode
 * @param {import('estree').Node} node
 * @returns {import('eslint').Scope.Scope | undefined}
 */
function scopeAt(sourceCode, node) {
  if (typeof sourceCode.getScope === 'function') {
    return sourceCode.getScope(node);
  }
  return undefined;
}

/**
 * @param {import('eslint').Scope.Scope | undefined} scope
 * @param {string} name
 * @returns {import('eslint').Scope.Variable | undefined}
 */
function findVariable(scope, name) {
  let current = scope;
  while (current) {
    const variable = current.set && current.set.get(name);
    if (variable) {
      return variable;
    }
    current = current.upper;
  }
  return undefined;
}

/**
 * @param {import('eslint').Scope.Variable | undefined} variable
 * @returns {import('estree').Node | undefined}
 */
function variableDeclarator(variable) {
  const definition = variable?.defs?.find((item) => item.type === 'Variable');
  if (definition?.node?.type === 'VariableDeclarator') {
    return definition.node;
  }
  return undefined;
}

/**
 * @param {import('eslint').Scope.Variable | undefined} variable
 * @returns {import('estree').Node | undefined}
 */
function variableDeclaration(variable) {
  const definition = variable?.defs?.find((item) => item.type === 'Variable');
  if (definition?.parent?.type === 'VariableDeclaration') {
    return definition.parent;
  }
  return variableDeclarator(variable);
}

/**
 * @param {string} value
 * @returns {boolean}
 */
function isBoundaryComment(value) {
  const text = value.replace(/\*+/gu, ' ').replace(/\s+/gu, ' ').trim();
  if (text.length < BOUNDARY_COMMENT_MIN_LENGTH) {
    return false;
  }
  return !/^(?:eslint(?:-disable|-enable|-env)?|@ts-|istanbul|prettier-ignore)\b/u.test(
    text,
  );
}

/**
 * @param {import('estree').Comment} comment
 * @param {import('estree').Node} node
 * @param {boolean} leading
 * @returns {boolean}
 */
function commentTouchesNode(comment, node, leading) {
  if (!node.loc || !isBoundaryComment(comment.value)) {
    return false;
  }
  const line = comment.loc.end.line;
  if (line >= node.loc.start.line && line <= node.loc.end.line) {
    return true;
  }
  return leading && line === node.loc.start.line - 1;
}

/**
 * @param {import('eslint').SourceCode} sourceCode
 * @param {import('estree').Node} node
 * @param {boolean} leading
 * @returns {boolean}
 */
function nodeHasBoundaryComment(sourceCode, node, leading) {
  if (!node?.loc) {
    return false;
  }
  const comments = [
    ...sourceCode.getCommentsBefore(node),
    ...sourceCode.getCommentsAfter(node),
  ];
  if (
    node.type === 'ObjectExpression' &&
    typeof sourceCode.getCommentsInside === 'function'
  ) {
    comments.push(...sourceCode.getCommentsInside(node));
  }
  return comments.some((comment) =>
    commentTouchesNode(comment, node, leading),
  );
}

/**
 * @param {import('estree').Node} node
 * @returns {import('estree').Node}
 */
function enclosingStatement(node) {
  let current = node;
  while (current.parent) {
    const { parent } = current;
    if (
      parent.type === 'Program' ||
      parent.type === 'BlockStatement' ||
      parent.type === 'SwitchCase' ||
      parent.type === 'StaticBlock'
    ) {
      return current;
    }
    current = parent;
  }
  return current;
}

/**
 * @param {import('estree').Node} property
 * @returns {boolean}
 */
function isTimeoutProperty(property) {
  if (property.type !== 'Property' || property.computed) {
    return false;
  }
  if (property.key.type === 'Identifier') {
    return property.key.name === 'timeout';
  }
  return property.key.type === 'Literal' && property.key.value === 'timeout';
}

/**
 * @param {import('eslint').SourceCode} sourceCode
 * @param {import('estree').Node} node
 * @returns {import('estree').Node | undefined}
 */
function resolvedObjectExpression(sourceCode, node) {
  if (node.type === 'ObjectExpression') {
    return node;
  }
  if (node.type !== 'Identifier') {
    return undefined;
  }
  const declarator = variableDeclarator(
    findVariable(scopeAt(sourceCode, node), node.name),
  );
  if (declarator?.init?.type === 'ObjectExpression') {
    return declarator.init;
  }
  return undefined;
}

/**
 * @param {import('eslint').SourceCode} sourceCode
 * @param {import('estree').Property} property
 * @param {import('estree').CallExpression} call
 * @param {import('estree').Node} argument
 * @returns {boolean}
 */
function timeoutIsDocumented(sourceCode, property, call, argument) {
  const anchors = [property];
  if (property.parent?.type === 'ObjectExpression') {
    anchors.push(property.parent);
  }
  if (argument !== property.parent) {
    anchors.push(argument);
  }
  const statement = enclosingStatement(call);
  if (
    statement.loc &&
    property.loc &&
    statement.loc.start.line === property.loc.start.line
  ) {
    anchors.push(statement);
  }
  if (anchors.some((anchor) => nodeHasBoundaryComment(sourceCode, anchor, true))) {
    return true;
  }
  if (
    [call, statement].some((anchor) =>
      nodeHasBoundaryComment(sourceCode, anchor, false),
    )
  ) {
    return true;
  }
  const names = [];
  if (property.value?.type === 'Identifier') {
    names.push(property.value.name);
  }
  if (argument.type === 'Identifier') {
    names.push(argument.name);
  }
  return names.some((name) => {
    const declaration = variableDeclaration(
      findVariable(scopeAt(sourceCode, call), name),
    );
    if (!declaration?.loc) {
      return false;
    }
    return sourceCode.getCommentsBefore(declaration).some((comment) => {
      if (!isBoundaryComment(comment.value)) {
        return false;
      }
      const line = comment.loc.end.line;
      return (
        line >= declaration.loc.start.line - 2 &&
        line < declaration.loc.start.line
      );
    });
  });
}

const noBareQueryTimeout = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow a bare { timeout } on waitFor/findBy* without a comment naming the async boundary',
      url: SKILL_URL,
    },
    schema: [],
    messages: { bareTimeout: BARE_TIMEOUT_MESSAGE },
  },
  create(context) {
    const sourceCode = context.sourceCode ?? context.getSourceCode();
    const reported = new WeakSet();
    return {
      CallExpression(node) {
        const name = calleeName(node.callee);
        if (name !== 'waitFor' && !FIND_QUERY_NAME.test(name ?? '')) {
          return;
        }
        for (const argument of node.arguments) {
          const objectExpression = resolvedObjectExpression(
            sourceCode,
            argument,
          );
          if (!objectExpression) {
            continue;
          }
          for (const property of objectExpression.properties) {
            if (!isTimeoutProperty(property) || reported.has(property)) {
              continue;
            }
            if (timeoutIsDocumented(sourceCode, property, node, argument)) {
              continue;
            }
            reported.add(property);
            context.report({ node: property, messageId: 'bareTimeout' });
          }
        }
      },
    };
  },
};

/**
 * @param {import('estree').Node} node
 * @returns {boolean}
 */
function isJestClearAllMocks(node) {
  return (
    node.type === 'CallExpression' &&
    node.callee.type === 'MemberExpression' &&
    !node.callee.computed &&
    node.callee.object.type === 'Identifier' &&
    node.callee.object.name === 'jest' &&
    node.callee.property.type === 'Identifier' &&
    node.callee.property.name === 'clearAllMocks'
  );
}

/**
 * @param {import('estree').Node} node
 * @returns {boolean}
 */
function isImplementationReset(node) {
  if (
    node.type !== 'CallExpression' ||
    node.callee.type !== 'MemberExpression' ||
    node.callee.computed ||
    node.callee.property.type !== 'Identifier'
  ) {
    return false;
  }
  const { name } = node.callee.property;
  if (name === 'mockReset' || name === 'mockRestore') {
    return true;
  }
  return (
    (name === 'resetAllMocks' || name === 'restoreAllMocks') &&
    node.callee.object.type === 'Identifier' &&
    node.callee.object.name === 'jest'
  );
}

const noClearAllMocksWithoutReset = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow jest.clearAllMocks() unless the file also resets mock implementations',
      url: SKILL_URL,
    },
    schema: [],
    messages: { clearAllMocks: CLEAR_ALL_MOCKS_MESSAGE },
  },
  create(context) {
    return {
      'Program:exit'(program) {
        /** @type {import('estree').Node[]} */
        const clears = [];
        let hasReset = false;
        walk(program, (node) => {
          if (isJestClearAllMocks(node)) {
            clears.push(node);
          }
          if (isImplementationReset(node)) {
            hasReset = true;
          }
        });
        if (hasReset) {
          return;
        }
        for (const node of clears) {
          context.report({ node, messageId: 'clearAllMocks' });
        }
      },
    };
  },
};

module.exports = {
  meta: {
    name: 'component-view',
    version: '1.0.0',
  },
  rules: {
    'no-restricted-syntax': require('eslint/use-at-your-own-risk').builtinRules.get(
      'no-restricted-syntax',
    ),
    'no-bare-query-timeout': noBareQueryTimeout,
    'no-clear-all-mocks-without-reset': noClearAllMocksWithoutReset,
  },
};
