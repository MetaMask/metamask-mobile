import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../../util/theme/models';

const styleSheet = (params: {
  theme: Theme;
  vars: { noMargin?: boolean; isSelected?: boolean };
}) => {
  const { theme, vars } = params;
  const { noMargin, isSelected } = vars;
  return StyleSheet.create({
    modalContainer: {
      backgroundColor: theme.colors.background.default,
      borderTopRightRadius: 16,
      borderTopLeftRadius: 16,
      paddingLeft: 16,
      paddingRight: 16,
      paddingBottom: 16,
    },
    titleText: {
      marginLeft: noMargin ? 0 : 4,
      marginTop: 12,
      marginBottom: 12,
    },
    nativeToggleIcon: {
      margin: 2,
    },
    nativeToggleIconImg: {
      margin: 8,
    },
    container: {
      position: 'relative',
      flexDirection: 'row',
      paddingTop: 8,
    },
    backButton: {
      position: 'absolute',
      left: 0,
      top: 24,
      zIndex: 1,
    },
    title: {
      color: theme.colors.text.default,
      textAlign: 'center',
      flex: 1,
      padding: 16,
    },
    titlePayETH: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'space-between',
      marginInline: 4,
      flexDirection: 'row',
    },
    contentContainer: {
      display: 'flex',
      flexDirection: 'column',
      paddingLeft: 0,
      paddingRight: 0,
    },
    nativeToggleContainer: {
      display: 'flex',
      flexDirection: 'row',
      borderStyle: 'solid',
      borderColor: theme.colors.border.muted,
      borderRadius: 6,
    },
    gasFeeTokenListItem: {
      position: 'relative',
      width: '100%',
      backgroundColor: theme.colors.background.default,
    },
    gasFeeTokenListItemSelected: {
      position: 'relative',
      width: '100%',
    },
    gasFeeTokenListItemSelectedIndicator: {
      width: 4,
      position: 'absolute',
      top: 4,
      left: 4,
      backgroundColor: theme.colors.primary.default,
    },
    nativeToggleOption: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 8,
      borderRadius: 8,
      backgroundColor: isSelected
        ? theme.colors.primary.muted
        : theme.colors.background.alternative,
      marginRight: 8,
    },
  });
};

export default styleSheet;
