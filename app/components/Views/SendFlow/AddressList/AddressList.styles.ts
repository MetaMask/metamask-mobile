import { StyleSheet } from 'react-native';

import { Colors } from '../../../../util/theme/models';

const styleSheet = (colors: Colors) =>
  StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.background.default,
    },
    myAccountsWrapper: {
      flexGrow: 1,
    },
    labelElementWrapper: {
      backgroundColor: colors.background.default,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 8,
    },
    labelElementText: {
      marginHorizontal: 16,
      color: colors.text.alternative,
      paddingBottom: 8,
    },
    contactLabel: { marginHorizontal: 8, color: colors.text.alternative },
    yourContactcWrapper: { marginTop: 16 },
  });

export default styleSheet;
