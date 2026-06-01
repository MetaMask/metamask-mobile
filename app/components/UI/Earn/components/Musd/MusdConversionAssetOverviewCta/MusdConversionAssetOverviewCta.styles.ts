import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { colors } = params.theme;

  return StyleSheet.create({
    container: {
      flexDirection: 'row',
      paddingLeft: 16,
      paddingRight: 12,
      borderRadius: 12,
      backgroundColor: colors.background.muted,
      alignItems: 'center',
    },
    imageContainer: {
      marginRight: 16,
      width: 72,
      height: 72,
      borderRadius: 12,
      backgroundColor: colors.background.muted,
      overflow: 'hidden',
      justifyContent: 'center',
      alignItems: 'center',
    },
    musdIcon: {
      padding: 4,
      width: 72,
      height: 72,
    },
    contentSection: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 2,
      minWidth: 0,
    },
    textContainer: {
      flex: 1,
      flexShrink: 1,
      minWidth: 0,
      paddingVertical: 16,
    },
    title: {
      color: colors.text.default,
      flexShrink: 1,
    },
    description: {
      flexShrink: 1,
    },
    closeButton: {
      flexShrink: 0,
      marginTop: 12,
    },
  });
};

export default styleSheet;
