import { StyleSheet } from 'react-native';

const styleSheet = () => StyleSheet.create({
    nonceText: {
        textDecorationLine: 'underline',
    },
    infoRowOverride: {
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      flexWrap: 'wrap',
      paddingBottom: 0,
      paddingTop: 8,
      paddingHorizontal: 8,
    },
  });

export default styleSheet;
