import { StyleSheet } from 'react-native';
import { Colors } from '../../../util/theme/models';

const styleSheet = (colors: Colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    collectibleIcon: {
      width: '100%',
      aspectRatio: 1,
    },
    collectibleCard: {
      flexBasis: '33%',
      padding: 10,
      marginBottom: 10,
      justifyContent: 'center',
      alignItems: 'center',
    },
    footer: {
      display: 'flex',
      alignItems: 'center',
      marginBottom: 20,
    },
    spinner: {
      marginBottom: 8,
    },
    emptyContainer: {
      flex: 1,
      alignItems: 'center',
    },
    emptyImageContainer: {
      width: 30,
      height: 30,
      tintColor: colors.background.default,
    },
    headingMd: {
      marginTop: 10,
    },
    emptyText: {
      color: colors.text.alternative,
      marginBottom: 8,
      fontSize: 14,
    },
  });

export default styleSheet;
