import { StyleSheet, TextStyle } from 'react-native';
import {
  getFontFamily,
  TextVariant,
} from '../../../component-library/components/Texts/Text';
import { Theme } from '../../../util/theme/models';

const UNDERLINE_HEIGHT = 2;
const TAB_PADDING_BOTTOM = 8;
const TAB_PADDING_VERTICAL = 8;
const DELETE_CONTAINER_PADDING_LEFT = 16;
const DELETE_CONTAINER_PADDING_RIGHT = 8;

const BODY_MD_FONT_FAMILY = getFontFamily(TextVariant.BodyMD);

const createStyles = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors, typography } = theme;

  const borderMuted = colors.border.muted;
  const textDefault = colors.text.default;
  const textAlternative = colors.text.alternative;

  return StyleSheet.create({
    // tab
    tabUnderlineStyle: {
      height: UNDERLINE_HEIGHT,
      backgroundColor: textDefault,
    },
    inactiveUnderlineStyle: {
      height: UNDERLINE_HEIGHT,
      backgroundColor: textAlternative,
    },
    tabStyle: {
      paddingBottom: TAB_PADDING_BOTTOM,
      paddingVertical: TAB_PADDING_VERTICAL,
    },
    textStyle: {
      ...(typography.sBodyMD as TextStyle),
      fontFamily: BODY_MD_FONT_FAMILY,
      fontWeight: '500',
    },
    tabBar: {
      borderColor: borderMuted,
    },
    // edit network menu
    editNetworkMenu: {
      alignItems: 'center',
    },
    // custom network styles
    containerDeleteText: {
      paddingLeft: DELETE_CONTAINER_PADDING_LEFT,
      paddingRight: DELETE_CONTAINER_PADDING_RIGHT,
      alignItems: 'center',
    },
    textCentred: {
      textAlign: 'center',
    },
    // RPC modal styles
    rpcMenu: {
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
    },
    cellBorder: { borderWidth: 0, paddingTop: 10, paddingBottom: 5 },
    baseHeader: { paddingVertical: 8 },
    rpcText: {
      width: '100%',
    },
    alternativeText: {
      color: textAlternative,
    },
  });
};

export default createStyles;
