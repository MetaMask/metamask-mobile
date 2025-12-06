import { StyleSheet } from 'react-native';
import { Colors } from '../../../../../util/theme/models';

const createStyles = () =>
  StyleSheet.create({
    popularNetwork: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginVertical: 16,
      paddingLeft: 0,
      marginLeft: 0,
    },
    popularNetworkImage: {
      marginRight: 16,
      justifyContent: 'center',
      alignItems: 'center',
    },
    popularWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    icon: {
      marginRight: 16,
      marginTop: 4,
    },
  });

export const createCustomNetworkStyles = (params: { colors: Colors }) =>
  StyleSheet.create({
    listHeader: {
      color: params.colors.text.alternative,
      marginVertical: 16,
    },
    iconContainer: {
      marginRight: 12,
    },
    nameAndTagContainer: {
      flexDirection: 'column',
    },
    tagLabelBelowName: {
      marginTop: 4,
      alignSelf: 'flex-start',
    },
  });

export default createStyles;
