import React, { useMemo } from 'react';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  BadgeNetwork,
  BadgeWrapper,
  BadgeWrapperPosition,
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { formatChainIdToHex } from '@metamask/bridge-controller';
import { Hex } from '@metamask/utils';
import ListItemMultiSelect from '../../../../../component-library/components/List/ListItemMultiSelect';
import { isNonEvmChainId } from '../../../../../core/Multichain/utils';
import { NetworkBadgeSource } from '../../../../UI/AssetOverview/Balance/Balance';
import AssetLogo from '../../../../UI/Assets/components/AssetLogo/AssetLogo';
import TokenListSecurityBadge from '../../../../UI/Tokens/components/TokenListSecurityBadge/TokenListSecurityBadge';
import {
  formatOwnedTokenBalance,
  formatOwnedTokenFiat,
  type ClassifiedOwnedToken,
} from './ownedTokenModel';

interface OwnedTokenRowProps {
  token: ClassifiedOwnedToken;
  networkName: string;
  isSelected: boolean;
  onToggle: (assetId: string) => void;
}

/**
 * Mirrors `AddAssetTokenRow`'s layout (used by the Find tokens flow) so the
 * two lists match pixel-for-pixel, but swaps in `AssetLogo` for the avatar:
 * it always renders at a fixed size (keeping the badge anchored and the row
 * height stable) and cycles through checksum/lowercase icon URLs instead of
 * rendering nothing when the first guess 404s.
 */
const OwnedTokenRow = ({
  token,
  networkName,
  isSelected,
  onToggle,
}: OwnedTokenRowProps) => {
  const tw = useTailwind();
  const balanceLabel = `${formatOwnedTokenBalance(
    token.balance,
    token.decimals,
    token.chainId,
  )} ${token.symbol}`;
  const fiatLabel = formatOwnedTokenFiat(
    token.balance,
    token.decimals,
    token.price,
  );
  // Badge lookup needs a hex chainId for EVM chains (CAIP ids don't match
  // the popular/unpopular network lists); non-EVM chains stay CAIP, same as
  // Find tokens' `convertTrendingAssetsToImporAssets`.
  const badgeChainId = useMemo(
    () =>
      isNonEvmChainId(token.chainId)
        ? token.chainId
        : formatChainIdToHex(token.chainId),
    [token.chainId],
  );

  return (
    <ListItemMultiSelect
      isSelected={isSelected}
      gap={20}
      style={tw.style('py-0')}
      onPress={() => onToggle(token.assetId)}
      accessibilityLabel={`${token.name} ${token.symbol} ${balanceLabel}`}
      testID={`owned-token-row-${token.symbol}`}
    >
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        twClassName="min-h-16 flex-1"
      >
        <Box>
          <BadgeWrapper
            position={BadgeWrapperPosition.BottomRight}
            badge={
              <BadgeNetwork
                src={NetworkBadgeSource(badgeChainId as Hex)}
                name={networkName}
                twClassName="h-5 w-5"
              />
            }
          >
            <AssetLogo
              asset={{
                address: token.address,
                chainId: token.chainId,
                decimals: token.decimals,
                image: token.imageUrl,
                isETH: false,
                isNative: false,
                logo: token.imageUrl || undefined,
                name: token.name,
                symbol: token.symbol,
              }}
            />
          </BadgeWrapper>
        </Box>
        <Box twClassName="ml-5 min-w-0 flex-1 justify-center">
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            twClassName="gap-1"
          >
            <Text
              variant={TextVariant.BodyMd}
              fontWeight={FontWeight.Medium}
              numberOfLines={1}
              twClassName="shrink"
            >
              {token.name}
            </Text>
            <TokenListSecurityBadge caipAssetId={token.assetId} />
          </Box>
          <Text
            variant={TextVariant.BodySm}
            fontWeight={FontWeight.Medium}
            color={TextColor.TextAlternative}
            numberOfLines={1}
          >
            {token.symbol}
          </Text>
        </Box>
        <Box twClassName="ml-3 max-w-[46%] shrink items-end">
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Medium}
            numberOfLines={1}
            testID={`owned-token-fiat-${token.symbol}`}
          >
            {fiatLabel}
          </Text>
          <Text
            variant={TextVariant.BodySm}
            fontWeight={FontWeight.Medium}
            color={TextColor.TextAlternative}
            numberOfLines={1}
            testID={`owned-token-balance-${token.symbol}`}
          >
            {balanceLabel}
          </Text>
        </Box>
      </Box>
    </ListItemMultiSelect>
  );
};

export default React.memo(OwnedTokenRow);
