import { StyleSheet } from 'react-native';
import type { Theme } from '../../../../../util/theme/models';

const styleSheet = ({ theme: _theme }: { theme: Theme }) =>
  StyleSheet.create({
    list: {
      paddingBottom: 8,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 16,
      paddingVertical: 6,
      minHeight: 56,
    },
    securityRow: {
      gap: 12,
      paddingHorizontal: 16,
      paddingVertical: 10,
      minHeight: 68,
    },
    securityCopy: {
      flex: 1,
    },
    securityDescription: {
      marginTop: 4,
    },
    iconContainer: {
      width: 24,
      height: 24,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });

export default styleSheet;
