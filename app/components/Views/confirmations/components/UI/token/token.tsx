import React, { useCallback } from 'react';
import { Pressable } from 'react-native';
import {
  Box,
  Text,
  TextVariant,
  AvatarToken,
  FontWeight,
  TextColor,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { BigNumber } from 'bignumber.js';
import { KeyringAccountType } from '@metamask/keyring-api';

import I18n from '../../../../../../../locales/i18n';
import NetworkAssetLogo from '../../../../../../components/UI/NetworkAssetLogo';
import { PerpsBalanceIcon } from '../../../../../../components/UI/Perps/components/PerpsBalanceIcon';
import { AvatarSize } from '../../../../../../component-library/components/Avatars/Avatar';
import BadgeWrapper from '../../../../../../component-library/components/Badges/BadgeWrapper';
import Badge from '../../../../../../component-library/components/Badges/Badge/Badge';
import { BadgeVariant } from '../../../../../../component-library/components/Badges/Badge/Badge.types';
import { BadgePosition } from '../../../../../../component-library/components/Badges/BadgeWrapper/BadgeWrapper.types';
import { AccountTypeLabel } from '../account-type-label';
import { AssetType } from '../../../types/token';
import { formatAmount } from '../../../../../../components/UI/SimulationDetails/formatAmount';
import { ACCOUNT_TYPE_LABELS } from '../../../../../../constants/account-type-labels';

interface TokenProps {
  asset: AssetType;
  onPress: (asset: AssetType) => void;
}

export function Token({ asset, onPress }: TokenProps) {
  const tw = useTailwind();

  const handlePress = useCallback(() => {
    onPress(asset);
  }, [asset, onPress]);

  const typeLabel =
    ACCOUNT_TYPE_LABELS[asset.accountType as KeyringAccountType];

  return (
    <Pressable
      disabled={asset.disabled}
      style={({ pressed }) =>
        tw.style(
          'w-full flex-row items-center justify-between py-2 max-w-full',
          pressed || asset.isSelected ? 'bg-pressed' : 'bg-transparent',
          asset.disabled && 'opacity-50',
        )
      }
      onPress={handlePress}
    >
      <Box twClassName="flex-row items-center px-4">
        <Box twClassName="h-12 justify-center">
          <BadgeWrapper
            badgePosition={BadgePosition.BottomRight}
            badgeElement={
              asset.networkBadgeSource ? (
                <Badge
                  variant={BadgeVariant.Network}
                  name={asset.name || asset.symbol || 'Token'}
                  imageSource={asset.networkBadgeSource}
                  size={AvatarSize.Xs}
                />
              ) : undefined
            }
          >
            {asset.description === 'perps-balance' ? (
              <Box twClassName="w-10 h-10 items-center justify-center rounded-full bg-default overflow-hidden">
                <PerpsBalanceIcon size={40} />
              </Box>
            ) : asset.isNative ? (
              <NetworkAssetLogo
                big={false}
                biggest={false}
                chainId={asset.chainId as string}
                style={tw.style('w-10 h-10 rounded-full bg-default')}
                ticker={asset.symbol as string}
              />
            ) : (
              <AvatarToken
                name={asset.symbol || asset.name || 'Token'}
                src={asset.image ? { uri: asset.image } : undefined}
                style={tw.style('w-10 h-10')}
              />
            )}
          </BadgeWrapper>
        </Box>

        <Box twClassName="ml-4 h-12 justify-center">
          <Box twClassName="flex-row items-center">
            <Text
              variant={TextVariant.BodyMd}
              fontWeight={FontWeight.Medium}
              numberOfLines={1}
            >
              {asset.name || asset.symbol || 'Unknown Token'}
            </Text>
            <AccountTypeLabel label={typeLabel} />
          </Box>
          <Text
            variant={TextVariant.BodySm}
            color={TextColor.TextAlternative}
            numberOfLines={1}
          >
            {!asset.disabled || !asset.disabledMessage
              ? asset.symbol
              : asset.disabledMessage}
          </Text>
        </Box>
      </Box>
      <Box twClassName="px-4 h-12 justify-center items-end flex-1">
        <Text
          variant={TextVariant.BodyMd}
          fontWeight={FontWeight.Medium}
          numberOfLines={1}
        >
          {asset?.balanceInSelectedCurrency}
        </Text>
        <Text
          variant={TextVariant.BodySm}
          color={TextColor.TextAlternative}
          numberOfLines={1}
        >
          {formatAmount(I18n.locale, new BigNumber(asset.balance || '0'))}{' '}
          {asset.symbol}
        </Text>
      </Box>
    </Pressable>
  );
}
