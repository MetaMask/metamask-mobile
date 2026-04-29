import React, { useMemo } from 'react';
import { Hex } from '@metamask/utils';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import {
  AvatarToken,
  AvatarTokenSize,
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import I18n, { strings } from '../../../../../../locales/i18n';
import BadgeWrapper, {
  BadgePosition,
} from '../../../../../component-library/components/Badges/BadgeWrapper';
import Badge, {
  BadgeVariant,
} from '../../../../../component-library/components/Badges/Badge';
import { NetworkBadgeSource } from '../../../AssetOverview/Balance/Balance';
import { MUSD_TOKEN } from '../../../Earn/constants/musd';
import { useMusdBalance } from '../../../Earn/hooks/useMusdBalance';
import { getIntlNumberFormatter } from '../../../../../util/intl';
import type { ImageOrSvgSrc } from '@metamask/design-system-react-native/dist/components/temp-components/ImageOrSvg/ImageOrSvg.types.d.cts';
import { MoneyBalanceListTestIds } from './MoneyBalanceList.testIds';

const SUPPORTED_MUSD_CHAIN_IDS: readonly Hex[] = [
  CHAIN_IDS.MAINNET,
  CHAIN_IDS.LINEA_MAINNET,
] as const;

interface MoneyBalanceListProps {
  /**
   * When true, renders one zero-balance row per supported chain even if the
   * user holds no mUSD on any chain. When false, falls back to a single
   * zero-balance row without a network badge.
   */
  isReturningUser?: boolean;
}

const formatTokenAmount = (tokenBalance: string | undefined): string => {
  const value = Number(tokenBalance ?? 0);
  return `${getIntlNumberFormatter(I18n.locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value)} ${MUSD_TOKEN.symbol}`;
};

const formatZeroFiat = (): string =>
  getIntlNumberFormatter(I18n.locale, {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(0);

interface MoneyBalanceRowProps {
  chainId?: Hex;
  fiatFormatted: string;
  tokenFormatted: string;
}

const MoneyBalanceRow = ({
  chainId,
  fiatFormatted,
  tokenFormatted,
}: MoneyBalanceRowProps) => {
  const networkBadgeSource = useMemo(
    () => (chainId ? NetworkBadgeSource(chainId) : null),
    [chainId],
  );

  const avatar = (
    <AvatarToken
      name={MUSD_TOKEN.symbol}
      src={MUSD_TOKEN.imageSource as ImageOrSvgSrc}
      size={AvatarTokenSize.Md}
    />
  );

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      twClassName="px-4 py-3 gap-4"
      testID={MoneyBalanceListTestIds.ROW}
    >
      {networkBadgeSource ? (
        <BadgeWrapper
          badgePosition={BadgePosition.BottomRight}
          badgeElement={
            <Badge
              variant={BadgeVariant.Network}
              imageSource={networkBadgeSource}
            />
          }
        >
          {avatar}
        </BadgeWrapper>
      ) : (
        avatar
      )}
      <Box twClassName="flex-1">
        <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
          {MUSD_TOKEN.name}
        </Text>
      </Box>
      <Box alignItems={BoxAlignItems.End}>
        <Text
          variant={TextVariant.BodyMd}
          fontWeight={FontWeight.Medium}
          testID={MoneyBalanceListTestIds.ROW_FIAT}
        >
          {fiatFormatted}
        </Text>
        <Text
          variant={TextVariant.BodySm}
          color={TextColor.TextAlternative}
          testID={MoneyBalanceListTestIds.ROW_TOKEN}
        >
          {tokenFormatted}
        </Text>
      </Box>
    </Box>
  );
};

const MoneyBalanceList = ({
  isReturningUser = false,
}: MoneyBalanceListProps) => {
  const {
    hasMusdBalanceOnAnyChain,
    hasMusdBalanceOnChain,
    tokenBalanceByChain,
    fiatBalanceFormattedByChain,
  } = useMusdBalance();

  const rows: { chainId?: Hex; fiat: string; token: string }[] = useMemo(() => {
    if (hasMusdBalanceOnAnyChain) {
      return SUPPORTED_MUSD_CHAIN_IDS.filter((chainId) =>
        hasMusdBalanceOnChain(chainId),
      ).map((chainId) => ({
        chainId,
        fiat: fiatBalanceFormattedByChain[chainId] ?? formatZeroFiat(),
        token: formatTokenAmount(tokenBalanceByChain[chainId]),
      }));
    }
    if (isReturningUser) {
      return SUPPORTED_MUSD_CHAIN_IDS.map((chainId) => ({
        chainId,
        fiat: formatZeroFiat(),
        token: formatTokenAmount('0'),
      }));
    }
    return [{ fiat: formatZeroFiat(), token: formatTokenAmount('0') }];
  }, [
    hasMusdBalanceOnAnyChain,
    hasMusdBalanceOnChain,
    tokenBalanceByChain,
    fiatBalanceFormattedByChain,
    isReturningUser,
  ]);

  return (
    <Box testID={MoneyBalanceListTestIds.CONTAINER}>
      <Box
        flexDirection={BoxFlexDirection.Row}
        justifyContent={BoxJustifyContent.Between}
        alignItems={BoxAlignItems.Center}
        twClassName="px-4 pb-2"
      >
        <Text
          variant={TextVariant.HeadingMd}
          fontWeight={FontWeight.Bold}
          testID={MoneyBalanceListTestIds.TITLE}
        >
          {strings('money.balance_list.title')}
        </Text>
      </Box>
      {rows.map((row, index) => (
        <MoneyBalanceRow
          key={row.chainId ?? `zero-${index}`}
          chainId={row.chainId}
          fiatFormatted={row.fiat}
          tokenFormatted={row.token}
        />
      ))}
    </Box>
  );
};

export default MoneyBalanceList;
