import React, { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { Box, BoxFlexDirection } from '@metamask/design-system-react-native';
import type { CaipAssetType, Hex } from '@metamask/utils';
import { strings } from '../../../../../../locales/i18n';
import type { RootState } from '../../../../../reducers';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import { selectSelectedInternalAccount } from '../../../../../selectors/accountsController';
import { selectEvmNetworkConfigurationsByChainId } from '../../../../../selectors/networkController';
import { selectBridgeHistoryForAccount } from '../../../../../selectors/bridgeStatusController';
import { selectAllTokens } from '../../../../../selectors/tokensController';
import { selectSelectedAccountGroupEvmInternalAccount } from '../../../../../selectors/multichainAccounts/accountTreeController';
import {
  getGroupedActivityListItemKey,
  groupActivityListItems,
} from '../../../../../util/activity-adapters';
import ActivityListDateHeader from '../../../ActivityListItemRow/ActivityListDateHeader';
import AssetDetailsActivityListItem from '../../../Transactions/AssetDetailsActivityListItem';
import { mapTransactionToActivityItem } from '../../../Transactions/AssetDetailsActivityListItem.utils';
import { filterDuplicateOutgoingTransactions } from '../../../Transactions/utils';
import ActivityHeader from '../../../../Views/Asset/ActivityHeader';
import { useUnifiedTxActions } from '../../../../Views/ActivityList/useUnifiedTxActions';
import { CancelSpeedupModal } from '../../../../Views/confirmations/components/modals/cancel-speedup-modal';
import ContentDisplay from '../../../AssetOverview/AboutAsset/ContentDisplay';
import Balance from '../../../AssetOverview/Balance';
import TokenDetailsSection from '../../../AssetOverview/TokenDetails';
import type { TokenSecurityData } from '@metamask/assets-controllers';
import { useTokenBalance } from '../../hooks/useTokenBalance';
import { useTokenPerformance } from '../../hooks/useTokenPerformance';
import { useTokenDetailsActionTracking } from '../../hooks/useTokenDetailsActionTracking';
import { useTokenTransactions } from '../../hooks/useTokenTransactions';
import {
  TokenDetailsAction,
  type TokenDetailsRouteParams,
} from '../../constants/constants';
import {
  MARKET_INSIGHTS_MIN_TOKEN_AGE_DAYS,
  default as TokenDetailsMarketInsightsSection,
} from '../sections/TokenDetailsMarketInsightsSection';
import PerformanceSection from '../sections/PerformanceSection';

export const OVERVIEW_TAB_TEST_ID = 'token-details-overview-tab';
export const OVERVIEW_TAB_DESCRIPTION_TEST_ID =
  'token-details-overview-tab-description';
export const OVERVIEW_TAB_BALANCE_TEST_ID =
  'token-details-overview-tab-balance';
export const OVERVIEW_TAB_TOKEN_DETAILS_TEST_ID =
  'token-details-overview-tab-token-details';
export const OVERVIEW_TAB_ACTIVITY_TEST_ID =
  'token-details-overview-tab-activity';

/**
 * TODO(ASSETS-4020): replace with the token's real description once the API
 * platform exposes it. Delete the `?? MOCK_TOKEN_DESCRIPTION` fallback in
 * the component to restore the pure hide-when-absent gate, or set this to
 * `undefined` to preview the hidden state in the simulator.
 */
const MOCK_TOKEN_DESCRIPTION: string | undefined =
  'Pepe is a deflationary memecoin launched on Ethereum in 2023 as a tribute to the Pepe the Frog internet character. There is no formal team or roadmap — the token is entirely community-driven.';

export interface OverviewTabProps {
  token: TokenDetailsRouteParams;
  assetId: CaipAssetType | null;
  currentCurrency: string;
  securityData?: TokenSecurityData | null;
}

const OverviewTab = ({
  token,
  assetId,
  currentCurrency,
  securityData,
}: OverviewTabProps) => {
  const navigation = useNavigation<AppNavigationProp>();
  const chainId = token.chainId as Hex | undefined;
  const assetSymbol = token.symbol ?? '';

  const description = token.description ?? MOCK_TOKEN_DESCRIPTION;

  const performance = useTokenPerformance({
    token,
    assetId,
    currentCurrency,
  });

  const { balance, fiatBalance, tokenFormattedBalance } =
    useTokenBalance(token);

  const hasBalanceValue = Boolean(balance) && balance !== '0';
  const trackActionTapped = useTokenDetailsActionTracking({
    token,
    hasBalance: hasBalanceValue,
    severity: securityData?.resultType,
  });

  const {
    transactions,
    submittedTxs,
    confirmedTxs,
    loading: isActivityLoading,
    isNonEvmAsset,
  } = useTokenTransactions(token);

  const {
    speedUpIsOpen,
    cancelIsOpen,
    confirmDisabled,
    existingTx,
    onSpeedUpAction,
    onCancelAction,
    onSpeedUpCancelCompleted,
    speedUpTransaction,
    cancelTransaction,
  } = useUnifiedTxActions();

  const accountImportTime = useSelector(
    (state: RootState) =>
      selectSelectedInternalAccount(state)?.metadata.importTime,
  );
  const groupEvmAccountAddress = useSelector(
    (state: RootState) =>
      selectSelectedAccountGroupEvmInternalAccount(state)?.address,
  );
  const networkConfigurationsByChainId = useSelector(
    selectEvmNetworkConfigurationsByChainId,
  );
  const allTokens = useSelector(selectAllTokens);
  const bridgeHistory = useSelector(selectBridgeHistoryForAccount);

  const {
    groupedItems: activityGroupedItems,
    transactionByActivityItem: activityItemToTransaction,
  } = useMemo(() => {
    if (isNonEvmAsset) {
      return {
        groupedItems: [],
        transactionByActivityItem: new Map(),
      };
    }

    const listTransactions =
      submittedTxs.length > 0
        ? [...submittedTxs].sort((a, b) => b.time - a.time).concat(confirmedTxs)
        : transactions;
    const filteredTransactions =
      filterDuplicateOutgoingTransactions(listTransactions);

    const transactionByActivityItem = new Map();
    const groupedItems = groupActivityListItems(
      filteredTransactions.map((transaction) => {
        const activityItem = mapTransactionToActivityItem({
          transaction,
          assetSymbol,
          currentChainId: chainId,
          tokenChainId: chainId,
        });
        transactionByActivityItem.set(activityItem, transaction);
        return activityItem;
      }),
    );

    return { groupedItems, transactionByActivityItem };
  }, [
    isNonEvmAsset,
    submittedTxs,
    confirmedTxs,
    transactions,
    assetSymbol,
    chainId,
  ]);

  const hasActivity = activityGroupedItems.length > 0;
  // Same header gate as the legacy Token Details view: the activity section
  // shows while transactions are still loading or once any are listed.
  const showActivitySection = isActivityLoading || hasActivity;

  return (
    <Box
      flexDirection={BoxFlexDirection.Column}
      twClassName="gap-7 pt-5 pb-6"
      testID={OVERVIEW_TAB_TEST_ID}
    >
      {description ? (
        <Box testID={OVERVIEW_TAB_DESCRIPTION_TEST_ID} twClassName="px-4">
          <ContentDisplay content={description} />
        </Box>
      ) : null}

      <Box twClassName="px-4">
        <PerformanceSection performance={performance} />
      </Box>

      {balance != null ? (
        <Box testID={OVERVIEW_TAB_BALANCE_TEST_ID}>
          <Balance
            asset={token}
            mainBalance={fiatBalance ?? ''}
            secondaryBalance={tokenFormattedBalance}
          />
        </Box>
      ) : null}

      <Box testID={OVERVIEW_TAB_TOKEN_DETAILS_TEST_ID} twClassName="px-4">
        <TokenDetailsSection
          asset={token}
          onCopyAddress={() =>
            trackActionTapped(TokenDetailsAction.CopyTokenAddress)
          }
        />
      </Box>

      <TokenDetailsMarketInsightsSection
        token={token}
        assetId={assetId}
        securityData={securityData ?? null}
        pricePercentChange={performance.twentyFourHour ?? 0}
        minTokenAgeDays={MARKET_INSIGHTS_MIN_TOKEN_AGE_DAYS}
      />

      {showActivitySection ? (
        <Box testID={OVERVIEW_TAB_ACTIVITY_TEST_ID}>
          <ActivityHeader
            asset={{
              ...token,
              hasBalanceError: token.hasBalanceError ?? false,
            }}
          />
          {activityGroupedItems.map((item, index) => {
            if (item.type === 'pending-header') {
              return (
                <ActivityListDateHeader
                  key="pending-header"
                  label={strings('transaction.pending')}
                />
              );
            }
            if (item.type === 'date-header') {
              return (
                <ActivityListDateHeader
                  key={`date-header-${item.date}`}
                  timestamp={item.date}
                />
              );
            }
            const transaction = activityItemToTransaction.get(item.item);
            if (!transaction) {
              return null;
            }
            return (
              <AssetDetailsActivityListItem
                key={getGroupedActivityListItemKey(item, index)}
                transaction={transaction}
                index={index}
                assetSymbol={assetSymbol}
                chainId={chainId}
                tokenChainId={chainId}
                navigation={navigation}
                accountImportTime={accountImportTime}
                groupEvmAccountAddress={groupEvmAccountAddress}
                networkConfigurations={networkConfigurationsByChainId}
                allTokens={allTokens}
                bridgeHistory={bridgeHistory}
                onSpeedUpAction={onSpeedUpAction}
                onCancelAction={onCancelAction}
              />
            );
          })}
        </Box>
      ) : null}

      {existingTx ? (
        <CancelSpeedupModal
          isVisible={speedUpIsOpen || cancelIsOpen}
          isCancel={cancelIsOpen}
          tx={existingTx}
          onConfirm={cancelIsOpen ? cancelTransaction : speedUpTransaction}
          onClose={onSpeedUpCancelCompleted}
          confirmDisabled={confirmDisabled}
        />
      ) : null}
    </Box>
  );
};

OverviewTab.displayName = 'OverviewTab';

export default OverviewTab;
