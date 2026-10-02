import React, { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import {
  Box,
  BoxFlexDirection,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import type { CaipAssetType, Hex } from '@metamask/utils';
import { strings } from '../../../../../locales/i18n';
import type { RootState } from '../../../../reducers';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import { selectSelectedInternalAccount } from '../../../../selectors/accountsController';
import { selectEvmNetworkConfigurationsByChainId } from '../../../../selectors/networkController';
import { selectBridgeHistoryForAccount } from '../../../../selectors/bridgeStatusController';
import { selectAllTokens } from '../../../../selectors/tokensController';
import { selectSelectedAccountGroupEvmInternalAccount } from '../../../../selectors/multichainAccounts/accountTreeController';
import {
  getGroupedActivityListItemKey,
  groupActivityListItems,
} from '../../../../util/activity-adapters';
import ActivityListDateHeader from '../../ActivityListItemRow/ActivityListDateHeader';
import AssetDetailsActivityListItem from '../../Transactions/AssetDetailsActivityListItem';
import { mapTransactionToActivityItem } from '../../Transactions/AssetDetailsActivityListItem.utils';
import { filterDuplicateOutgoingTransactions } from '../../Transactions/utils';
import ContentDisplay from '../../AssetOverview/AboutAsset/ContentDisplay';
import { useTokenPerformance } from '../hooks/useTokenPerformance';
import { useTokenTransactions } from '../hooks/useTokenTransactions';
import type { TokenDetailsRouteParams } from '../constants/constants';
import TokenDetailsV1Performance from './TokenDetailsV1Performance';

export const TOKEN_DETAILS_V1_OVERVIEW_TEST_ID = 'token-details-v1-overview';
export const TOKEN_DETAILS_V1_DESCRIPTION_TEST_ID =
  'token-details-v1-description';
export const TOKEN_DETAILS_V1_ACTIVITY_TEST_ID = 'token-details-v1-activity';

export interface TokenDetailsV1OverviewProps {
  token: TokenDetailsRouteParams;
  /** CAIP-19 asset id used for the Performance candle lookups. */
  assetId: CaipAssetType | null;
  currentCurrency: string;
}

/**
 * Overview tab content on the V1 (meme) Token Details view.
 *
 * Sections (top → bottom): optional token description (hidden when absent),
 * Performance (5m / 1h / 4h / 24h) and the token's activity — grouped with the
 * same adapters and rows as the legacy Token Details activity list ("as is").
 */
const TokenDetailsV1Overview = ({
  token,
  assetId,
  currentCurrency,
}: TokenDetailsV1OverviewProps) => {
  const navigation = useNavigation<AppNavigationProp>();
  const chainId = token.chainId as Hex | undefined;
  const assetSymbol = token.symbol ?? '';

  const performance = useTokenPerformance({
    token,
    assetId,
    currentCurrency,
  });

  const { transactions, submittedTxs, confirmedTxs, isNonEvmAsset } =
    useTokenTransactions(token);

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

    // Same ordering + de-dup as the legacy Token Details activity list.
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

  return (
    <Box
      flexDirection={BoxFlexDirection.Column}
      twClassName="gap-7 px-4 pt-5 pb-6"
      testID={TOKEN_DETAILS_V1_OVERVIEW_TEST_ID}
    >
      {token.description ? (
        <Box testID={TOKEN_DETAILS_V1_DESCRIPTION_TEST_ID}>
          <ContentDisplay content={token.description} />
        </Box>
      ) : null}

      <TokenDetailsV1Performance performance={performance} />

      {hasActivity ? (
        <Box testID={TOKEN_DETAILS_V1_ACTIVITY_TEST_ID}>
          <Text
            variant={TextVariant.HeadingMd}
            fontWeight={FontWeight.Bold}
            color={TextColor.TextDefault}
            twClassName="mb-3"
          >
            {strings('token_details_v1.activity.title', {
              symbol: assetSymbol,
            })}
          </Text>
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
                // TODO [ASSETS-4020 follow-up]: wire the speed-up / cancel
                // replacement-tx flow (legacy owner: `Transactions` screen).
                // Rows still navigate to the transaction details sheet "as is".
                onSpeedUpAction={() => undefined}
                onCancelAction={() => undefined}
              />
            );
          })}
        </Box>
      ) : null}
    </Box>
  );
};

TokenDetailsV1Overview.displayName = 'TokenDetailsV1Overview';

export default TokenDetailsV1Overview;
