import styleSheet from './styles';
import Device from '../../../util/device';
import { Theme } from '../../../util/theme/models';
import { mockTheme } from '../../../util/theme';
import { Platform, StatusBar } from 'react-native';

jest.mock('../../../util/device');

const mockedDevice = Device as jest.Mocked<typeof Device>;

describe('OAuthRehydration styles', () => {
  const mockParams = {
    theme: mockTheme as unknown as Theme,
  };
  let platformSelectSpy: jest.SpiedFunction<typeof Platform.select> | undefined;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    platformSelectSpy?.mockRestore();
    platformSelectSpy = undefined;
  });

  it('applies 175px dimensions for foxWrapper and image on iOS', () => {
    // Arrange
    mockedDevice.isIos.mockReturnValue(true);

    // Act
    const styles = styleSheet(mockParams);

    // Assert
    expect(styles.foxWrapper.width).toBe(175);
    expect(styles.foxWrapper.height).toBe(175);
    expect(styles.image.width).toBe(175);
    expect(styles.image.height).toBe(175);
  });

  it('applies 150px dimensions for foxWrapper and image on Android', () => {
    // Arrange
    mockedDevice.isIos.mockReturnValue(false);

    // Act
    const styles = styleSheet(mockParams);

    // Assert
    expect(styles.foxWrapper.width).toBe(150);
    expect(styles.foxWrapper.height).toBe(150);
    expect(styles.image.width).toBe(150);
    expect(styles.image.height).toBe(150);
  });

  it('uses the theme icon color for the MetaMask wordmark and centers the title', () => {
    mockedDevice.isIos.mockReturnValue(true);

    const styles = styleSheet(mockParams);

    expect(styles.metamaskName.tintColor).toBe(mockTheme.colors.icon.default);
    expect(styles.title.textAlign).toBe('center');
    expect(styles.title.marginVertical).toBe(24);
  });

  it('applies Android-specific spacing for status bar and CTA gap', () => {
    Object.defineProperty(StatusBar, 'currentHeight', {
      value: 32,
    });
    platformSelectSpy = jest
      .spyOn(Platform, 'select')
      .mockImplementation((config) => config.android);
    mockedDevice.isIos.mockReturnValue(false);

    const styles = styleSheet(mockParams);

    expect(styles.mainWrapper.paddingTop).toBe(32);
    expect(styles.ctaWrapperRehydration.gap).toBe(16);
  });

  it('uses iOS defaults for status bar padding and CTA gap', () => {
    Object.defineProperty(StatusBar, 'currentHeight', {
      value: 20,
    });
    platformSelectSpy = jest
      .spyOn(Platform, 'select')
      .mockImplementation((config) => config.ios ?? config.default);
    mockedDevice.isIos.mockReturnValue(true);

    const styles = styleSheet(mockParams);

    expect(styles.mainWrapper.paddingTop).toBe(0);
    expect(styles.ctaWrapperRehydration.gap).toBe(0);
  });

  it('keeps the legacy footer and forgot-password spacing values', () => {
    mockedDevice.isIos.mockReturnValue(true);

    const styles = styleSheet(mockParams);

    expect(styles.footer.marginTop).toBe(32);
    expect(styles.goBack.marginVertical).toBe(14);
    expect(styles.helperTextContainer.alignSelf).toBe('flex-start');
  });
});
