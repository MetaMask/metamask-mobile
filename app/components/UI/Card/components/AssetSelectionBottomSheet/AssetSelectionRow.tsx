import React, { useCallback } from 'react';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  BoxFlexDirection,
  BoxAlignItems,
  BoxJustifyContent,
  Text,
  TextVariant,
  AvatarToken,
  AvatarTokenSize,
  BadgeNetwork,
  BadgeWrapper,
  BadgeWrapperPosition,
} from '@metamask/design-system-react-native';
import ListItemSelect from '../../../../../component-library/components/List/ListItemSelect';
import { strings } from '../../../../../../locales/i18n';
import { getNetworkImageSource } from '../../../../../util/networks';
import { FundingStatus, type CardFundingToken } from '../../types';
import { getCardTokenDisplay } from '../../util/getCardTokenDisplay';
import { safeFormatChainIdToHex } from '../../util/safeFormatChainIdToHex';
import { truncateAddress } from '../../util/truncateAddress';
import { mapCaipChainIdToChainName } from '../../util/mapCaipChainIdToChainName';
import MoneyBalanceIcon from '../../../../../images/money-balance.svg';

export type AssetSelectionRowItem = CardFundingToken & {
  balance: string;
  balanceFiat: string;
  rawFiatNumber?: number;
};

export interface AssetSelectionRowProps {
  item: AssetSelectionRowItem;
  isPriority: boolean;
  onPress: (token: CardFundingToken) => void;
}

export const getFundingStatusText = (state: FundingStatus): string => {
  if (state === FundingStatus.Enabled) {
    return strings('card.asset_selection.enabled');
  }
  if (state === FundingStatus.Limited) {
    return strings('card.asset_selection.limited');
  }
  return strings('card.asset_selection.not_enabled');
};

const AssetSelectionRow: React.FC<AssetSelectionRowProps> = ({
  item,
  isPriority,
  onPress,
}) => {
  const tw = useTailwind();
  const { symbol: displaySymbol, iconSource } = getCardTokenDisplay(item);
  const titleText = item.isMoneyAccountEntry
    ? strings('card.card_spending_limit.money_account_label')
    : `${displaySymbol} on ${mapCaipChainIdToChainName(item.caipChainId)}`;

  const handlePress = useCallback(() => {
    onPress(item);
  }, [item, onPress]);

  return (
    <Box
      twClassName={
        isPriority
          ? 'border-l-4 border-primary-default bg-background-muted'
          : ''
      }
    >
      <ListItemSelect
        onPress={handlePress}
        testID={`asset-select-item-${displaySymbol}-${item.caipChainId}`}
      >
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          justifyContent={BoxJustifyContent.Between}
          twClassName="flex-1"
        >
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            twClassName="flex-1"
          >
            {item.isMoneyAccountEntry ? (
              <MoneyBalanceIcon
                style={tw.style('mr-3')}
                width={32}
                height={32}
                name="money-balance"
              />
            ) : (
              <BadgeWrapper
                style={tw.style('mr-3')}
                position={BadgeWrapperPosition.BottomRight}
                badge={
                  item.caipChainId ? (
                    <BadgeNetwork
                      src={getNetworkImageSource({
                        chainId: safeFormatChainIdToHex(
                          item.caipChainId,
                        ) as `0x${string}`,
                      })}
                    />
                  ) : null
                }
              >
                <AvatarToken
                  name={displaySymbol}
                  src={iconSource as { uri?: string } | number}
                  size={AvatarTokenSize.Md}
                />
              </BadgeWrapper>
            )}

            <Box twClassName="flex-1" justifyContent={BoxJustifyContent.Center}>
              <Text
                variant={TextVariant.BodyMd}
                style={tw.style('font-semibold')}
              >
                {titleText}
              </Text>
              <Text
                variant={TextVariant.BodySm}
                style={tw.style('font-medium text-text-alternative')}
              >
                {getFundingStatusText(item.fundingStatus)}
              </Text>
              {!item.isMoneyAccountEntry && item.walletAddress && (
                <Text
                  variant={TextVariant.BodyXs}
                  style={tw.style('font-normal text-text-alternative mt-1')}
                  numberOfLines={1}
                >
                  {truncateAddress(item.walletAddress, 6)}
                </Text>
              )}
            </Box>
          </Box>

          <Box twClassName="items-end">
            <Text
              variant={TextVariant.BodySm}
              style={tw.style('text-text-default font-medium')}
            >
              {item.balanceFiat}
            </Text>
            {!item.isMoneyAccountEntry && (
              <Text
                variant={TextVariant.BodyXs}
                style={tw.style('text-text-alternative mt-1')}
              >
                {item.balance} {displaySymbol}
              </Text>
            )}
          </Box>
        </Box>
      </ListItemSelect>
    </Box>
  );
};

export default React.memo(AssetSelectionRow);
