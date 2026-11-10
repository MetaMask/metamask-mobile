/**
 * ESLint rules for component-view tests (`*.view.test.*`) and
 * `tests/component-view/` helpers.
 *
 * Selectors cannot express a comment next to `{ timeout }` or
 * "`clearAllMocks` only when the file never resets implementations", and
 * `no-restricted-syntax` has one severity for every selector. These rules are
 * separate so the fake-timer ban can stay an error while patterns that
 * already exist in the tree warn.
 *
 * `testing-library/prefer-find-by` is not used: it flags `waitFor(() => getBy*)`,
 * which is an allowed alternative to a nested `findBy*`.
 * `testing-library/no-wait-for-side-effects` does not flag `findBy*` inside
 * `waitFor`.
 */

'use strict';

const SKILL_URL =
  'https://github.com/MetaMask/skills/blob/main/domains/testing/skills/mobile-testing/references/component-view.md';

/**
 * @param {string} message
 * @returns {string}
 */
function withSkill(message) {
  return `${message} See the mobile-testing skill: ${SKILL_URL}`;
}

const FAKE_TIMER_MESSAGE = withSkill(
  'Component-view tests must not use fake timers. Test countdowns, debounces, and expiry in a unit test, where fake timers are allowed, or serve fixtures already in the target state (an expired quote, an ended game).',
);

const ARBITRARY_MOCK_MESSAGE = withSkill(
  'Arbitrary jest.mock() is not allowed in component-view tests. Drive behaviour through Redux state, presets, and renderers, or intercept HTTP with tests/component-view/api-mocking (nock). Only Engine (`core/Engine`, `core/Engine/Engine`) and `react-native-device-info` may be mocked in a view test; other framework mocks belong in tests/component-view/mocks.ts.',
);

const NESTED_FIND_MESSAGE = withSkill(
  'Do not nest findBy*/findAllBy* inside waitFor. findBy* already polls (waitFor + getBy) and the two share one timeout, so CI fails with "Timed out in waitFor." Use `await findBy*` or `waitFor(() => { getBy*; expect(...) })`.',
);

const FIXED_SLEEP_MESSAGE = withSkill(
  'Do not sleep on a fixed delay (`setTimeout` with a delay other than 0, or `sleep()`). A zero-delay flush (`setTimeout(resolve, 0)`) is allowed. Await the observable outcome with `waitFor` or `findBy*` instead of letting time pass.',
);

const BARE_TIMEOUT_MESSAGE = withSkill(
  'A bare `{ timeout }` on waitFor/findBy* is not a fix. Keep the default unless a debounce or chained query needs longer, and add a comment naming that async boundary (a comment on a shared timeout constant counts for every use).',
);

const CLEAR_ALL_MOCKS_MESSAGE = withSkill(
  'jest.clearAllMocks() drops call history but keeps the last mockImplementation / mockResolvedValue, so a later test flakes ("Expected number of calls: N, Received: M"). Call mockReset() or jest.resetAllMocks() in beforeEach when a test changes implementations (mockRestore() / jest.restoreAllMocks() also drops that implementation). To drop call history only, mockClear() the specific mock.',
);

// Relative imports of Engine from a view test or from tests/component-view/.
const ENGINE_SPECIFIER =
  /^(?:\.\.\/)+(?:app\/)?core\/Engine(?:\/Engine(?:\.ts)?)?$/;

const DEVICE_INFO_SPECIFIER = 'react-native-device-info';

// Modules `tests/component-view/mocks.ts` mocks besides Engine and device-info.
const FRAMEWORK_EXTRA_SPECIFIERS = new Set([
  'expo-web-browser',
  'react-native/Libraries/Animated/Easing',
]);

const DEVICE_ANALYTICS_SPECIFIER =
  /^(?:\.\.\/)+app\/util\/metrics\/DeviceAnalyticsMetaData\/generateDeviceAnalyticsMetaData$/;

const FIND_QUERY_NAME = /^find(?:All)?By[A-Z]/;

const BOUNDARY_COMMENT_MIN_LENGTH = 8;

/**
 * @param {string} value
 * @param {boolean} allowFrameworkExtras
 * @returns {boolean}
 */
function isAllowedMockSpecifier(value, allowFrameworkExtras) {
  if (value === DEVICE_INFO_SPECIFIER || ENGINE_SPECIFIER.test(value)) {
    return true;
  }
  if (!allowFrameworkExtras) {
    return false;
  }
  return (
    FRAMEWORK_EXTRA_SPECIFIERS.has(value) ||
    DEVICE_ANALYTICS_SPECIFIER.test(value)
  );
}

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
 * @param {{ skipNestedWaitFor?: boolean, root?: import('estree').Node }} [options]
 * @returns {void}
 */
function walk(node, visit, options) {
  if (!node || typeof node !== 'object') {
    return;
  }
  visit(node);
  if (
    options?.skipNestedWaitFor &&
    node !== options.root &&
    node.type === 'CallExpression' &&
    calleeName(node.callee) === 'waitFor'
  ) {
    return;
  }
  for (const key of Object.keys(node)) {
    if (key === 'parent') {
      continue;
    }
    const child = node[key];
    if (Array.isArray(child)) {
      for (const entry of child) {
        if (entry && typeof entry.type === 'string') {
          walk(entry, visit, options);
        }
      }
    } else if (child && typeof child.type === 'string') {
      walk(child, visit, options);
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
function variableDefinition(variable) {
  return variable?.defs?.find((item) => item.type === 'Variable');
}

/**
 * eslint-scope stores the VariableDeclarator on `definition.node` and the
 * VariableDeclaration on `definition.parent`.
 *
 * @param {import('eslint').Scope.Variable | undefined} variable
 * @returns {import('estree').Node | undefined}
 */
function variableDeclarator(variable) {
  const definition = variableDefinition(variable);
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
  const definition = variableDefinition(variable);
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
  const text = value
    .replace(/\*+/gu, ' ')
    .replace(/\s+/gu, ' ')
    .trim();
  if (text.length < BOUNDARY_COMMENT_MIN_LENGTH) {
    return false;
  }
  if (/^(?:eslint(?:-disable|-enable|-env)?|@ts-|istanbul|prettier-ignore)\b/u.test(text)) {
    return false;
  }
  return true;
}

/**
 * @param {import('estree').Comment} comment
 * @param {import('estree').Node} node
 * @param {{ leading: boolean }} options
 * @returns {boolean}
 */
function commentTouchesNode(comment, node, options) {
  if (!node.loc || !isBoundaryComment(comment.value)) {
    return false;
  }
  const line = comment.loc.end.line;
  if (line >= node.loc.start.line && line <= node.loc.end.line) {
    return true;
  }
  return options.leading && line === node.loc.start.line - 1;
}

/**
 * @param {import('eslint').SourceCode} sourceCode
 * @param {import('estree').Node} node
 * @param {{ leading: boolean }} options
 * @returns {boolean}
 */
function nodeHasBoundaryComment(sourceCode, node, options) {
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
    commentTouchesNode(comment, node, options),
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
 * @param {import('estree').CallExpression} node
 * @returns {string | undefined}
 */
function literalMockSpecifier(node) {
  const argument = node.arguments[0];
  if (!argument) {
    return undefined;
  }
  if (argument.type === 'Literal' && typeof argument.value === 'string') {
    return argument.value;
  }
  if (
    argument.type === 'TemplateLiteral' &&
    argument.expressions.length === 0 &&
    argument.quasis[0]?.value?.cooked != null
  ) {
    return argument.quasis[0].value.cooked;
  }
  return undefined;
}

/**
 * @param {import('estree').Node} node
 * @returns {boolean}
 */
function isJestMockCall(node) {
  return (
    node.type === 'CallExpression' &&
    node.callee.type === 'MemberExpression' &&
    !node.callee.computed &&
    node.callee.object.type === 'Identifier' &&
    node.callee.object.name === 'jest' &&
    node.callee.property.type === 'Identifier' &&
    node.callee.property.name === 'mock'
  );
}

/**
 * @param {import('estree').Node} node
 * @returns {import('estree').Node | undefined}
 */
function inlineCallback(node) {
  if (
    node.type === 'ArrowFunctionExpression' ||
    node.type === 'FunctionExpression'
  ) {
    return node;
  }
  return undefined;
}

/**
 * @param {import('eslint').SourceCode} sourceCode
 * @param {import('estree').CallExpression} waitForCall
 * @returns {import('estree').Node | undefined}
 */
function waitForCallback(sourceCode, waitForCall) {
  const callback = waitForCall.arguments[0];
  if (!callback) {
    return undefined;
  }
  const inline = inlineCallback(callback);
  if (inline) {
    return inline;
  }
  if (callback.type !== 'Identifier') {
    return undefined;
  }
  const declarator = variableDeclarator(
    findVariable(scopeAt(sourceCode, callback), callback.name),
  );
  if (!declarator?.init) {
    return undefined;
  }
  return inlineCallback(declarator.init);
}

/**
 * @param {import('estree').Node} node
 * @returns {boolean}
 */
function isFindQueryCall(node) {
  return (
    node.type === 'CallExpression' &&
    FIND_QUERY_NAME.test(calleeName(node.callee) ?? '')
  );
}

/**
 * @param {import('estree').Node} callee
 * @returns {boolean}
 */
function isGlobalSetTimeout(callee) {
  if (callee.type === 'Identifier') {
    return callee.name === 'setTimeout';
  }
  if (
    callee.type !== 'MemberExpression' ||
    callee.computed ||
    callee.property.type !== 'Identifier' ||
    callee.property.name !== 'setTimeout' ||
    callee.object.type !== 'Identifier'
  ) {
    return false;
  }
  return (
    callee.object.name === 'global' ||
    callee.object.name === 'globalThis' ||
    callee.object.name === 'window'
  );
}

/**
 * @param {import('estree').Node | undefined} argument
 * @returns {boolean}
 */
function isZeroDelay(argument) {
  return (
    argument?.type === 'Literal' &&
    typeof argument.value === 'number' &&
    argument.value === 0
  );
}

/**
 * @param {import('estree').Node} node
 * @returns {boolean}
 */
function isFixedSleep(node) {
  if (node.type !== 'CallExpression') {
    return false;
  }
  if (calleeName(node.callee) === 'sleep') {
    return true;
  }
  if (!isGlobalSetTimeout(node.callee)) {
    return false;
  }
  // Omitted delay and literal 0 are a macrotask flush, not a sleep.
  if (node.arguments.length < 2) {
    return false;
  }
  return !isZeroDelay(node.arguments[1]);
}

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
 * @param {import('estree').Node} node
 * @returns {boolean}
 */
function isWaitOrFindCall(node) {
  if (node.type !== 'CallExpression') {
    return false;
  }
  const name = calleeName(node.callee);
  return name === 'waitFor' || FIND_QUERY_NAME.test(name ?? '');
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
 * A comment counts when it sits on the timeout, on the options object, on the
 * constant that supplies the number, or on the same line as a one-line call.
 * A comment above a multiline `expect(await findBy*(..., { timeout }))` does
 * not count: that comment is about the assertion, not the budget.
 *
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
  if (
    anchors.some((anchor) =>
      nodeHasBoundaryComment(sourceCode, anchor, { leading: true }),
    )
  ) {
    return true;
  }
  // A trailing comment on the call (`findBy*(..., opts); // quote debounce`)
  // sits after the statement, not on the timeout property.
  if (
    [call, statement].some((anchor) =>
      nodeHasBoundaryComment(sourceCode, anchor, { leading: false }),
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
    if (!declaration) {
      return false;
    }
    // Allow one blank line between the comment and `const TIMEOUT_MS`.
    if (!declaration.loc) {
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

const noArbitraryJestMock = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow jest.mock() in component-view tests except sanctioned framework modules',
      url: SKILL_URL,
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowFrameworkExtras: { type: 'boolean' },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      arbitraryMock: ARBITRARY_MOCK_MESSAGE,
    },
  },
  create(context) {
    const allowFrameworkExtras = Boolean(
      context.options[0]?.allowFrameworkExtras,
    );
    return {
      CallExpression(node) {
        if (!isJestMockCall(node)) {
          return;
        }
        const specifier = literalMockSpecifier(node);
        if (
          specifier !== undefined &&
          isAllowedMockSpecifier(specifier, allowFrameworkExtras)
        ) {
          return;
        }
        context.report({ node, messageId: 'arbitraryMock' });
      },
    };
  },
};

const noNestedFindInWaitFor = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow findBy*/findAllBy* queries nested inside waitFor callbacks',
      url: SKILL_URL,
    },
    schema: [],
    messages: {
      nestedFind: NESTED_FIND_MESSAGE,
    },
  },
  create(context) {
    const sourceCode = context.getSourceCode();
    return {
      CallExpression(node) {
        if (calleeName(node.callee) !== 'waitFor') {
          return;
        }
        const callback = waitForCallback(sourceCode, node);
        if (!callback) {
          return;
        }
        walk(
          callback,
          (descendant) => {
            if (descendant !== callback && isFindQueryCall(descendant)) {
              context.report({ node: descendant, messageId: 'nestedFind' });
            }
          },
          { skipNestedWaitFor: true, root: callback },
        );
      },
    };
  },
};

const noFixedSleep = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow fixed sleeps in component-view tests, except a zero-delay setTimeout flush',
      url: SKILL_URL,
    },
    schema: [],
    messages: {
      fixedSleep: FIXED_SLEEP_MESSAGE,
    },
  },
  create(context) {
    return {
      CallExpression(node) {
        if (isFixedSleep(node)) {
          context.report({ node, messageId: 'fixedSleep' });
        }
      },
    };
  },
};

const noBareQueryTimeout = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow a bare { timeout } on waitFor/findBy* without a comment naming the async boundary',
      url: SKILL_URL,
    },
    schema: [],
    messages: {
      bareTimeout: BARE_TIMEOUT_MESSAGE,
    },
  },
  create(context) {
    const sourceCode = context.getSourceCode();
    const reported = new WeakSet();
    return {
      CallExpression(node) {
        if (!isWaitOrFindCall(node)) {
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
            if (
              timeoutIsDocumented(sourceCode, property, node, argument)
            ) {
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

const noClearAllMocksWithoutReset = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow jest.clearAllMocks() unless the file also resets mock implementations',
      url: SKILL_URL,
    },
    schema: [],
    messages: {
      clearAllMocks: CLEAR_ALL_MOCKS_MESSAGE,
    },
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
    name: 'eslint-plugin-component-view',
    version: '1.0.0',
  },
  rules: {
    'no-arbitrary-jest-mock': noArbitraryJestMock,
    'no-nested-find-in-wait-for': noNestedFindInWaitFor,
    'no-fixed-sleep': noFixedSleep,
    'no-bare-query-timeout': noBareQueryTimeout,
    'no-clear-all-mocks-without-reset': noClearAllMocksWithoutReset,
  },
  SKILL_URL,
  FAKE_TIMER_MESSAGE,
};
