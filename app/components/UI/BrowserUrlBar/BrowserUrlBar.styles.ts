import { StyleSheet } from 'react-native';

import { Theme } from '../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) =>
  StyleSheet.create({
    main: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    text: {
      color: params.theme.colors.text.alternative,
      flex: 1,
      height: 44,
      padding: 0,
      margin: 0,
      paddingLeft: 8,
    },
  });

export default styleSheet;
