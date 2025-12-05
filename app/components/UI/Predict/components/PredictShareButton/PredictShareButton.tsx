import React, { useCallback, useContext } from 'react';
import { Pressable, Share } from 'react-native';
import Icon, {
  IconName,
  IconSize,
} from '../../../../../component-library/components/Icons/Icon';
import { useTheme } from '../../../../../util/theme';
import { PredictMarketDetailsSelectorsIDs } from '../../../../../../e2e/selectors/Predict/Predict.selectors';
import { strings } from '../../../../../../locales/i18n';
import {
  ToastContext,
  ToastVariants,
} from '../../../../../component-library/components/Toast';
import { Box } from '@metamask/design-system-react-native';

interface PredictShareButtonProps {
  marketId?: string;
}

const PredictShareButton: React.FC<PredictShareButtonProps> = ({
  marketId,
}) => {
  const { toastRef } = useContext(ToastContext);
  const { colors } = useTheme();

  const handleSharePress = useCallback(async () => {
    try {
      const url = `https://link.metamask.io/predict?market=${marketId ?? ''}&utm_source=user_shared`;

      const result = await Share.share(
        {
          url,
          message: `Check out this prediction market on MetaMask:\n\n${url}`,
        },
        {},
      );
      if (result.action === Share.sharedAction) {
        if (
          result.activityType === 'com.apple.UIKit.activity.CopyToPasteboard'
        ) {
          // Copied to clipboard
          return toastRef?.current?.showToast({
            variant: ToastVariants.Icon,
            labelOptions: [
              {
                label: strings('predict.toasts.copied_to_clipboard'),
                isBold: true,
              },
            ],
            iconName: IconName.Confirmation,
            backgroundColor: 'transparent',
            iconColor: colors.success.default,
            hasNoTimeout: false,
            customBottomOffset: -50,
            // Need to style manually otherwise the icon is not centered and the text is too far away
            startAccessory: (
              <Box twClassName="items-center justify-center align-center pr-[12px]">
                <Icon
                  name={IconName.Confirmation}
                  color={colors.success.default}
                  size={IconSize.Lg}
                />
              </Box>
            ),
          });
        }
        // Shared
      } else if (result.action === Share.dismissedAction) {
        // Dismissed
      }
    } catch (_error) {
      // Ignore errors
    }
  }, [colors.success.default, marketId, toastRef]);

  return (
    <Pressable
      onPress={handleSharePress}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel={strings('predict.buttons.share')}
      testID={PredictMarketDetailsSelectorsIDs.SHARE_BUTTON}
    >
      <Icon
        name={IconName.Share}
        size={IconSize.Lg}
        color={colors.icon.default}
      />
    </Pressable>
  );
};

export default PredictShareButton;
