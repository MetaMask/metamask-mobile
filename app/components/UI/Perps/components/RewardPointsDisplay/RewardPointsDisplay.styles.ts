import { StyleSheet } from 'react-native';
import type { Theme } from '../../../../../util/theme/models';
import {
  RewardPointsDisplayStyleSheetVars,
  RewardDisplayState,
} from './RewardPointsDisplay.types';

/**
 * Style definitions for the RewardPointsDisplay component.
 */
const styleSheet = (params: {
  theme: Theme;
  vars: RewardPointsDisplayStyleSheetVars;
}) => {
  const { theme, vars } = params;
  const { colors } = theme;
  const { state } = vars;

  return StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    pointsContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    contentContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    riveIcon: {
      width: 16,
      height: 16,
      ...(state === RewardDisplayState.ErrorState && {
        opacity: 0.4,
        tintColor: colors.icon.muted,
      }),
    },
    discountTag: {
      marginLeft: 4,
    },
    errorText: {
      color: colors.text.alternative,
    },
  });
};

export default styleSheet;
