import { mockTheme } from '../../../../../../util/theme';
import { Theme } from '../../../../../../util/theme/models';
import styleSheet from './custom-amount-info.styles';

describe('custom-amount-info.styles', () => {
  describe('bottomBlock', () => {
    it('applies 16dp paddingBottom on every platform', () => {
      const styles = styleSheet({ theme: mockTheme as Theme });

      expect(styles.bottomBlock.paddingBottom).toBe(16);
    });
  });
});
