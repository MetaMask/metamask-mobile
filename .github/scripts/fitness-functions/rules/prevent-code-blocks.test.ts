import {
  generateCreateFileDiff,
  generateModifyFilesDiff,
} from '../common/test-data';
import { preventCodeBlocksRule } from './prevent-code-blocks';

describe('preventCodeBlocksRule()', (): void => {
  it('should pass when receiving an empty diff', (): void => {
    const testDiff = '';

    const hasRulePassed = preventCodeBlocksRule(testDiff);

    expect(hasRulePassed).toBe(true);
  });

  it('should pass when receiving a diff with an existing file with one of the blocked expressions', (): void => {
    const infringingExpression = "from 'enzyme'";
    const testDiff = [
      generateModifyFilesDiff('new-file.ts', 'foo', 'bar'),
      generateModifyFilesDiff('old-file.js', undefined, 'pong'),
      generateModifyFilesDiff(
        'test.js',
        `yada yada ${infringingExpression} yada yada`,
        undefined,
      ),
    ].join('');

    const hasRulePassed = preventCodeBlocksRule(testDiff);

    expect(hasRulePassed).toBe(true);
  });

  it('should not pass when receiving a diff with a new file with one of the blocked expressions', (): void => {
    const infringingExpression = "from 'enzyme'";
    const testDiff = [
      generateModifyFilesDiff('new-file.ts', 'foo', 'bar'),
      generateCreateFileDiff('old-file.js', 'pong'),
      generateCreateFileDiff(
        'test.js',
        `yada yada ${infringingExpression} yada yada`,
      ),
    ].join('');

    const hasRulePassed = preventCodeBlocksRule(testDiff);

    expect(hasRulePassed).toBe(false);
  });
});
