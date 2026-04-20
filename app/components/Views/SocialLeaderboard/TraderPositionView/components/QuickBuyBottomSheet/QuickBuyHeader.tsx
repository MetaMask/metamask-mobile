import React from 'react';
import {
  Box,
  Text,
  TextVariant,
  TextColor,
  FontWeight,
  ButtonIcon,
  ButtonIconSize,
  IconName as DsIconName,
  BoxFlexDirection,
  BoxAlignItems,
  AvatarToken,
  AvatarTokenSize,
} from '@metamask/design-system-react-native';
import type { Position } from '@metamask/social-controllers';
import { strings } from '../../../../../../../locales/i18n';

interface QuickBuyHeaderProps {
  position: Position;
  destTokenImage: string | undefined;
  onClose: () => void;
}

const QuickBuyHeader: React.FC<QuickBuyHeaderProps> = ({
  position,
  destTokenImage,
  onClose,
}) => (
  <Box
    flexDirection={BoxFlexDirection.Row}
    alignItems={BoxAlignItems.Center}
    gap={4}
    twClassName="h-20 px-4"
  >
    <Box twClassName="w-12 h-12 rounded-xl overflow-hidden">
      <AvatarToken
        name={position.tokenSymbol}
        src={destTokenImage ? { uri: destTokenImage } : undefined}
        size={AvatarTokenSize.Lg}
      />
    </Box>
    <Box twClassName="flex-1">
      <Text
        variant={TextVariant.HeadingSm}
        fontWeight={FontWeight.Bold}
        color={TextColor.TextDefault}
      >
        {strings('social_leaderboard.quick_buy.title', {
          symbol: position.tokenSymbol,
        })}
      </Text>
      <Text
        variant={TextVariant.BodySm}
        fontWeight={FontWeight.Medium}
        color={TextColor.TextAlternative}
      >
        {strings('social_leaderboard.quick_buy.market_cap_label')}
      </Text>
    </Box>
    <ButtonIcon
      iconName={DsIconName.Close}
      size={ButtonIconSize.Md}
      onPress={onClose}
      testID="quick-buy-close-button"
    />
  </Box>
);

export default QuickBuyHeader;
