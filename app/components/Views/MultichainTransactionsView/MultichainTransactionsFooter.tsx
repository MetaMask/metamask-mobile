import React from 'react';
import { View, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import type { Theme } from '@metamask/design-tokens';
import { strings } from '../../../../locales/i18n';
import Button, {
  ButtonSize,
  ButtonVariants,
} from '../../../component-library/components/Buttons/Button';
import Text from '../../../component-library/components/Texts/Text';
import { getBlockExplorerName } from '../../../util/networks';
import { useTheme } from '../../../util/theme';

interface Styles {
  viewMoreWrapper: ViewStyle;
  viewMoreButton: ViewStyle;
  disclaimerWrapper: ViewStyle;
  disclaimerText: TextStyle;
}

const createStyles = (colors: Theme['colors']): Styles =>
  StyleSheet.create({
    viewMoreWrapper: {
      padding: 16,
    },
    viewMoreButton: {
      width: '100%',
    },
    disclaimerWrapper: {
      padding: 16,
    },
    disclaimerText: {
      color: colors.text.default,
    } as TextStyle,
  });

interface MultichainTransactionsFooterProps {
  /**
   * Block explorer URL
   */
  url: string;
  /**
   * Whether to show transactions (determines if view more button is shown)
   */
  hasTransactions: boolean;
  /**
   * Show disclaimer footer
   */
  showDisclaimer?: boolean;
  /**
   * Show explorer link
   */
  showExplorerLink?: boolean;
  /**
   * Navigation handler for view more button
   */
  onViewMore: () => void;
}

const MultichainTransactionsFooter = ({
  url,
  hasTransactions,
  showDisclaimer = false,
  showExplorerLink = true,
  onViewMore,
}: MultichainTransactionsFooterProps) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  return (
    <View>
      {hasTransactions && showExplorerLink && (
        <View style={styles.viewMoreWrapper}>
          <Button
            variant={ButtonVariants.Link}
            size={ButtonSize.Lg}
            label={`${strings(
              'transactions.view_full_history_on',
            )} ${getBlockExplorerName(url)}`}
            style={styles.viewMoreButton}
            onPress={onViewMore}
          />
        </View>
      )}
      {showDisclaimer && (
        <View style={styles.disclaimerWrapper}>
          <Text style={styles.disclaimerText}>
            {strings('asset_overview.disclaimer')}
          </Text>
        </View>
      )}
    </View>
  );
};

export default MultichainTransactionsFooter;
