import { TextVariant } from '../../../component-library/components/Texts/Text';
import { mockTheme } from '../../../util/theme';
import createStyles from './styles';

const mockGetFontFamily = jest.fn((variant: TextVariant) => `font-${variant}`);

jest.mock('../../../component-library/components/Texts/Text', () => ({
  TextVariant: {
    BodyLGMedium: 'BodyLGMedium',
    BodyMDBold: 'BodyMDBold',
    BodyMD: 'BodyMD',
  },
  getFontFamily: (variant: TextVariant) => mockGetFontFamily(variant),
}));

describe('createStyles', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates themed transaction element styles', () => {
    const styles = createStyles(mockTheme.colors, mockTheme.typography);

    expect(styles.row).toEqual(
      expect.objectContaining({
        backgroundColor: mockTheme.colors.background.default,
        flex: 1,
      }),
    );
    expect(styles.rowWithBorder).toEqual(
      expect.objectContaining({
        borderBottomColor: mockTheme.colors.border.muted,
        borderBottomWidth: 1,
      }),
    );
    expect(styles.importText).toEqual(
      expect.objectContaining({
        color: mockTheme.colors.text.alternative,
      }),
    );
    expect(styles.listItemAmount).toEqual(
      expect.objectContaining({
        color: mockTheme.colors.text.alternative,
      }),
    );
  });

  it('uses the matching font family for each text variant', () => {
    const styles = createStyles(mockTheme.colors, mockTheme.typography);

    expect(styles.listItemTitle.fontFamily).toBe('font-BodyLGMedium');
    expect(styles.listItemStatus.fontFamily).toBe('font-BodyMDBold');
    expect(styles.listItemAmount.fontFamily).toBe('font-BodyMD');
    expect(mockGetFontFamily).toHaveBeenCalledTimes(4);
  });
});
