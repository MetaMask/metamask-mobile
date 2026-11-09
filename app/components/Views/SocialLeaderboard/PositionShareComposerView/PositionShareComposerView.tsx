import React, { useCallback, useContext, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { strings } from '../../../../../locales/i18n';
import {
  ToastContext,
  ToastVariants,
} from '../../../../component-library/components/Toast';
import { IconName as ComponentLibraryIconName } from '../../../../component-library/components/Icons/Icon';
import { useNetworkTier } from '../../../../hooks/useNetworkTier';
import { selectReferralCode } from '../../../../reducers/rewards/selectors';
import { useParams } from '../../../../util/navigation/navUtils';
import { useTheme } from '../../../../util/theme';
import {
  ShareCardComposer,
  type ShareCardComposerAction,
} from '../../../UI/ShareCard';
import { usePositionSheetData } from '../PositionDetailsSheet/hooks/usePositionSheetData';
import { buildSocialTraderPositionDeeplink } from '../navigation/socialTraderDeeplink';
import {
  getSocialEventSource,
  SocialEvent,
  useSocialAnalytics,
} from '../analytics';
import { buildPositionShareCard } from './buildPositionShareCard';
import type { PositionShareComposerViewParams } from './PositionShareComposerView.types';

/**
 * Share composer for a social position: builds the card from the same data
 * as the position sheet and hands it to the generic composer.
 */
const PositionShareComposerView = () => {
  const navigation = useNavigation();
  const {
    position,
    traderId,
    traderName,
    traderImageUrl,
    traderAddress,
    isClosed,
    source,
  } = useParams<PositionShareComposerViewParams>();
  const { toastRef } = useContext(ToastContext);
  const { colors } = useTheme();
  const { trackInteraction } = useSocialAnalytics();
  const referralCode = useSelector(selectReferralCode);

  // `null` (unknown) is treated as online; only a confirmed `NONE` skips the
  // price fetch, and the card then draws without a line.
  const networkTier = useNetworkTier();
  const sheet = usePositionSheetData(position, isClosed, {
    isNetworkAvailable: networkTier !== 'NONE',
  });

  const card = useMemo(
    () =>
      buildPositionShareCard({
        position,
        sheet,
        author: {
          label: traderName,
          imageUrl: traderImageUrl,
          address: traderAddress,
        },
        referralCode,
      }),
    [position, sheet, traderName, traderImageUrl, traderAddress, referralCode],
  );

  const link = useMemo(
    () => buildSocialTraderPositionDeeplink(position.positionId, traderId),
    [position.positionId, traderId],
  );

  const trackShare = useCallback(
    (
      shareDestination:
        | typeof SocialEvent.ShareDestination.EXTERNAL
        | typeof SocialEvent.ShareDestination.COPY_LINK,
    ) => {
      const eventSource = getSocialEventSource(source);
      trackInteraction({
        interaction_type: SocialEvent.Interaction.POST_SHARED,
        screen_name: SocialEvent.Screen.SHARE_POSITION_SHEET,
        share_destination: shareDestination,
        ...(eventSource ? { source: eventSource } : {}),
      });
    },
    [source, trackInteraction],
  );

  const handleLinkCopied = useCallback(
    () => trackShare(SocialEvent.ShareDestination.COPY_LINK),
    [trackShare],
  );
  const handleShared = useCallback(
    () => trackShare(SocialEvent.ShareDestination.EXTERNAL),
    [trackShare],
  );

  const handleError = useCallback(
    (action: ShareCardComposerAction) => {
      toastRef?.current?.showToast({
        variant: ToastVariants.Icon,
        iconName: ComponentLibraryIconName.Danger,
        iconColor: colors.error.default,
        labelOptions: [
          {
            label: strings(
              action === 'copy_link'
                ? 'share_card.copy_link_failed'
                : 'share_card.share_failed',
            ),
          },
        ],
        hasNoTimeout: false,
      });
    },
    [colors.error.default, toastRef],
  );

  return (
    <ShareCardComposer
      card={card}
      isReady={!sheet.isPricesLoading}
      link={link}
      onClose={navigation.goBack}
      onLinkCopied={handleLinkCopied}
      onShared={handleShared}
      onError={handleError}
    />
  );
};

export default PositionShareComposerView;
