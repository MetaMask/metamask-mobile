///: BEGIN:ONLY_INCLUDE_IF(snaps)
import { StyleSheet } from 'react-native';
import { Theme } from '../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { colors } = params.theme;
  return StyleSheet.create({
    snapSettingsContainer: {
      flex: 1,
    },
    scrollContent: {
      paddingTop: 16,
      paddingBottom: 48,
    },
    itemPaddedContainer: {
      paddingHorizontal: 16,
    },
    removeSection: {
      paddingHorizontal: 16,
      paddingVertical: 16,
    },
    sectionBreak: {
      height: 6,
      backgroundColor: colors.background.muted,
    },
    groupDivider: {
      height: 1,
      backgroundColor: colors.border.muted,
      marginHorizontal: 16,
    },
    removeTitle: {
      marginBottom: 8,
    },
    removeDescription: {
      lineHeight: 20,
    },
    removeButton: {
      marginTop: 16,
    },
  });
};

export default styleSheet;
///: END:ONLY_INCLUDE_IF
