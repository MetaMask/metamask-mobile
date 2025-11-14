import styleSheet from './styles';
import Device from '../../../util/device';
import { Theme } from '../../../util/theme/models';
import { mockTheme } from '../../../util/theme';

jest.mock('../../../util/device');

const mockedDevice = Device as jest.Mocked<typeof Device>;

describe('OAuthRehydration styles', () => {
  const mockParams = {
    theme: mockTheme as unknown as Theme,
  };

  beforeEach(() => {
    jest.clearAllMocks();
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
});
