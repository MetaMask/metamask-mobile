import { Theme } from '@metamask/design-tokens';
import { StyleSheet } from 'react-native';
import { fontStyles } from '../../../styles/common';

const styleSheet = ({ theme: { colors } }: { theme: Theme }) =>
  StyleSheet.create({
    wrapper: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: colors.background.default,
      // Hidden by default
      display: 'none',
      paddingTop: 8,
    },
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
      fontSize: 14,
      color: colors.text.default,
      ...fontStyles.normal,
    },
    url: {
      fontSize: 12,
      color: colors.text.alternative,
      ...fontStyles.normal,
    },
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
  });

export default styleSheet;
