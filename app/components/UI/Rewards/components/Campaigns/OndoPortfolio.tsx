import React, { useCallback, useMemo } from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import {
  BadgeWrapper,
  BadgeWrapperPosition,
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
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
import { BigNumber } from 'bignumber.js';
import { strings } from '../../../../../../locales/i18n';
import {
  formatUsd,
  parseCaip19,
  caipChainIdToHex,
} from '../../utils/formatUtils';
import Badge, {
  BadgeVariant,
} from '../../../../../component-library/components/Badges/Badge';
import { AvatarSize } from '../../../../../component-library/components/Avatars/Avatar';
import { AvatarAccountType } from '../../../../../component-library/components/Avatars/Avatar/variants/AvatarAccount/AvatarAccount.types';
import { NetworkBadgeSource } from '../../../AssetOverview/Balance/Balance';
import TrendingTokenLogo from '../../../Trending/components/TrendingTokenLogo';
import type {
  OndoGmPortfolioDto,
  OndoGmPortfolioPositionDto,
} from '../../../../../core/Engine/controllers/rewards-controller/types';
import Routes from '../../../../../constants/navigation/Routes';
import RewardsErrorBanner from '../RewardsErrorBanner';
import {
  groupPortfolioPositionsByAsset,
  formatPnlPercent,
  isPnlNonNegative,
  sanitizeOndoTokenName,
} from './OndoPortfolio.utils';
import { selectCurrentSubscriptionAccounts } from '../../../../../selectors/rewards';
import { selectAllTokenBalances } from '../../../../../selectors/tokenBalancesController';
import { selectAllTokens } from '../../../../../selectors/tokensController';
import { selectInternalAccountByAddresses } from '../../../../../selectors/accountsController';
import { selectAccountToGroupMap } from '../../../../../selectors/multichainAccounts/accountTreeController';
import ListItemSelect from '../../../../../component-library/components/List/ListItemSelect';
import { VerticalAlignment } from '../../../../../component-library/components/List/ListItem';
import AvatarAccount from '../../../../../component-library/components/Avatars/Avatar/variants/AvatarAccount';
import { selectIconSeedAddressByAccountGroupId } from '../../../../../selectors/multichainAccounts/accounts';
import RewardsNoPositionsImage from '../../../../../images/rewards/rewards-no-positions.svg';

const styles = StyleSheet.create({
  skeletonLg: { height: 128, borderRadius: 12 },
  skeletonMd: { height: 96, borderRadius: 12 },
});

export const getChainHex = (caip19: string) => {
  const parsed = parseCaip19(caip19);
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

export interface AccountPickerConfig {
  row: OndoGmPortfolioPositionDto;
  entries: { group: AccountGroupObject; balance: string }[];
  tokenDecimals: number;
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
  refetch: () => Promise<void>;
  campaignId: string;
  onOpenAccountPicker: (config: AccountPickerConfig) => void;
  isCampaignComplete?: boolean;
  notEligibleForCampaign?: boolean;
  onNotEligible?: (confirmAction: () => void) => void;
}

const OndoPortfolio: React.FC<OndoPortfolioProps> = ({
  portfolio,
  isLoading,
  hasError,
  refetch,
  campaignId,
  onOpenAccountPicker,
  isCampaignComplete = false,
  notEligibleForCampaign = false,
  onNotEligible,
}) => {
  const navigation = useNavigation();

  const subscriptionAccounts = useSelector(selectCurrentSubscriptionAccounts);
  const allTokenBalances = useSelector(selectAllTokenBalances);
  const allTokens = useSelector(selectAllTokens);
  const accountToGroupMap = useSelector(selectAccountToGroupMap);
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
      const parsed = parseCaip19(row.tokenAsset);
      if (!parsed || parsed.namespace !== 'eip155') return [];
      const chainHex = caipChainIdToHex(
        `${parsed.namespace}:${parsed.chainId}` as CaipChainId,
      );
      const tokenHex = parsed.assetReference.toLowerCase() as Hex;
      const addresses = subscriptionAccounts.flatMap((a) => {
        const address = parseCaipAccountId(a.account).address;
        const chainBalances =
          allTokenBalances?.[address.toLowerCase() as Hex]?.[chainHex];
        const balEntry = chainBalances
          ? Object.entries(chainBalances).find(
              ([key]) => key.toLowerCase() === tokenHex,
            )
          : undefined;
        const bal = balEntry?.[1];
        return bal !== undefined && !!parseInt(bal, 16) ? [address] : [];
      });
      return resolveAccountsByAddresses(addresses);
    },
    [subscriptionAccounts, allTokenBalances, resolveAccountsByAddresses],
  );

  /** Returns unique AccountGroups from a pre-computed list of accounts. */
  const getGroupsFromAccounts = useCallback(
    (
      accounts: ReturnType<typeof resolveAccountsByAddresses>,
    ): AccountGroupObject[] => {
      const seenGroups = new Map<string, AccountGroupObject>();
      for (const account of accounts) {
        const group = accountToGroupMap[account.id];
        if (group && !seenGroups.has(group.id)) {
          seenGroups.set(group.id, group);
        }
      }
      return Array.from(seenGroups.values());
    },
    [accountToGroupMap],
  );

  const resolveTokenDecimals = useCallback(
    (row: OndoGmPortfolioPositionDto): number => {
      const parsed = parseCaip19(row.tokenAsset);
      if (!parsed || parsed.namespace !== 'eip155') return 18;
      const chainHex = caipChainIdToHex(
        `${parsed.namespace}:${parsed.chainId}` as CaipChainId,
      );
      const tokenHex = parsed.assetReference.toLowerCase() as Hex;
      const trackedDecimals = Object.values(allTokens[chainHex] ?? {})
        .flat()
        .find((t) => t.address.toLowerCase() === tokenHex)?.decimals;
      return trackedDecimals ?? 18;
    },
    [allTokens],
  );

  /** Returns the total token balance held across all accounts in the group, summed from raw hex values. */
  const getGroupBalance = useCallback(
    (
      group: AccountGroupObject,
      accounts: ReturnType<typeof resolveAccountsByAddresses>,
      row: OndoGmPortfolioPositionDto,
      decimals: number,
    ): string => {
      const parsed = parseCaip19(row.tokenAsset);
      if (!parsed || parsed.namespace !== 'eip155') return '0';
      const chainHex = caipChainIdToHex(
        `${parsed.namespace}:${parsed.chainId}` as CaipChainId,
      );
      const tokenHex = parsed.assetReference.toLowerCase() as Hex;
      const groupAccounts = accounts.filter(
        (a) => accountToGroupMap[a.id]?.id === group.id,
      );
      let total = new BigNumber(0);
      for (const account of groupAccounts) {
        const chainBalances =
          allTokenBalances?.[account.address.toLowerCase() as Hex]?.[chainHex];
        const hexBal = chainBalances
          ? Object.entries(chainBalances).find(
              ([key]) => key.toLowerCase() === tokenHex,
            )?.[1]
          : undefined;
        if (hexBal) {
          try {
            total = total.plus(new BigNumber(hexBal).shiftedBy(-decimals));
          } catch {
            // ignore malformed balance
          }
        }
      }
      return total.toFixed(6);
    },
    [accountToGroupMap, allTokenBalances],
  );

  const navigateToSwap = useCallback(
    (row: OndoGmPortfolioPositionDto) => {
      navigation.navigate(Routes.REWARDS_ONDO_CAMPAIGN_RWA_ASSET_SELECTOR, {
        mode: 'swap',
        srcTokenAsset: row.tokenAsset,
        srcTokenSymbol: row.tokenSymbol,
        srcTokenName: row.tokenName,
        srcTokenDecimals: resolveTokenDecimals(row),
        campaignId,
      });
    },
    [navigation, campaignId, resolveTokenDecimals],
  );

  const handleRowPress = useCallback(
    (row: OndoGmPortfolioPositionDto) => {
      if (notEligibleForCampaign) {
        onNotEligible?.(() => navigateToSwap(row));
        return;
      }

      const accountsForRow = getAccountsWithBalance(row);
      const groupsForRow = getGroupsFromAccounts(accountsForRow);

      if (groupsForRow.length === 0) {
        // No group has balance — proceed directly; bridge will show correct state
        navigateToSwap(row);
        return;
      }

      // Another group or group(s) hold this token — delegate picker to parent
      const decimals = resolveTokenDecimals(row);
      onOpenAccountPicker({
        row,
        entries: groupsForRow.map((group) => ({
          group,
          balance: getGroupBalance(group, accountsForRow, row, decimals),
        })),
        tokenDecimals: decimals,
      });
    },
    [
      notEligibleForCampaign,
      onNotEligible,
      navigateToSwap,
      getAccountsWithBalance,
      getGroupsFromAccounts,
      getGroupBalance,
      onOpenAccountPicker,
      resolveTokenDecimals,
    ],
  );

  const showSkeleton =
    isLoading && (!portfolio || portfolio.positions.length === 0);

  if (hasError && !portfolio) {
    return (
      <Box twClassName="gap-3" testID={ONDO_PORTFOLIO_TEST_IDS.ERROR}>
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
        <Skeleton style={styles.skeletonLg} />
        <Skeleton style={styles.skeletonMd} />
        <Skeleton style={styles.skeletonMd} />
      </Box>
    );
  }

  if (
    !isLoading &&
    !hasError &&
    (!portfolio || portfolio.positions.length === 0)
  ) {
    return (
      <Box
        testID={ONDO_PORTFOLIO_TEST_IDS.EMPTY}
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Center}
        twClassName="py-6 gap-3"
      >
        <RewardsNoPositionsImage
          name="rewards-no-positions"
          width={80}
          height={80}
        />
        <Text
          variant={TextVariant.BodyMd}
          color={TextColor.TextAlternative}
          twClassName="text-center"
        >
          {strings('rewards.ondo_campaign_portfolio.empty')}
        </Text>
        {!isCampaignComplete && (
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Bold}
            twClassName="text-center"
            onPress={() => {
              navigation.navigate(
                Routes.REWARDS_ONDO_CAMPAIGN_RWA_ASSET_SELECTOR,
                { mode: 'open_position', campaignId },
              );
            }}
          >
            {strings('rewards.ondo_campaign_portfolio.empty_cta')}
          </Text>
        )}
      </Box>
    );
  }

  if (!portfolio) {
    return null;
  }

  return (
    <Box twClassName="gap-3" testID={ONDO_PORTFOLIO_TEST_IDS.CONTAINER}>
      {/* Positions */}
      <Box twClassName="gap-3">
        {grouped.map((row) => {
          const rowPnlColor = isPnlNonNegative(row.unrealizedPnlPercent)
            ? TextColor.SuccessDefault
            : TextColor.ErrorDefault;
          const rowPnlPercent = formatPnlPercent(row.unrealizedPnlPercent);
          const rowChainHex = getChainHex(row.tokenAsset);
          return (
            <TouchableOpacity
              key={row.tokenAsset}
              onPress={
                isCampaignComplete ? undefined : () => handleRowPress(row)
              }
              activeOpacity={isCampaignComplete ? 1 : 0.7}
            >
              <Box
                flexDirection={BoxFlexDirection.Row}
                alignItems={BoxAlignItems.Center}
                twClassName="gap-3"
              >
                <BadgeWrapper
                  position={BadgeWrapperPosition.BottomRight}
                  badge={
                    rowChainHex ? (
                      <Badge
                        variant={BadgeVariant.Network}
                        size={AvatarSize.Xs}
                        isScaled={false}
                        imageSource={NetworkBadgeSource(rowChainHex)}
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
                      {sanitizeOndoTokenName(row.tokenName)}
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
