const FLASK_IDENTIFIERS = ['Flask', 'flask'];

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

// eslint-disable-next-line import/no-commonjs
module.exports = function () {
  return {
    name: 'remove-flask-code',
    visitor: {
      ImportDeclaration(path) {
        if (!path || path.removed) return;
        const source = path.source || path.node.source;
        if (!matches(FLASK_IDENTIFIERS, source.value)) return;
        !path.removed && path.remove();
      },
      JSXElement(path) {
        if (!path || path.removed) return;
        const { name } = path.node.openingElement.name;
        if (!matches(FLASK_IDENTIFIERS, name)) return;
        !path.removed && path.remove();
      },
      FunctionDeclaration(path) {
        if (!path || path.removed) return;
        const { name } = path.node.id;
        if (!matches(FLASK_IDENTIFIERS, name)) return;
        !path.removed && path.remove();
      },
      CallExpression(path) {
        if (!path || path.removed) return;
        const { name } = path.node.callee;
        if (!matches(FLASK_IDENTIFIERS, name)) return;
        !path.removed && path.remove();
      },
      VariableDeclarator(path) {
        if (!path || path.removed) return;
        const { name } = path.node.id;
        if (!matches(FLASK_IDENTIFIERS, name)) return;
        !path.removed && path.remove();
      },
    },
  };
};
