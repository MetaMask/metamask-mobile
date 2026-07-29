///: BEGIN:ONLY_INCLUDE_IF(snaps)
import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { colors } = params.theme;
  return StyleSheet.create({
    snapCell: {
      alignItems: 'center',
      flexDirection: 'row',
      minHeight: 72,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border.muted,
    },
    snapInfo: {
      flex: 1,
      marginRight: 16,
    },
    snapId: {
      marginTop: 4,
    },
    arrowContainer: {
      justifyContent: 'center',
    },
  });
};
export default styleSheet;
///: END:ONLY_INCLUDE_IF
