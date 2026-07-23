import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../../../util/theme/models';

// Cap the expanded modal content so its fixed header (and Close button) stays on screen.
const EXPANDED_CONTENT_MAX_HEIGHT_RATIO = 0.7;

const styleSheet = (params: {
  theme: Theme;
  vars: { isNonceChangeDisabled: boolean; windowHeight: number };
}) => {
  const {
    theme,
    vars: { isNonceChangeDisabled, windowHeight },
  } = params;

  return StyleSheet.create({
    nonceText: isNonceChangeDisabled
      ? {
          color: theme.colors.text.default,
        }
      : {
          textDecorationLine: 'underline',
          color: theme.colors.primary.default,
        },
    infoRowOverride: {
      paddingBottom: 4,
      paddingHorizontal: 8,
    },
    expandedScrollContainer: {
      maxHeight: windowHeight * EXPANDED_CONTENT_MAX_HEIGHT_RATIO,
    },
    dataScrollContainer: {
      height: 200,
    },
    skeletonContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingBottom: 8,
      paddingHorizontal: 8,
    },
    skeletonBorderRadius: {
      borderRadius: 4,
    },
  });
};

export default styleSheet;
