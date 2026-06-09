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
      marginTop: 24,
    },
    desc: {
      marginTop: 8,
    },
    setting: {
      marginTop: 24,
    },
    accessory: {
      marginTop: 16,
    },
    picker: {
      marginTop: 16,
    },
  });
};

export default styleSheet;
