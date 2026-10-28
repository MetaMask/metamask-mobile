import React, { useMemo } from 'react';
import { Pressable } from 'react-native';
import { useSelector } from 'react-redux';
import { toHex } from '@metamask/controller-utils';
import {
  BadgeNetwork,
  BadgeWrapper,
  BadgeWrapperPosition,
  Box,
  Checkbox,
  FontWeight,
  SensitiveText,
  SensitiveTextLength,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import type { CaipAssetType, Hex } from '@metamask/utils';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import AssetLogo from '../../../../UI/Assets/components/AssetLogo/AssetLogo';
import { NetworkBadgeSource } from '../../../../UI/AssetOverview/Balance/Balance';
import { createCaipAssetImageUrl } from '../../../../UI/TokenDetails/components/useAssetVisibility';
import TokenListSecurityBadge from '../../../../UI/Tokens/components/TokenListSecurityBadge/TokenListSecurityBadge';
import { selectTokenListSecurityBadgesEnabled } from '../../../../../selectors/featureFlagController/tokenListSecurityBadges';
import { selectBasicFunctionalityEnabled } from '../../../../../selectors/settings';
import { selectPrivacyMode } from '../../../../../selectors/preferencesController';
import { selectCurrentCurrency } from '../../../../../selectors/currencyRateController';
import { strings } from '../../../../../../locales/i18n';
import {
  formatOwnedTokenAmount,
  formatOwnedTokenFiat,
} from './model/formatOwnedToken';
import type { ClassifiedHolding } from './model/types';
import { ownedTokenRowTestId } from './OwnedTokens.testIds';

interface OwnedTokenRowProps {
  row: ClassifiedHolding;
  isSelected: boolean;
  onToggle: (row: ClassifiedHolding) => void;
}

const OwnedTokenRow = ({ row, isSelected, onToggle }: OwnedTokenRowProps) => {
  const tw = useTailwind();
  const privacyMode = useSelector(selectPrivacyMode);
  const currency = useSelector(selectCurrentCurrency);
  const basicFunctionalityEnabled = useSelector(
    selectBasicFunctionalityEnabled,
  );
  const securityBadgesEnabled = useSelector(
    selectTokenListSecurityBadgesEnabled,
  );
  const showSecurityBadge = basicFunctionalityEnabled && securityBadgesEnabled;

  const amountLabel = `${formatOwnedTokenAmount(row.readableAmount, row.chainId)} ${row.symbol}`;
  const fiatLabel = formatOwnedTokenFiat(row.fiatValue, currency || 'usd');
  const categoryLabel = strings(
    row.category === 'hidden'
      ? 'add_asset.owned_tokens.category_hidden'
      : 'add_asset.owned_tokens.category_undetected',
  );
  const spamLabel =
    row.spamTier === 'malicious'
      ? strings('add_asset.owned_tokens.spam_malicious')
      : row.spamTier === 'warning'
        ? strings('add_asset.owned_tokens.spam_warning')
        : '';

  const networkBadgeSource = useMemo(() => {
    if (row.chainId.startsWith('eip155:')) {
      const reference = row.chainId.slice('eip155:'.length);
      return NetworkBadgeSource(toHex(reference) as Hex);
    }
    return NetworkBadgeSource(row.chainId as Hex);
  }, [row.chainId]);

  const logoAsset = useMemo(
    () => ({
      address: row.assetReference,
      symbol: row.symbol,
      name: row.name,
      decimals: row.decimals,
      image: row.chainId.startsWith('eip155:')
        ? createCaipAssetImageUrl(row.comparableKey as CaipAssetType)
        : '',
      logo: undefined,
      isETH: false,
      isNative: false,
      chainId: row.chainId,
    }),
    [row],
  );

  const accessibilityLabel = [
    row.name,
    row.symbol,
    fiatLabel,
    amountLabel,
    categoryLabel,
    spamLabel,
    row.siblingCount > 1 ? row.accountName : '',
    isSelected
      ? strings('add_asset.owned_tokens.selected')
      : strings('add_asset.owned_tokens.not_selected'),
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{
        checked: isSelected,
        disabled: !row.selectable,
      }}
      accessibilityLabel={accessibilityLabel}
      disabled={!row.selectable}
      onPress={() => onToggle(row)}
      testID={ownedTokenRowTestId(row.rowKey)}
      style={tw.style('min-h-[44px] flex-row items-center px-4 py-3')}
    >
      <Checkbox
        isSelected={isSelected}
        isDisabled={!row.selectable}
        onChange={() => onToggle(row)}
        twClassName="mr-3"
      />
      <BadgeWrapper
        position={BadgeWrapperPosition.BottomRight}
        badge={
          networkBadgeSource ? (
            <BadgeNetwork src={networkBadgeSource} twClassName="h-4 w-4" />
          ) : undefined
        }
      >
        <AssetLogo asset={logoAsset} />
      </BadgeWrapper>
      <Box twClassName="ml-3 min-w-0 flex-1">
        <Box twClassName="flex-row items-center gap-2">
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Medium}
            numberOfLines={1}
          >
            {row.name || row.symbol}
          </Text>
          {showSecurityBadge ? (
            <TokenListSecurityBadge
              caipAssetId={row.comparableKey as CaipAssetType}
            />
          ) : null}
        </Box>
        <Text
          variant={TextVariant.BodySm}
          fontWeight={FontWeight.Medium}
          color={TextColor.TextAlternative}
          numberOfLines={1}
        >
          {row.symbol}
          {' · '}
          {categoryLabel}
          {spamLabel ? ` · ${spamLabel}` : ''}
        </Text>
        {row.siblingCount > 1 ? (
          <Text
            variant={TextVariant.BodySm}
            color={TextColor.TextAlternative}
            numberOfLines={1}
          >
            {strings('add_asset.owned_tokens.held_by', {
              name: row.accountName,
            })}
          </Text>
        ) : null}
      </Box>
      <Box twClassName="ml-3 shrink items-end">
        <SensitiveText
          variant={TextVariant.BodyMd}
          fontWeight={FontWeight.Medium}
          isHidden={privacyMode}
          length={SensitiveTextLength.Medium}
        >
          {fiatLabel}
        </SensitiveText>
        <SensitiveText
          variant={TextVariant.BodySm}
          fontWeight={FontWeight.Medium}
          color={TextColor.TextAlternative}
          isHidden={privacyMode}
          length={SensitiveTextLength.Short}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {amountLabel}
        </SensitiveText>
      </Box>
    </Pressable>
  );
};

export default React.memo(OwnedTokenRow);
