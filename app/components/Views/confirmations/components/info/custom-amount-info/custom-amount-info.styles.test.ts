import { Platform } from 'react-native';
import { Theme } from '../../../../../../util/theme/models';
import styleSheet from './custom-amount-info.styles';

describe('custom-amount-info.styles', () => {
  const originalPlatformOS = Platform.OS;

  afterEach(() => {
    Object.defineProperty(Platform, 'OS', {
      value: originalPlatformOS,
      writable: true,
    });
  });

  describe('extraBottomPadding', () => {
    it('applies 56dp paddingBottom on Android', () => {
      Object.defineProperty(Platform, 'OS', {
        value: 'android',
        writable: true,
      });

      const styles = styleSheet({ theme: {} as Theme });

      expect(styles.extraBottomPadding.paddingBottom).toBe(56);
    });

    it('applies 0 paddingBottom on iOS so the iOS layout is unchanged', () => {
      Object.defineProperty(Platform, 'OS', {
        value: 'ios',
        writable: true,
      });

      const styles = styleSheet({ theme: {} as Theme });

      expect(styles.extraBottomPadding.paddingBottom).toBe(0);
    });
  });
});
