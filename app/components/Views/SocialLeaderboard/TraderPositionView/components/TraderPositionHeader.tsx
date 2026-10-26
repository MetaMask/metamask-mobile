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
import TraderHeaderIdentity from '../../components/TraderHeaderIdentity';

export interface TraderPositionHeaderProps {
  traderName: string;
  traderImageUrl?: string;
  traderAddress?: string;
  onBack: () => void;
  onTraderPress: () => void;
  onShare?: () => void;
  backButtonTestID: string;
  shareButtonTestID?: string;
  traderNameTestID: string;
}

const TraderPositionHeader: React.FC<TraderPositionHeaderProps> = ({
  traderName,
  traderImageUrl,
  traderAddress,
  onBack,
  onTraderPress,
  onShare,
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
      variant="nav"
      onPress={onTraderPress}
      testID={traderNameTestID}
    />
    <Box twClassName="w-10" alignItems={BoxAlignItems.End}>
      {onShare ? (
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
