import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../../../util/theme/models';

const styleSheet = (_params: { theme: Theme }) =>
  StyleSheet.create({
    container: {
      width: '100%',
      justifyContent: 'space-between',
      flexDirection: 'row',
    },
    containerPressed: {
      opacity: 0.7,
    },
    left: {
      flexDirection: 'row',
      gap: 16,
    },
    right: {
      alignSelf: 'center',
    },
    networkRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
    },
    tokenIconContainer: {
      width: 32,
      height: 32,
      position: 'relative',
    },
    tokenIcon: {
      width: 32,
      height: 32,
    },
  });

export default styleSheet;
