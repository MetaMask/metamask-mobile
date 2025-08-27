import { mockTheme } from '../../../../../../../util/theme';
import { getBackgroundColor } from './amount-keyboard.styles';

describe('getBackgroundColor', () => {
  it('return correct color depending on amount value and error', () => {
    expect(getBackgroundColor(mockTheme, false, false)).toEqual('#4459ff');
    expect(getBackgroundColor(mockTheme, true, false)).toEqual('#ca3542');
    expect(getBackgroundColor(mockTheme, false, true)).toEqual('#4459ff1a');
    expect(getBackgroundColor(mockTheme, true, true)).toEqual('#ca3542');
  });
});
