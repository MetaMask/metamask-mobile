import React from 'react';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  ButtonIcon,
  ButtonIconSize,
  IconName,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import ShareButtonSpinner from '../../components/ShareButtonSpinner';
import { TraderPositionViewSelectorsIDs } from '../TraderPositionView.testIds';
import TraderHeaderIdentity from '../../components/TraderHeaderIdentity';

export interface TraderPositionHeaderProps {
  traderName: string;
  traderImageUrl?: string;
  traderAddress?: string;
  traderProfileId?: string;
  onBack: () => void;
  onTraderPress: () => void;
  onShare?: () => void;
  /** Shows a spinner in place of the share button while the link is made. */
  isSharing?: boolean;
  backButtonTestID: string;
  shareButtonTestID?: string;
  traderNameTestID: string;
}

const TraderPositionHeader: React.FC<TraderPositionHeaderProps> = ({
  traderName,
  traderImageUrl,
  traderAddress,
  traderProfileId,
  onBack,
  onTraderPress,
  onShare,
  isSharing = false,
  backButtonTestID,
  shareButtonTestID,
  traderNameTestID,
}) => (
  <Box
    flexDirection={BoxFlexDirection.Row}
    alignItems={BoxAlignItems.Center}
    justifyContent={BoxJustifyContent.Between}
    twClassName="px-2 py-2"
  >
    <Box twClassName="w-10">
      <ButtonIcon
        iconName={IconName.ArrowLeft}
        size={ButtonIconSize.Md}
        onPress={onBack}
        testID={backButtonTestID}
      />
    </Box>
    <TraderHeaderIdentity
      traderName={traderName}
      traderImageUrl={traderImageUrl}
      traderAddress={traderAddress}
      traderProfileId={traderProfileId}
      variant="nav"
      onPress={onTraderPress}
      testID={traderNameTestID}
    />
    <Box twClassName="w-10" alignItems={BoxAlignItems.End}>
      {onShare && isSharing ? (
        <ShareButtonSpinner
          testID={TraderPositionViewSelectorsIDs.SHARE_SPINNER}
        />
      ) : onShare ? (
        <ButtonIcon
          iconName={IconName.Share}
          size={ButtonIconSize.Md}
          onPress={onShare}
          accessibilityLabel={strings('social.profile.share_position')}
          testID={shareButtonTestID}
        />
      ) : null}
    </Box>
  </Box>
);

export default TraderPositionHeader;
