import React, { useCallback, useMemo } from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import {
  BadgeWrapper,
  BadgeWrapperPosition,
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Skeleton,
  Text,
  TextColor,
  TextVariant,
  FontWeight,
} from '@metamask/design-system-react-native';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { parseCaipAccountId, Hex, type CaipChainId } from '@metamask/utils';
import type { AccountGroupObject } from '@metamask/account-tree-controller';
import { caipChainIdToHex } from '../../../../../util/caip';
import { BigNumber } from 'bignumber.js';
import { strings } from '../../../../../../locales/i18n';
import formatFiat from '../../../../../util/formatFiat';
import Badge, {
  BadgeVariant,
} from '../../../../../component-library/components/Badges/Badge';
import { AvatarSize } from '../../../../../component-library/components/Avatars/Avatar';
import { AvatarAccountType } from '../../../../../component-library/components/Avatars/Avatar/variants/AvatarAccount/AvatarAccount.types';
import { NetworkBadgeSource } from '../../../AssetOverview/Balance/Balance';
import { parseCAIP19AssetId } from '../../../Ramp/Aggregator/utils/parseCaip19AssetId';
import TrendingTokenLogo from '../../../Trending/components/TrendingTokenLogo';
import type {
  OndoGmPortfolioDto,
  OndoGmPortfolioPositionDto,
} from '../../../../../core/Engine/controllers/rewards-controller/types';
import Routes from '../../../../../constants/navigation/Routes';
import RewardsErrorBanner from '../RewardsErrorBanner';
import RewardsInfoBanner from '../RewardsInfoBanner';
import {
  groupPortfolioPositionsByAsset,
  formatPnlPercent,
  isPnlNonNegative,
} from './OndoPortfolio.utils';
import { formatComputedAt } from './OndoLeaderboard.utils';
import { selectCurrentSubscriptionAccounts } from '../../../../../selectors/rewards';
import { selectAllTokenBalances } from '../../../../../selectors/tokenBalancesController';
import { selectInternalAccountByAddresses } from '../../../../../selectors/accountsController';
import {
  selectAccountToGroupMap,
  selectResolvedSelectedAccountGroup,
} from '../../../../../selectors/multichainAccounts/accountTreeController';
import ListItemSelect from '../../../../../component-library/components/List/ListItemSelect';
import { VerticalAlignment } from '../../../../../component-library/components/List/ListItem';
import AvatarAccount from '../../../../../component-library/components/Avatars/Avatar/variants/AvatarAccount';
import { selectIconSeedAddressByAccountGroupId } from '../../../../../selectors/multichainAccounts/accounts';
import Engine from '../../../../../core/Engine';

const styles = StyleSheet.create({
  skeletonLg: { height: 128, borderRadius: 12 },
  skeletonMd: { height: 96, borderRadius: 12 },
});

export const getChainHex = (caip19: string) => {
  const parsed = parseCAIP19AssetId(caip19);
  if (!parsed || parsed.namespace !== 'eip155') return undefined;
  return caipChainIdToHex(
    `${parsed.namespace}:${parsed.chainId}` as CaipChainId,
  );
};

export const ONDO_PORTFOLIO_TEST_IDS = {
  CONTAINER: 'ondo-campaign-portfolio-container',
  LOADING: 'ondo-campaign-portfolio-loading',
  ERROR: 'ondo-campaign-portfolio-error',
  EMPTY: 'ondo-campaign-portfolio-empty',
} as const;

const formatUsd = (value: string): string => {
  try {
    return formatFiat(new BigNumber(value), 'USD');
  } catch {
    return value;
  }
};

export interface AccountPickerConfig {
  row: OndoGmPortfolioPositionDto;
  entries: { group: AccountGroupObject; balance: string }[];
}

interface AccountGroupSelectRowProps {
  group: AccountGroupObject;
  balance: string;
  tokenSymbol: string;
  isSelected: boolean;
  onPress: () => void;
}

export const AccountGroupSelectRow: React.FC<AccountGroupSelectRowProps> = ({
  group,
  balance,
  tokenSymbol,
  isSelected,
  onPress,
}) => {
  const selectEvmAddress = useMemo(
    () => selectIconSeedAddressByAccountGroupId(group.id),
    [group.id],
  );
  const evmAddress = useSelector(selectEvmAddress);

  return (
    <ListItemSelect
      isSelected={isSelected}
      isDisabled={false}
      onPress={onPress}
      verticalAlignment={VerticalAlignment.Center}
    >
      <AvatarAccount
        accountAddress={evmAddress}
        type={AvatarAccountType.Blockies}
        size={AvatarSize.Md}
      />
      <Box twClassName="flex-1 min-w-0">
        <Text
          variant={TextVariant.BodyMd}
          fontWeight={FontWeight.Medium}
          numberOfLines={1}
        >
          {group.metadata.name}
        </Text>
      </Box>
      <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
        {`${balance} ${tokenSymbol}`}
      </Text>
    </ListItemSelect>
  );
};

interface OndoPortfolioProps {
  portfolio: OndoGmPortfolioDto | null;
  isLoading: boolean;
  hasError: boolean;
  hasFetched: boolean;
  refetch: () => Promise<void>;
  campaignId: string;
  onOpenAccountPicker: (config: AccountPickerConfig) => void;
}

const OndoPortfolio: React.FC<OndoPortfolioProps> = ({
  portfolio,
  isLoading,
  hasError,
  hasFetched,
  refetch,
  campaignId,
  onOpenAccountPicker,
}) => {
  const navigation = useNavigation();

  const subscriptionAccounts = useSelector(selectCurrentSubscriptionAccounts);
  const allTokenBalances = useSelector(selectAllTokenBalances);
  const accountToGroupMap = useSelector(selectAccountToGroupMap);
  const selectedGroup = useSelector(selectResolvedSelectedAccountGroup);
  const resolveAccountsByAddresses = useSelector(
    selectInternalAccountByAddresses,
  );

  const grouped = useMemo(
    () =>
      portfolio ? groupPortfolioPositionsByAsset(portfolio.positions) : [],
    [portfolio],
  );

  /** Returns InternalAccounts from the subscription that hold a non-zero balance of the given token. */
  const getAccountsWithBalance = useCallback(
    (row: OndoGmPortfolioPositionDto) => {
      if (!subscriptionAccounts) return [];
      const parsed = parseCAIP19AssetId(row.tokenAsset);
      if (!parsed || parsed.namespace !== 'eip155') return [];
      const chainHex = caipChainIdToHex(
        `${parsed.namespace}:${parsed.chainId}` as CaipChainId,
      );
      const tokenHex = parsed.assetReference.toLowerCase() as Hex;
      const addresses = subscriptionAccounts
        .filter((a) => {
          const address = parseCaipAccountId(a.account).address;
          const bal =
            allTokenBalances?.[address.toLowerCase() as Hex]?.[chainHex]?.[
              tokenHex
            ];
          return (
            bal !== undefined && bal !== '0x0' && bal !== '0x00' && bal !== '0x'
          );
        })
        .map((a) => parseCaipAccountId(a.account).address);
      return resolveAccountsByAddresses(addresses);
    },
    [subscriptionAccounts, allTokenBalances, resolveAccountsByAddresses],
  );

  /** Returns unique AccountGroups that hold a non-zero balance of the given token. */
  const getGroupsWithBalance = useCallback(
    (row: OndoGmPortfolioPositionDto): AccountGroupObject[] => {
      const accounts = getAccountsWithBalance(row);
      const seenGroups = new Map<string, AccountGroupObject>();
      for (const account of accounts) {
        const group = accountToGroupMap[account.id];
        if (group && !seenGroups.has(group.id)) {
          seenGroups.set(group.id, group);
        }
      }
      return Array.from(seenGroups.values());
    },
    [getAccountsWithBalance, accountToGroupMap],
  );

  /** Converts an account's on-chain hex balance to a human-readable decimal string (18 decimals). */
  const getAccountBalance = useCallback(
    (address: string, row: OndoGmPortfolioPositionDto): string => {
      const parsed = parseCAIP19AssetId(row.tokenAsset);
      if (!parsed || parsed.namespace !== 'eip155') return '0';
      const chainHex = caipChainIdToHex(
        `${parsed.namespace}:${parsed.chainId}` as CaipChainId,
      );
      const tokenHex = parsed.assetReference.toLowerCase() as Hex;
      const hexBal =
        allTokenBalances?.[address.toLowerCase() as Hex]?.[chainHex]?.[
          tokenHex
        ];
      if (!hexBal) return '0';
      try {
        return new BigNumber(hexBal).shiftedBy(-18).toFixed(6);
      } catch {
        return '0';
      }
    },
    [allTokenBalances],
  );

  /** Returns the total token balance held across all accounts in the group. */
  const getGroupBalance = useCallback(
    (group: AccountGroupObject, row: OndoGmPortfolioPositionDto): string => {
      const accounts = getAccountsWithBalance(row);
      const groupAccounts = accounts.filter(
        (a) => accountToGroupMap[a.id]?.id === group.id,
      );
      let total = new BigNumber(0);
      for (const account of groupAccounts) {
        total = total.plus(
          new BigNumber(getAccountBalance(account.address, row)),
        );
      }
      return total.toFixed(6);
    },
    [getAccountsWithBalance, getAccountBalance, accountToGroupMap],
  );

  const navigateToSwap = useCallback(
    (row: OndoGmPortfolioPositionDto) => {
      navigation.navigate(
        Routes.REWARDS_ONDO_CAMPAIGN_RWA_ASSET_SELECTOR as never,
        {
          mode: 'swap',
          srcTokenAsset: row.tokenAsset,
          srcTokenSymbol: row.tokenSymbol,
          srcTokenName: row.tokenName,
          campaignId,
        },
      );
    },
    [navigation, campaignId],
  );

  const handleRowPress = useCallback(
    (row: OndoGmPortfolioPositionDto) => {
      const groupsForRow = getGroupsWithBalance(row);

      if (groupsForRow.length === 0) {
        // No group has balance — proceed directly; bridge will show correct state
        navigateToSwap(row);
        return;
      }
      if (groupsForRow.length === 1) {
        const [group] = groupsForRow;
        if (group.id !== selectedGroup?.id) {
          Engine.context.AccountTreeController.setSelectedAccountGroup(
            group.id,
          );
        }
        navigateToSwap(row);
        return;
      }

      // Multiple groups hold this token — delegate picker to parent
      onOpenAccountPicker({
        row,
        entries: groupsForRow.map((group) => ({
          group,
          balance: getGroupBalance(group, row),
        })),
      });
    },
    [
      getGroupsWithBalance,
      getGroupBalance,
      selectedGroup,
      navigateToSwap,
      onOpenAccountPicker,
    ],
  );

  const showSkeleton =
    isLoading && (!portfolio || portfolio.positions.length === 0);

  if (hasError && !portfolio) {
    return (
      <Box twClassName="gap-3" testID={ONDO_PORTFOLIO_TEST_IDS.ERROR}>
        <Text variant={TextVariant.HeadingMd}>
          {strings('rewards.ondo_campaign_portfolio.title')}
        </Text>
        <RewardsErrorBanner
          title={strings('rewards.ondo_campaign_portfolio.error_loading')}
          description={strings(
            'rewards.ondo_campaign_portfolio.error_loading_description',
          )}
          onConfirm={refetch}
          confirmButtonLabel={strings('rewards.ondo_campaign_portfolio.retry')}
        />
      </Box>
    );
  }

  if (showSkeleton) {
    return (
      <Box twClassName="gap-3" testID={ONDO_PORTFOLIO_TEST_IDS.LOADING}>
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          twClassName="mb-4 gap-2"
        >
          <Text variant={TextVariant.HeadingMd}>
            {strings('rewards.ondo_campaign_portfolio.title')}
          </Text>
        </Box>
        <Skeleton style={styles.skeletonLg} />
        <Skeleton style={styles.skeletonMd} />
        <Skeleton style={styles.skeletonMd} />
      </Box>
    );
  }

  if (hasFetched && (!portfolio || portfolio.positions.length === 0)) {
    return (
      <Box testID={ONDO_PORTFOLIO_TEST_IDS.EMPTY} twClassName="gap-3">
        <Text variant={TextVariant.HeadingMd}>
          {strings('rewards.ondo_campaign_portfolio.title')}
        </Text>
        <RewardsInfoBanner
          title={strings('rewards.ondo_campaign_portfolio.empty')}
          description={strings(
            'rewards.ondo_campaign_portfolio.empty_description',
          )}
          onConfirm={() => {
            navigation.navigate(
              Routes.REWARDS_ONDO_CAMPAIGN_RWA_ASSET_SELECTOR as never,
              { mode: 'open_position', campaignId },
            );
          }}
          confirmButtonLabel={strings(
            'rewards.ondo_campaign_portfolio.empty_cta',
          )}
        />
      </Box>
    );
  }

  if (!portfolio) {
    return null;
  }

  return (
    <Box twClassName="gap-3" testID={ONDO_PORTFOLIO_TEST_IDS.CONTAINER}>
      {/* Section header */}
      <TouchableOpacity
        onPress={
          grouped.length > 0
            ? () => {
                navigation.navigate(
                  Routes.REWARDS_ONDO_CAMPAIGN_RWA_ASSET_SELECTOR as never,
                  { mode: 'open_position', campaignId },
                );
              }
            : undefined
        }
        activeOpacity={grouped.length > 0 ? 0.7 : 1}
      >
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          twClassName="mb-4 gap-2"
        >
          <Text variant={TextVariant.HeadingMd}>
            {strings('rewards.ondo_campaign_portfolio.title')}
          </Text>
          {grouped.length > 0 && (
            <Icon
              name={IconName.ArrowRight}
              size={IconSize.Md}
              color={IconColor.IconDefault}
            />
          )}
          {portfolio.computedAt && portfolio.positions.length > 0 && (
            <Box twClassName="flex-1" alignItems={BoxAlignItems.End}>
              <Text
                variant={TextVariant.BodyXs}
                color={TextColor.TextAlternative}
              >
                {strings('rewards.ondo_campaign_portfolio.updated_at', {
                  time: formatComputedAt(portfolio.computedAt),
                })}
              </Text>
            </Box>
          )}
        </Box>
      </TouchableOpacity>

      {/* Positions */}
      <Box twClassName="gap-3">
        {grouped.map((row) => {
          const rowPnlColor = isPnlNonNegative(row.unrealizedPnlPercent)
            ? TextColor.SuccessDefault
            : TextColor.ErrorDefault;
          const rowPnlPercent = formatPnlPercent(row.unrealizedPnlPercent);
          return (
            <TouchableOpacity
              key={row.tokenAsset}
              onPress={() => {
                handleRowPress(row);
              }}
              activeOpacity={0.7}
            >
              <Box
                flexDirection={BoxFlexDirection.Row}
                alignItems={BoxAlignItems.Center}
                twClassName="gap-3"
              >
                <BadgeWrapper
                  position={BadgeWrapperPosition.BottomRight}
                  badge={
                    getChainHex(row.tokenAsset) ? (
                      <Badge
                        variant={BadgeVariant.Network}
                        size={AvatarSize.Xs}
                        isScaled={false}
                        imageSource={NetworkBadgeSource(
                          getChainHex(row.tokenAsset) as Hex,
                        )}
                      />
                    ) : null
                  }
                >
                  <TrendingTokenLogo
                    assetId={row.tokenAsset}
                    symbol={row.tokenSymbol}
                    size={36}
                  />
                </BadgeWrapper>
                <Box twClassName="flex-1">
                  <Box
                    flexDirection={BoxFlexDirection.Row}
                    justifyContent={BoxJustifyContent.Between}
                    alignItems={BoxAlignItems.Center}
                  >
                    <Text
                      variant={TextVariant.BodyMd}
                      fontWeight={FontWeight.Medium}
                    >
                      {row.tokenName}
                    </Text>
                    <Text
                      variant={TextVariant.BodyMd}
                      fontWeight={FontWeight.Medium}
                    >
                      {formatUsd(row.currentValue)}
                    </Text>
                  </Box>
                  <Box
                    flexDirection={BoxFlexDirection.Row}
                    justifyContent={BoxJustifyContent.Between}
                    alignItems={BoxAlignItems.Center}
                  >
                    <Text
                      variant={TextVariant.BodySm}
                      color={TextColor.TextAlternative}
                    >
                      {strings(
                        'rewards.ondo_campaign_portfolio.position_units',
                        {
                          units: row.units,
                        },
                      )}
                    </Text>
                    {rowPnlPercent ? (
                      <Text variant={TextVariant.BodySm} color={rowPnlColor}>
                        {rowPnlPercent}
                      </Text>
                    ) : null}
                  </Box>
                </Box>
              </Box>
            </TouchableOpacity>
          );
        })}
      </Box>
    </Box>
  );
};

export default OndoPortfolio;
