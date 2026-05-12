import { useCallback, useContext } from 'react';
import { Share } from 'react-native';
import { ToastContext } from '../../../../component-library/components/Toast';
import { useTheme } from '../../../../util/theme';
import Engine from '../../../../core/Engine';
import { PredictShareStatus } from '../constants/eventNames';
import { strings } from '../../../../../locales/i18n';
import { buildShareCopiedToastOptions } from './usePredictShare.utils';

interface UsePredictShareParams {
  marketId?: string;
  marketSlug?: string;
}

const usePredictShare = ({ marketId, marketSlug }: UsePredictShareParams) => {
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
          return toastRef?.current?.showToast(
            buildShareCopiedToastOptions({
              label: strings('predict.toasts.copied_to_clipboard'),
              successColor: colors.success.default,
            }),
          );
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

  return { handleSharePress };
};

export default usePredictShare;
