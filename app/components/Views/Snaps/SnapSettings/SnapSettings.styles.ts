///: BEGIN:ONLY_INCLUDE_IF(snaps)
import { StyleSheet } from 'react-native';

const styleSheet = () =>
  StyleSheet.create({
    snapSettingsContainer: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: 16,
    },
    itemPaddedContainer: {
      paddingVertical: 16,
    },
    removeSection: {
      paddingTop: 32,
    },
    removeButton: {
      marginVertical: 16,
    },
  });

export default styleSheet;
///: END:ONLY_INCLUDE_IF
