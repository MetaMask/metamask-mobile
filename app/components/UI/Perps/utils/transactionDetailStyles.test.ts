import { createTransactionDetailStyles } from './transactionDetailStyles';
import { lightTheme, brandColor } from '@metamask/design-tokens';
import { AppThemeKey } from '../../../../util/theme/models';

// Mock theme object using the actual light theme
const mockTheme = {
  ...lightTheme,
  themeAppearance: AppThemeKey.light as const,
  brandColors: brandColor,
};

describe('createTransactionDetailStyles', () => {
  it('should create styles object with all required properties', () => {
    // Arrange
    const styles = createTransactionDetailStyles(mockTheme);

    // Assert
    const expectedProperties = [
      'container',
      'content',
      'assetContainer',
      'assetIconContainer',
      'assetIcon',
      'assetAmount',
      'detailsContainer',
      'detailRow',
      'detailRowLast',
      'detailLabel',
      'detailValue',
      'sectionSeparator',
      'blockExplorerButton',
      'profitValue',
    ];

    expectedProperties.forEach((property) => {
      expect(styles).toHaveProperty(property);
    });
  });

  it('should apply theme colors correctly to styled elements', () => {
    // Arrange
    const styles = createTransactionDetailStyles(mockTheme);

    // Assert
    expect(styles.container.backgroundColor).toBe(
      mockTheme.colors.background.default,
    );
    expect(styles.detailLabel.color).toBe(mockTheme.colors.text.alternative);
    expect(styles.profitValue.color).toBe(mockTheme.colors.success.default);
    expect(styles.sectionSeparator.borderBottomColor).toBe(
      mockTheme.colors.border.muted,
    );
  });

  it('should apply correct layout properties to container elements', () => {
    // Arrange
    const styles = createTransactionDetailStyles(mockTheme);

    // Assert
    expect(styles.container.flex).toBe(1);
    expect(styles.content.flex).toBe(1);
    expect(styles.detailsContainer.flex).toBe(1);
    expect(styles.content.paddingHorizontal).toBe(16);
    expect(styles.content.paddingTop).toBe(24);
  });

  it('should apply correct spacing and alignment to asset elements', () => {
    // Arrange
    const styles = createTransactionDetailStyles(mockTheme);

    // Assert
    expect(styles.assetContainer.alignItems).toBe('center');
    expect(styles.assetContainer.paddingHorizontal).toBe(16);
    expect(styles.assetContainer.paddingBottom).toBe(20);

    expect(styles.assetIconContainer.width).toBe(44);
    expect(styles.assetIconContainer.height).toBe(44);
    expect(styles.assetIconContainer.borderRadius).toBe(36);
    expect(styles.assetIconContainer.alignItems).toBe('center');
    expect(styles.assetIconContainer.justifyContent).toBe('center');
  });

  it('should apply correct typography styles', () => {
    // Arrange
    const styles = createTransactionDetailStyles(mockTheme);

    // Assert
    expect(styles.detailLabel.fontSize).toBe(14);
    expect(styles.detailValue.fontSize).toBe(14);
    expect(styles.assetAmount.fontWeight).toBe('700');
    expect(styles.detailValue.fontWeight).toBe('400');
    expect(styles.profitValue.fontWeight).toBe('500');
  });

  it('should apply correct flex layout to detail rows', () => {
    // Arrange
    const styles = createTransactionDetailStyles(mockTheme);

    // Assert
    expect(styles.detailRow.flexDirection).toBe('row');
    expect(styles.detailRow.justifyContent).toBe('space-between');
    expect(styles.detailRow.alignItems).toBe('center');
    expect(styles.detailRow.paddingVertical).toBe(8);
    expect(styles.detailRowLast.borderBottomWidth).toBe(0);
  });

  it('should apply correct spacing to section separator and button', () => {
    // Arrange
    const styles = createTransactionDetailStyles(mockTheme);

    // Assert
    expect(styles.sectionSeparator.height).toBe(16);
    expect(styles.sectionSeparator.marginBottom).toBe(16);
    expect(styles.sectionSeparator.borderBottomWidth).toBe(1);

    expect(styles.blockExplorerButton.marginTop).toBe(16);
    expect(styles.blockExplorerButton.marginBottom).toBe(16);
  });

  it('should handle incomplete theme gracefully', () => {
    // Arrange
    const incompleteTheme = {
      colors: {
        background: { default: '#FFFFFF' },
        text: { default: '#000000' },
        success: { default: '#28A745' },
        border: {},
      },
    };

    // Act & Assert
    expect(() =>
      createTransactionDetailStyles(incompleteTheme as typeof mockTheme),
    ).not.toThrow();
  });
});
