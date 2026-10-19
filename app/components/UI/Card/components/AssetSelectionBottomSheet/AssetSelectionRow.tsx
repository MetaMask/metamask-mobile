import React, { useCallback, useMemo } from 'react';
import {
  AvatarToken,
  AvatarTokenSize,
  BadgeNetwork,
  BadgeWrapper,
  BadgeWrapperPosition,
  Box,
  ListItemSelect,
  ListItemVariant,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
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
  const { symbol: displaySymbol, iconSource } = getCardTokenDisplay(item);
  const titleText = item.isMoneyAccountEntry
    ? strings('card.card_spending_limit.money_account_label')
    : `${displaySymbol} on ${mapCaipChainIdToChainName(item.caipChainId)}`;
  const fundingStatusText = getFundingStatusText(item.fundingStatus);
  const showWalletAddress =
    !item.isMoneyAccountEntry && Boolean(item.walletAddress);

  const handlePress = useCallback(() => {
    onPress(item);
  }, [item, onPress]);

  const avatar = useMemo(() => {
    if (item.isMoneyAccountEntry) {
      return <MoneyBalanceIcon width={32} height={32} name="money-balance" />;
    }

    return (
      <BadgeWrapper
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
    );
  }, [displaySymbol, iconSource, item.caipChainId, item.isMoneyAccountEntry]);

  const description = useMemo(() => {
    if (!showWalletAddress) {
      return fundingStatusText;
    }

    return (
      <Box>
        <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
          {fundingStatusText}
        </Text>
        <Text
          variant={TextVariant.BodyXs}
          color={TextColor.TextAlternative}
          twClassName="mt-1"
          numberOfLines={1}
        >
          {truncateAddress(item.walletAddress, 6)}
        </Text>
      </Box>
    );
  }, [fundingStatusText, item.walletAddress, showWalletAddress]);

  return (
    <ListItemSelect
      avatar={avatar}
      title={titleText}
      description={description}
      value={item.balanceFiat}
      subvalue={
        item.isMoneyAccountEntry
          ? undefined
          : `${item.balance} ${displaySymbol}`
      }
      variant={
        showWalletAddress ? ListItemVariant.MultiLine : ListItemVariant.TwoLines
      }
      isSelected={isPriority}
      showSelectedIcon={false}
      onPress={handlePress}
      testID={`asset-select-item-${displaySymbol}-${item.caipChainId}`}
      twClassName={isPriority ? 'border-l-4 border-primary-default' : undefined}
    />
  );
};

export default React.memo(AssetSelectionRow);
