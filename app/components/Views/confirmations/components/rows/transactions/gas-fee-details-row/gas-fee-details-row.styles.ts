import { StyleSheet } from 'react-native';
import { fontStyles } from '../../../../../../../styles/common';
import { Theme } from '../../../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;

  return StyleSheet.create({
    primaryValue: {
      color: theme.colors.text.default,
      paddingRight: 4,
      ...fontStyles.normal,
    },
    secondaryValue: {
      color: theme.colors.text.alternative,
      ...fontStyles.normal,
      marginRight: 4,
    },
    valueContainer: {
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
    },
    editButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingRight: 0,
    },
    editIcon: {
      marginRight: 4,
    },
    estimationContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    gasFeeTokenContainer: {
      flexDirection: 'row',
    },
    gasFeeTokenText: {
      textAlign: 'left',
      flex: 1,
    },
    skeletonBorderRadius: {
      borderRadius: 4,
    },
    skeletonRowContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      minHeight: 24,
      paddingBottom: 8,
      paddingHorizontal: 8,
    },
  });
};

export default styleSheet;
