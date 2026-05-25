/* eslint-disable no-console */
/* eslint-disable import-x/no-nodejs-modules */
/* eslint-disable import-x/no-commonjs */

const fs = require('fs');
const path = require('path');

const localePath = path.resolve(
  process.cwd(),
  'locales',
  'languages',
  'tr.json',
);
const checkOnly = process.argv.includes('--check');

function fixPercentagePlaceholders(value) {
  return value
    .replace(/%\{\{\s*([^}]+?)\s*\}\}/gu, '{{$1}}%')
    .replace(/%%\{\s*([^}]+?)\s*\}/gu, '{{$1}}%');
}

function collectOffenders(node, pathSegments = [], offenders = []) {
  if (typeof node === 'string') {
    if (node.includes('%{{') || node.includes('%%{')) {
      offenders.push({
        path: pathSegments.join('.'),
        value: node,
      });
    }
    return offenders;
  }

  if (Array.isArray(node)) {
    node.forEach((item, index) => {
      collectOffenders(item, [...pathSegments, `[${index}]`], offenders);
    });
    return offenders;
  }

  if (node !== null && typeof node === 'object') {
    Object.entries(node).forEach(([key, value]) => {
      collectOffenders(value, [...pathSegments, key], offenders);
    });
  }

  return offenders;
}

function fixNode(node) {
  if (typeof node === 'string') {
    return fixPercentagePlaceholders(node);
  }

  if (Array.isArray(node)) {
    return node.map(fixNode);
  }

  if (node !== null && typeof node === 'object') {
    return Object.fromEntries(
      Object.entries(node).map(([key, value]) => [key, fixNode(value)]),
    );
  }

  return node;
}

const original = fs.readFileSync(localePath, 'utf8');
const locale = JSON.parse(original);

if (checkOnly) {
  const offenders = collectOffenders(locale);

  if (offenders.length > 0) {
    console.error('Turkish locale contains invalid percentage placeholders:');
    offenders.forEach(({ path: offenderPath, value }) => {
      console.error(`- ${offenderPath}: ${value}`);
    });
    process.exit(1);
  }

  console.log('Turkish percentage placeholders are valid.');
  process.exit(0);
}

const fixed = `${JSON.stringify(fixNode(locale), null, 2)}\n`;

if (fixed === original) {
  console.log('No Turkish percentage placeholder fixes needed.');
  process.exit(0);
}

fs.writeFileSync(localePath, fixed);
console.log('Fixed Turkish percentage placeholders.');
