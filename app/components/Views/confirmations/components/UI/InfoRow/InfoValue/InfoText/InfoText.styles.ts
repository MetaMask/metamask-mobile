import { StyleSheet } from 'react-native';

import { Theme } from '../../../../../../../../util/theme/models';
import { fontStyles } from '../../../../../../../../styles/common';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;

  return StyleSheet.create({
    value: {
      color: theme.colors.text.default,
      ...fontStyles.normal,
      fontSize: 14,
    },
  });
};

export default styleSheet;
