import { StyleSheet } from 'react-native';

import { Theme } from '../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) =>
  StyleSheet.create({
    main: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    text: {
      marginLeft: 8,
      color: params.theme.colors.text.alternative,
    },
  });

export default styleSheet;
