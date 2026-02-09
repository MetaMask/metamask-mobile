import React, { useCallback, useContext } from 'react';
import { Pressable, Share } from 'react-native';
import Icon, {
  IconName,
  IconSize,
} from '../../../../../component-library/components/Icons/Icon';
import { useTheme } from '../../../../../util/theme';
import { PredictMarketDetailsSelectorsIDs } from '../../Predict.testIds';
import { strings } from '../../../../../../locales/i18n';
import {
  ToastContext,
  ToastVariants,
} from '../../../../../component-library/components/Toast';
import { Box } from '@metamask/design-system-react-native';
import Engine from '../../../../../core/Engine';
import { PredictShareStatus } from '../../constants/eventNames';

interface PredictShareButtonProps {
  marketId?: string;
  marketSlug?: string;
}

const PredictShareButton: React.FC<PredictShareButtonProps> = ({
  marketId,
  marketSlug,
}) => {
  const { toastRef } = useContext(ToastContext);
  const { colors } = useTheme();

  const handleSharePress = useCallback(async () => {
    Engine.context.PredictController.trackShareAction({
      status: PredictShareStatus.INITIATED,
      marketId,
      marketSlug,
    });

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
        Engine.context.PredictController.trackShareAction({
          status: PredictShareStatus.SUCCESS,
          marketId,
          marketSlug,
        });

        if (
          result.activityType === 'com.apple.UIKit.activity.CopyToPasteboard'
        ) {
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
      } else {
        throw new Error('Failed to share');
      }
    } catch (_error) {
      Engine.context.PredictController.trackShareAction({
        status: PredictShareStatus.FAILED,
        marketId,
        marketSlug,
      });
    }
  }, [colors.success.default, marketId, marketSlug, toastRef]);

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
