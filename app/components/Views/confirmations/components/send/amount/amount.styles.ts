import { StyleSheet } from 'react-native';

import { Theme } from '../../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  return StyleSheet.create({
    input: {
      borderWidth: 1,
      borderColor: theme.colors.border.default,
    },
  });
};

export default styleSheet;
