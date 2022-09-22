import { StyleSheet } from 'react-native';

import { Theme } from '../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) =>
  StyleSheet.create({
    main: {
      flexDirection: 'row',
      marginLeft: 23,
      marginRight: 23,
    },
    text: {
      flex: 1,
      marginLeft: 6,
      color: params.theme.colors.icon.alternative,
      width: 260,
    },
  });

export default styleSheet;
