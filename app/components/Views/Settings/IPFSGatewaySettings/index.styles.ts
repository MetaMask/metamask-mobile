import { StyleSheet } from 'react-native';
import { Theme } from '../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;
  return StyleSheet.create({
    titleContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    title: {
      flex: 1,
    },
    switchElement: {
      marginLeft: 16,
    },
    switch: {
      alignSelf: 'flex-start',
    },
    halfSetting: {
      marginTop: 0,
      paddingVertical: 16,
    },
    desc: {
      marginTop: 8,
      lineHeight: 20,
    },
    setting: {
      marginTop: 0,
      paddingVertical: 16,
    },
    accessory: {
      marginTop: 12,
    },
    picker: {
      marginTop: 12,
    },
    pickerTrigger: {
      backgroundColor: colors.background.muted,
      borderRadius: 12,
      borderWidth: 0,
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    selectedLabel: {
      flex: 1,
    },
  });
};

export default styleSheet;
