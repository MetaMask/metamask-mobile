///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
import { StyleSheet } from 'react-native';

const styleSheet = () =>
  StyleSheet.create({
    snapSettingsContainer: {
      flex: 1,
      marginHorizontal: 16,
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
