import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;

  return StyleSheet.create({
    container: {
      flexGrow: 1,
      justifyContent: 'flex-start',
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      textAlign: 'center',
      marginVertical: 16,
    },
    getStartedImageWrapper: {
      alignItems: 'center',
    },
    getStartedImage: {
      width: '100%',
      aspectRatio: 4 / 3,
      resizeMode: 'contain',
      maxWidth: 300,
    },
    bulletPointContainer: {
      marginBottom: 16,
      paddingHorizontal: 16,
      flexDirection: 'row',
    },
    bulletPointContent: {
      flex: 1,
      paddingLeft: 12,
    },
    bulletPointTitle: {
      fontSize: 16,
      marginBottom: 4,
    },
    bulletPointDescription: {
      fontSize: 14,
      lineHeight: 20,
      opacity: 0.8,
    },
    checkIcon: {
      color: theme.colors.success.default,
    },
  });
};

export default styleSheet;
