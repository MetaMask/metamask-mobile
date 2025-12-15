import { StyleSheet } from 'react-native';
import { Colors } from '../../../../../util/theme/models';

const createStyles = () =>
  StyleSheet.create({
    popularNetwork: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 16,
    },
    popularNetworkImage: {
      marginRight: 20,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
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
    nameAndTagContainer: {
      flexDirection: 'column',
    },
    tagLabelBelowName: {
      marginTop: 4,
      alignSelf: 'flex-start',
    },
    // reset margin and padding for the icon
    icon: {
      margin: 0,
      padding: 0,
    },
  });

export default createStyles;
