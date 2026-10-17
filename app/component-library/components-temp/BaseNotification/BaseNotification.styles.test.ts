import { mockTheme } from '../../../util/theme';
import styleSheet from './BaseNotification.styles';

describe('BaseNotification.styles', () => {
  it('keeps a 16pt margin on each side of the window width', () => {
    const styles = styleSheet({ theme: mockTheme, vars: { windowWidth: 375 } });

    expect(styles.base).toMatchObject({ left: 16, width: 343 });
  });

  it('follows the window width when the device rotates', () => {
    const portrait = styleSheet({
      theme: mockTheme,
      vars: { windowWidth: 1024 },
    });
    const landscape = styleSheet({
      theme: mockTheme,
      vars: { windowWidth: 1366 },
    });

    expect(portrait.base.width).toBe(992);
    expect(landscape.base.width).toBe(1334);
  });
});
