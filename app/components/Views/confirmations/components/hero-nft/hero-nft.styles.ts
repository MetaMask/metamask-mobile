import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../util/theme/models';

const styleSheet = (params: {
  theme: Theme;
  vars: { layout?: 'default' | 'horizontal' };
}) => {
  const { theme } = params;

  return StyleSheet.create({
    noImagePlaceholder: {
      backgroundColor: theme.colors.background.alternative,
      borderColor: theme.colors.border.muted,
      borderWidth: 1,
      height: 48,
      justifyContent: 'center',
      minWidth: 48,
      padding: 4,
    },
    touchableOpacity: {
      alignSelf: 'center',
    },
    horizontalContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 16,
    },
    textContainer: {
      flex: 1,
    },
    label: {
      color: theme.colors.text.alternative,
      marginBottom: 4,
    },
    nameText: {
      textAlign: 'left',
    },
    tokenIdText: {
      textAlign: 'left',
      color: theme.colors.text.alternative,
    },
    iconContainer: {
      marginLeft: 16,
    },
  });
};

export default styleSheet;
