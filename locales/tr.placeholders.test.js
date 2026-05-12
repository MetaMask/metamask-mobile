import tr from './languages/tr.json';

/**
 * Recursively collects leaf string values from nested locale objects.
 *
 * @param {unknown} node - Current JSON node.
 * @param {string} path - Dot/bracket path for failure messages.
 * @param {Array<{ path: string; value: string }>} acc - Collected strings.
 */
function collectStrings(node, path, acc) {
  if (typeof node === 'string') {
    acc.push({ path, value: node });
    return;
  }
  if (Array.isArray(node)) {
    node.forEach((item, index) => {
      collectStrings(item, `${path}[${index}]`, acc);
    });
    return;
  }
  if (node !== null && typeof node === 'object') {
    for (const [key, child] of Object.entries(node)) {
      const nextPath = path ? `${path}.${key}` : key;
      collectStrings(child, nextPath, acc);
    }
  }
}

describe('Turkish locale (tr.json)', () => {
  /** @type {() => Array<{ path: string; value: string }>} */
  function getAllLeafStrings() {
    /** @type {Array<{ path: string; value: string }>} */
    const strings = [];
    collectStrings(tr, '', strings);
    return strings;
  }

  it('contains no %{{ substrings in any translation value', () => {
    const offenders = getAllLeafStrings().filter(({ value }) =>
      value.includes('%{{'),
    );

    expect(offenders).toEqual([]);
  });

  it('does not use %%{…} (literal % before placeholder); use {{…}}% like other locales', () => {
    const offenders = getAllLeafStrings().filter(({ value }) =>
      value.includes('%%{'),
    );

    expect(offenders).toEqual([]);
  });
});
