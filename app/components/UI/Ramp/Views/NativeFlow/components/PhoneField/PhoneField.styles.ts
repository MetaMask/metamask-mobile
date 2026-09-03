import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;

  return StyleSheet.create({
    phoneFlagRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    phoneFlagEmoji: {
      fontSize: 18,
    },
    phonePrefix: {
      color: theme.colors.text.default,
      fontSize: 14,
    },
  });
};

export default styleSheet;
