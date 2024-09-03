// Third party dependencies.
import { StyleSheet } from 'react-native';
import { fontStyles } from '../../../styles/common';
import { Colors } from '../../../util/theme/models';

/**
 * Style sheet function for AccountActions component.
 *
 * @returns StyleSheet object.
 */
const styleSheet = (colors: Colors) =>
  StyleSheet.create({
    actionsContainer: {
      alignItems: 'flex-start',
      justifyContent: 'center',
      paddingVertical: 16,
    },
    text: {
      color: colors.text.default,
      fontSize: 14,
      ...fontStyles.normal,
    },
  });

export default styleSheet;
