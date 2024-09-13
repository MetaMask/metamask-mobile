import { Theme } from '@metamask/design-tokens';
import { StyleSheet } from 'react-native';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  return StyleSheet.create({
    activitiesButton: {
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'space-evenly',
      padding: 16,
    },
    buttonWrapper: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
    },
    buttonText: {
      ...theme.typography.sBodyMD,
      fontWeight: '400',
    },
    containerStyle: {
      width: '100%',
      flexDirection: 'row',
      justifyContent: 'flex-start',
      alignItems: 'flex-start',
      paddingTop: 16,
      paddingVertical: 2,
    },
    icon: {
      marginHorizontal: 16,
    },
  });
};

export default styleSheet;
