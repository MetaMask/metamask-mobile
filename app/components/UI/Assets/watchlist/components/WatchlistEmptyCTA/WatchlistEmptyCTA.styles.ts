import { StyleSheet } from 'react-native';
import type { Theme } from '../../../../../../util/theme/models';

const styleSheet = (_params: { theme: Theme }) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    scrollContent: {
      flexGrow: 1,
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 16,
    },
    scrollView: {
      flex: 1,
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    gridItem: {
      width: '48%',
    },
    skeletonGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    skeletonCard: {
      width: '48%',
      height: 140,
      borderRadius: 12,
      backgroundColor: _params.theme.colors.background.section,
    },
    footer: {
      flexDirection: 'column',
      alignItems: 'flex-start',
      paddingVertical: 4,
    },
    button: {
      alignSelf: 'stretch',
      width: '100%',
    },
  });

export default styleSheet;
