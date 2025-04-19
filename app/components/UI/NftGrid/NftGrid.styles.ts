import { StyleSheet } from 'react-native';
import { Colors } from '../../../util/theme/models';

const styleSheet = (colors: Colors) =>
  StyleSheet.create({
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
      alignItems: 'center',
    },
    spinner: {
      marginBottom: 8,
    },
    emptyContainer: {
      flex: 1,
      alignItems: 'center',
      outline: 'solid red 2px',
    },
    emptyImageContainer: {
      width: 30,
      height: 30,
      tintColor: colors.background,
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
