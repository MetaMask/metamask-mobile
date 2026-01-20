import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;

  return StyleSheet.create({
    container: {
      width: '100%',
    },
    optionWrapper: {
      position: 'relative',
      marginBottom: 8,
    },
    selectionIndicator: {
      position: 'absolute',
      left: 4,
      top: 4,
      bottom: 4,
      width: 4,
      backgroundColor: theme.colors.primary.default,
      zIndex: 1,
      borderRadius: 2,
    },
    optionContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 12,
      paddingHorizontal: 12,
    },
    selectedOption: {
      backgroundColor: theme.colors.primary.muted,
    },
    leftSection: {
      flexDirection: 'row',
      alignItems: 'center',
      marginLeft: 8,
    },
    optionTextContainer: {
      justifyContent: 'center',
    },
    optionName: {},
    estimatedTime: {
      color: theme.colors.text.alternative,
    },
    rightSection: {
      alignItems: 'flex-end',
    },
    valueInFiat: {},
    value: {
      color: theme.colors.text.alternative,
    },
  });
};

export default styleSheet;
