const matches = (data, pattern) => {
  if (!pattern || !pattern.length || !data || !data.length) {
    return false;
  }

  const filter = data.filter((val) => {
    const newPattern = val.replace(/\./g, '.');
    const reg = new RegExp(newPattern, 'g');
    const is = reg.test(pattern);
    return is;
  });
  return !!filter[0];
};

const getsArrItem = (opts, path, properties) => {
  const rightProperties = [];

  for (let i = 0; i < properties.length; i += 1) {
    const property = properties[i];
    let toCheck;

    toCheck = property.type === 'Identifier' && property;
    toCheck = toCheck || (property.node.value && property.get('value'));
    toCheck = toCheck || (property.node.local && property.get('local'));
    toCheck = toCheck || (property.node.id && property.get('id'));
    toCheck = toCheck && toCheck.node && toCheck.node.name;

    if (!matches(opts, toCheck)) {
      continue;
    }

    rightProperties.push(properties.length > 1 ? property : path);
  }

  return rightProperties;
};

const getObjItem = (path) => {
  let arr = [];
  let toCheck;

  if (!path) {
    return arr;
  }

  if (path.type === 'Identifier') {
    arr = [path.name || path.node.name];
  } else if (path.type === 'StringLiteral') {
    arr = [path.value];
  }

  toCheck = path.object || (path.node && path.node.object);
  arr = toCheck ? arr.concat(getObjItem(toCheck)) : arr;

  toCheck = path.property || (path.node && path.node.property);
  arr = toCheck ? arr.concat(getObjItem(toCheck)) : arr;

  toCheck = path.id || (path.node && path.node.id);
  arr = toCheck ? arr.concat(getObjItem(toCheck)) : arr;

  toCheck = path.left || (path.node && path.node.left);
  arr = toCheck ? arr.concat(getObjItem(toCheck)) : arr;

  toCheck = path.right || (path.node && path.node.right);
  arr = toCheck ? arr.concat(getObjItem(toCheck)) : arr;

  return arr;
};

const removeFunction = (t, opts = [], path) => {
  if (!path || path.removed) {
    return;
  }

  const pathHasIds = path.type === 'CallExpression' ? path.get('callee') : path;
  const ids = getObjItem(pathHasIds);
  if (!matches(opts, ids.join('.'))) {
    return;
  }

  !path.removed && path.remove();
};

const removeFunctionByArg = (t, opts = [], path) => {
  if (!path || path.removed || path.type !== 'CallExpression') {
    return;
  }

  const args = path.get('arguments');

  let toRemove = args.length && getsArrItem(opts, path, args);
  toRemove = toRemove || [];
  toRemove = toRemove.filter((val) => !!val && !val.removed);

  if (toRemove && toRemove.length) {
    for (let i = 0; i < toRemove.length; i += 1) {
      toRemove[i] && !toRemove[i].removed && toRemove[i].remove();
    }
  }
};

const isEitherSide = (opts, path, leftKey = 'left', rightKey = 'right') => {
  const left = path.get(leftKey);
  const right = path.get(rightKey);
  const idsLeft = getObjItem(left);
  const idsRight = getObjItem(right);

  return {
    isLeft: matches(opts, idsLeft.join('.')),
    isRight: matches(opts, idsRight.join('.')),
    left,
    right,
  };
};

const removeVar = (t, opts = [], path) => {
  if (!path || path.removed) return;

  let toRemove;

  if (path.type === 'VariableDeclarator') {
    const isIt = isEitherSide(opts, path, 'id', 'init');
    if (!isIt.isLeft && !isIt.isRight) return;

    toRemove = path;
  } else if (path.type === 'AssignmentExpression') {
    if (path.get('right').type === 'LogicalExpression') {
      return;
    }

    const isIt = isEitherSide(opts, path);
    if (!isIt.isLeft && !isIt.isRight) return;

    toRemove = path;

    const parent = toRemove && toRemove.parentPath;
    if (parent && parent.type === 'ConditionalExpression') {
      toRemove = parent;
    }
  } else if (path.type === 'Identifier') {
    const id = getObjItem(path).join('.');
    const isIt = matches(opts, id);
    if (!isIt) return;

    toRemove = path;
  } else if (path.type === 'MemberExpression') {
    const id = getObjItem(path).join('.');
    const isIt = matches(opts, id);
    if (!isIt) {
      return;
    }

    toRemove = path;
  } else if (path.type === 'BinaryExpression') {
    const isIt = isEitherSide(opts, path);
    if (!isIt.isLeft && !isIt.isRight) return;

    toRemove = path;
  } else if (path.type === 'LogicalExpression') {
    const isIt = isEitherSide(opts, path);
    if (!isIt.isLeft && !isIt.isRight) return;

    toRemove =
      (isIt.isLeft && isIt.left) || (isIt.isRight && isIt.right) || undefined;
  }

  const parent = toRemove && toRemove.parentPath;
  if (parent && parent.type === 'IfStatement') {
    toRemove = parent;
  }

  toRemove && !toRemove.removed && toRemove.remove();
};

const removeTargetRefs = (t, path) => {
  const specifiers =
    (path && path.specifiers) ||
    (path && path.node && path.node.specifiers) ||
    [];

  specifiers.forEach((specifier) => {
    const importedIdentifierName = specifier.local.name;
    const { referencePaths } = path.scope.getBinding(importedIdentifierName);

    referencePaths.forEach((referencePath) => {
      removeFunction(t, [importedIdentifierName], referencePath.parentPath);
      removeFunctionByArg(
        t,
        [importedIdentifierName],
        referencePath.parentPath,
      );
      removeVar(t, [importedIdentifierName], referencePath.parentPath);
    });
  });

  !path.removed && path.remove();
};

// eslint-disable-next-line import/no-commonjs
module.exports = function ({ types: t }) {
  const flaskIdentifiers = ['Flask', 'flask'];

  return {
    name: 'remove-flask-code',
    visitor: {
      ImportDeclaration(path) {
        if (!path || path.removed) return;
        const { source } = path || path.node;
        if (!matches(flaskIdentifiers, source)) return;
        removeTargetRefs(t, path);
        !path.removed && path.remove();
      },
      JSXElement(path) {
        if (!path || path.removed) return;
        const { name } = path.node.openingElement.name;
        if (!matches(flaskIdentifiers, name)) return;
        removeTargetRefs(t, path);
        !path.removed && path.remove();
      },
      FunctionDeclaration(path) {
        if (!path || path.removed) return;
        // const { name } = path.node.id;
        // if (!matches(flaskIdentifiers, name)) return;
        // console.log('FunctionDeclaration', name);
        // !path.removed && path.remove();
      },
      CallExpression(path) {
        if (!path || path.removed) return;

        // It doesn't exist in the options
        const pathHasIds =
          path.type === 'CallExpression' ? path.get('callee') : path;
        const ids = getObjItem(pathHasIds);
        if (!matches(flaskIdentifiers, ids.join('.'))) return;

        !path.removed && path.remove();
      },
    },
  };
};
