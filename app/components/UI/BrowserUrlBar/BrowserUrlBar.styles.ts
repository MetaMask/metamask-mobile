import { StyleSheet } from 'react-native';

import { Theme } from '../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) =>
  StyleSheet.create({
    main: {
      flexDirection: 'row',
      marginHorizontal: 16,
    },
    text: {
      marginLeft: 8,
      color: params.theme.colors.text.alternative,
      width: 260,
    },
  });

export default styleSheet;
