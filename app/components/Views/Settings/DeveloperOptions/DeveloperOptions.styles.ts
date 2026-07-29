import { StyleSheet } from 'react-native';
import { Theme } from '../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;
  return StyleSheet.create({
    wrapper: {
      backgroundColor: colors.background.default,
      flex: 1,
    },
    contentContainer: {
      paddingBottom: 100,
      paddingHorizontal: 16,
      paddingTop: 24,
    },
    sectionCard: {
      borderWidth: 1,
      borderColor: colors.border.muted,
      borderRadius: 16,
      backgroundColor: colors.background.alternative,
      paddingHorizontal: 16,
      paddingVertical: 16,
      marginBottom: 16,
    },
    heading: {
      marginTop: 0,
    },
    subsectionHeading: {
      marginTop: 24,
      marginBottom: 8,
    },
    desc: {
      marginTop: 8,
      lineHeight: 22,
    },
    accessory: {
      marginTop: 12,
    },
    buttonStack: {
      marginTop: 12,
      gap: 12,
    },
    stackedButton: {
      marginTop: 0,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 12,
    },
    rowContent: {
      flex: 1,
      paddingRight: 16,
    },
    rowValue: {
      marginTop: 4,
    },
    divider: {
      height: 1,
      backgroundColor: colors.border.muted,
      marginVertical: 4,
    },
  });
};

export default styleSheet;
