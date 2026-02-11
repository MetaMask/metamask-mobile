import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { colors } = params.theme;

  return StyleSheet.create({
    container: {
      flexDirection: 'row',
      paddingLeft: 16,
      paddingRight: 12,
      borderWidth: 1,
      borderRadius: 12,
      borderColor: colors.border.muted,
      backgroundColor: colors.background.default,
      alignItems: 'center',
      gap: 16,
    },
    imageContainer: {
      width: 78,
      height: 78,
      borderRadius: 12,
      backgroundColor: colors.background.muted,
      overflow: 'hidden',
      justifyContent: 'center',
      alignItems: 'center',
    },
    musdIcon: {
      padding: 4,
      width: 78,
      height: 78,
    },
    textContainer: {
      flex: 1,
      gap: 4,
      paddingVertical: 16,
    },
    title: {
      color: colors.text.default,
    },
    closeButton: {
      alignSelf: 'flex-start',
      marginTop: 16,
    },
  });
};

export default styleSheet;
