// Third party dependencies.
import { StyleSheet, Dimensions } from 'react-native';
import { Theme } from '../../../util/theme/models';

const marginWidth = 16;
const padding = 12;
const toastWidth = Dimensions.get('window').width - marginWidth * 2;

/**
 * Style sheet for Toast component.
 *
 * @returns StyleSheet object.
 */
const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;
  return StyleSheet.create({
    base: {
      position: 'absolute',
      width: toastWidth,
      left: marginWidth,
      bottom: 0,
      backgroundColor: colors.background.section,
      borderWidth: 1,
      borderColor: colors.border.muted,
      borderRadius: 12,
      padding,
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
    avatar: {
      marginTop: -4,
      marginRight: 16,
    },
    labelsContainer: {
      flex: 1,
      justifyContent: 'flex-start',
    },
    // In compact mode the labels container shares all of `labelsContainer`'s
    // styling but switches to vertical-center alignment so the single-line
    // label sits next to the action/close buttons.
    labelsContainerCompact: {
      justifyContent: 'center',
    },
    label: {
      color: colors.text.default,
    },
    description: {
      marginTop: 4,
    },
    actionButton: {
      marginTop: 8,
    },
    compactActionButton: {
      marginLeft: 8,
    },
    compactAvatar: {
      marginTop: 0,
    },
    baseCompact: {
      alignItems: 'center',
    },
  });
};

export default styleSheet;
