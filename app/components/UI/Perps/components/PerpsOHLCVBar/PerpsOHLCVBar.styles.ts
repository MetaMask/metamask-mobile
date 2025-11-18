import { StyleSheet } from 'react-native';
import type { Theme } from '@metamask/design-system-react-native';
import type { PerpsOHLCVBarStyleSheetOptions } from './PerpsOHLCVBar.types';

/**
 * Style definitions for the PerpsOHLCVBar component
 */
export const createStyles = ({
  theme,
}: {
  theme: Theme;
  options?: PerpsOHLCVBarStyleSheetOptions;
}) =>
  StyleSheet.create({
    container: {
      paddingVertical: 8,
      paddingHorizontal: 16, // Add horizontal padding for spacing from edges
      backgroundColor: theme.colors.background.default,
      marginBottom: 8,
    },
    valuesRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 4,
    },
    labelsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    valueText: {
      fontSize: 13,
      lineHeight: 16,
      fontWeight: '600',
    },
    labelText: {
      fontSize: 10,
      lineHeight: 12,
      fontWeight: '400',
    },
    column: {
      flex: 1,
      alignItems: 'flex-start',
    },
  });
