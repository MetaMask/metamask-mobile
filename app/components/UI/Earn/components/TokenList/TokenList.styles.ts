import { StyleSheet } from 'react-native';
import type { Theme } from '../../../../../util/theme/models';

export interface TokenListStyles {
  container: {
    flex: number;
    backgroundColor: string;
    flexDirection: 'column';
    justifyContent: 'center';
  };
  listItemContainer: {
    padding: number;
    paddingBottom: number;
    borderColor: string;
  };
}

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;

  return StyleSheet.create<TokenListStyles>({
    container: {
      flex: 1,
      backgroundColor: colors.background.default,
      flexDirection: 'column',
      justifyContent: 'center',
    },
    listItemContainer: {
      padding: 16,
      paddingBottom: 8,
      borderColor: colors.border.muted,
    },
  });
};

export default styleSheet;
