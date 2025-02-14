import { Theme } from '@metamask/design-tokens';
import { StyleSheet, TextStyle } from 'react-native';

const styleSheet = ({ theme: { colors, typography } }: { theme: Theme }) =>
  StyleSheet.create({
    wrapper: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: colors.background.default,
      // Hidden by default
      display: 'none',
      paddingTop: 8,
    },
    contentContainer: {
      paddingVertical: 15,
    },
    category: {
      color: colors.text.default,
      padding: 10,
      backgroundColor: colors.background.default,
      ...typography.lHeadingSM,
    } as TextStyle,
    bookmarkIco: {
      width: 26,
      height: 26,
      marginRight: 7,
      borderRadius: 13,
    },
    fallbackTextStyle: {
      fontSize: 12,
    },
    name: {
      color: colors.text.default,
      ...typography.lBodyMDMedium,
    } as TextStyle,
    url: {
      color: colors.text.alternative,
      ...typography.lBodySM,
    } as TextStyle,
    item: {
      paddingVertical: 8,
      marginBottom: 8,
    },
    itemWrapper: {
      flexDirection: 'row',
      paddingHorizontal: 15,
    },
    textContent: {
      flex: 1,
      marginLeft: 10,
    },
    bg: {
      flex: 1,
    },
    deleteFavorite: {
      marginLeft: 10,
    },
  });

export default styleSheet;
