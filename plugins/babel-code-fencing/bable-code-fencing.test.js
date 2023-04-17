import { transform } from '@babel/core';
import babelCodeFencing from './babel-code-fencing';

const transformCode = (inputCode) => {
  const { code } = transform(inputCode, {
    plugins: [babelCodeFencing],
  });
  return code;
};

describe('remove-code-between-comments', () => {
  test('removes code between the specified comments', () => {
    const inputCode = `
///: BEGIN:ONLY_INCLUDE_IN_FLASK
function printTips() {
  tips.forEach((tip, i) => console.log(\`Tip \${i}:\` + tip));
}
///: END:ONLY_INCLUDE_IN_FLASK

function printTips2() {
  tips.forEach((tip, i) => console.log(\`Tip2 \${i}:\` + tip));
}
`;

    const expectedOutput = `
function printTips2() {
  tips.forEach((tip, i) => console.log(\`Tip2 \${i}:\` + tip));
}
`;

    const transformedCode = transformCode(inputCode);
    expect(transformedCode).toBe(expectedOutput);
  });
});
