import { StyleSheet } from 'react-native';
import type { Theme } from '../../../../../util/theme/models';

const createStyles = (params: { theme: Theme }) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 16,
      backgroundColor: params.theme.colors.background.section,
      borderRadius: 8,
      marginBottom: 8,
    },
    leftSection: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      marginRight: 16,
      gap: 12,
    },
    infoContainer: {
      flex: 1,
      gap: 4,
    },
    rightSection: {
      alignItems: 'flex-end',
      gap: 4,
    },
    priceText: {
      textAlign: 'right',
    },
    labelText: {
      textAlign: 'right',
    },
  });

export default createStyles;
