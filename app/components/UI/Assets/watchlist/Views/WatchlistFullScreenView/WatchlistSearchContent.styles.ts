import { StyleSheet } from 'react-native';
import type { Theme } from '../../../../../../util/theme/models';

/** spacing/2 top, 16px horizontal, 12px bottom — Figma watchlist search header. */
const styleSheet = (params: {
  theme: Theme;
  vars: { topInsetPadding: number };
}) => {
  const { theme, vars } = params;

  return StyleSheet.create({
    container: {
      flex: 1,
      paddingTop: vars.topInsetPadding,
    },
    searchBarContainer: {
      paddingTop: 8,
      paddingHorizontal: 16,
      paddingBottom: 12,
    },
    listContainer: {
      flex: 1,
    },
    listContentContainer: {
      paddingHorizontal: 16,
    },
    loadingFooter: {
      paddingVertical: 16,
    },
    skeletonOverlay: {
      ...StyleSheet.absoluteFillObject,
      paddingHorizontal: 16,
      backgroundColor: theme.colors.background.default,
    },
  });
};

export default styleSheet;
