import { lightTheme } from '@metamask/design-tokens';
import createStyles from './PerpsGTMModal.styles';

describe('PerpsGTMModal.styles', () => {
  it('scales horizontal padding with the window width on phones', () => {
    const styles = createStyles(lightTheme, false, {
      width: 375,
      height: 812,
    });

    expect(styles.headerContainer.paddingHorizontal).toBe(16);
    expect(styles.footerContainer.paddingHorizontal).toBe(30);
  });

  it('recomputes vertical spacing from the current window height', () => {
    const portrait = createStyles(lightTheme, false, {
      width: 1024,
      height: 1366,
    });
    const landscape = createStyles(lightTheme, false, {
      width: 1366,
      height: 1024,
    });

    expect(portrait.headerContainer.paddingTop).toBeGreaterThan(
      landscape.headerContainer.paddingTop as number,
    );
  });
});
