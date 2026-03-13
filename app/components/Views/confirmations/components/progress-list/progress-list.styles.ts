import { StyleSheet } from 'react-native';

import { Theme } from '../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const {
    theme: { colors },
  } = params;

  return StyleSheet.create({
    container: {
      padding: 6,
    },
    dividerContainer: {
      width: 20,
      alignItems: 'center' as const,
      marginTop: -30,
      marginBottom: -6,
    },
    dividerBar: {
      backgroundColor: colors.icon.alternative,
      width: 2,
      minHeight: 32,
    },
    subtitleSpacer: {
      width: 20,
    },
    subtitleText: {
      paddingLeft: 12,
      paddingBottom: 8,
    },
  });
};

export default styleSheet;
