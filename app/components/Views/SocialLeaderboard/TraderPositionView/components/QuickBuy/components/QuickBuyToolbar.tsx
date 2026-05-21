import React from 'react';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Text,
  TextColor,
  TextVariant,
  AvatarToken,
  AvatarTokenSize,
  Icon,
  IconColor,
  IconName,
  IconSize,
  BadgeWrapper,
  BadgeWrapperPosition,
  BadgeNetwork,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import type { Hex } from '@metamask/utils';
import { strings } from '../../../../../../../../locales/i18n';
import type { BridgeToken } from '../../../../../../UI/Bridge/types';
import { getNetworkImageSource } from '../../../../../../../util/networks';
import { getBridgeTokenImageSource } from '../getBridgeTokenImageSource';

interface QuickBuyToolbarProps {
  sourceToken: BridgeToken | undefined;
  sourceChainId: Hex | undefined;
  payWithEnabled: boolean;
}

const QuickBuyToolbar: React.FC<QuickBuyToolbarProps> = ({
  sourceToken,
  sourceChainId,
  payWithEnabled,
}) => {
  const tw = useTailwind();
  const networkImage = sourceChainId
    ? getNetworkImageSource({ chainId: sourceChainId })
    : undefined;

  return (
    <Box
      twClassName="px-4 pt-2 pb-3"
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      justifyContent={BoxJustifyContent.Between}
    >
      <Box
        twClassName="rounded-full bg-muted px-3 py-1"
        flexDirection={BoxFlexDirection.Row}
        gap={2}
      >
        <Text variant={TextVariant.BodySm} color={TextColor.TextDefault}>
          {strings('social_leaderboard.quick_buy.buy_mode')}
        </Text>
      </Box>

      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        gap={2}
      >
        <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
          {strings('social_leaderboard.quick_buy.pay_with')}
        </Text>
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          gap={2}
          twClassName="rounded-full bg-muted px-2 py-1"
        >
          {sourceToken ? (
            networkImage ? (
              <BadgeWrapper
                position={BadgeWrapperPosition.BottomRight}
                badge={<BadgeNetwork src={networkImage} />}
              >
                <AvatarToken
                  size={AvatarTokenSize.Sm}
                  name={sourceToken.symbol}
                  src={getBridgeTokenImageSource(sourceToken)}
                />
              </BadgeWrapper>
            ) : (
              <AvatarToken
                size={AvatarTokenSize.Sm}
                name={sourceToken.symbol}
                src={getBridgeTokenImageSource(sourceToken)}
              />
            )
          ) : null}
          <Text variant={TextVariant.BodySm} color={TextColor.TextDefault}>
            {sourceToken?.symbol ?? '—'}
          </Text>
          {payWithEnabled ? (
            <Icon
              name={IconName.ArrowDown}
              size={IconSize.Sm}
              color={IconColor.IconDefault}
            />
          ) : null}
        </Box>
      </Box>
    </Box>
  );
};

export default QuickBuyToolbar;
