import { StyleSheet } from 'react-native';
import type { Theme } from '../../../../../util/theme/models';
import { darkTheme } from '@metamask/design-tokens';

const styleSheet = (_params: { theme: Theme }) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingTop: 4,
      paddingBottom: 4,
      paddingLeft: 4,
      paddingRight: 8,
      backgroundColor: darkTheme.colors.background.muted,
      borderRadius: 24,
      alignSelf: 'flex-start',
    },
    referralText: {
      color: darkTheme.colors.accent04.light,
    },
    iconContainer: {
      height: 24,
      width: 24,
      borderRadius: 20,
      backgroundColor: darkTheme.colors.background.muted,
      justifyContent: 'center',
      alignItems: 'center',
      overflow: 'hidden',
    },
    icon: {
      width: 24,
      height: 24,
    },
  });

export default styleSheet;
