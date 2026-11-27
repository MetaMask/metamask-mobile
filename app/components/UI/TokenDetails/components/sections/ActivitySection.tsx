import React, { memo } from 'react';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import type { SupportedCaipChainId } from '@metamask/multichain-network-controller';
import NonEvmActivityRows from './NonEvmActivityRows';
import ActivityRows from './ActivityRows';
import EvmActivityFooter from './EvmActivityFooter';
import type { Hex } from '@metamask/utils';
import type { RootState } from '../../../../../reducers';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import { selectSelectedInternalAccount } from '../../../../../selectors/accountsController';
import { selectEvmNetworkConfigurationsByChainId } from '../../../../../selectors/networkController';
import { selectBridgeHistoryForAccount } from '../../../../../selectors/bridgeStatusController';
import AssetDetailsActivityListItem from '../../../Transactions/AssetDetailsActivityListItem';
import { ActivityListItemRow } from '../../../ActivityListItemRow/ActivityListItemRow';
import { getActivityDetailsRoute } from '../../../../Views/ActivityList/getActivityDetailsRoute';
import Routes from '../../../../../constants/navigation/Routes';
import { useTokenTransactions } from '../../hooks/useTokenTransactions';
import { useTokenCaipAssetId } from '../../hooks/useTokenCaipAssetId';
import type { TokenDetailsRouteParams } from '../../constants/constants';

export {
  TOKEN_DETAILS_ACTIVITY_SECTION_TEST_ID,
  TOKEN_DETAILS_ACTIVITY_SHOW_MORE_TEST_ID,
  TOKEN_DETAILS_ACTIVITY_LOADING_MORE_TEST_ID,
  DEFAULT_INITIAL_VISIBLE_ROWS,
  ACTIVITY_EXPAND_STEP_ROWS,
} from './ActivityRows';

export interface ActivitySectionProps {
  token: TokenDetailsRouteParams;
  showSectionRule?: boolean;
  includeNonEvm?: boolean;
  showEvmFooter?: boolean;
}

const ActivitySection: React.FC<ActivitySectionProps> = ({
  token,
  showSectionRule = false,
  includeNonEvm = false,
  showEvmFooter = false,
}) => {
  const navigation = useNavigation<AppNavigationProp>();
  const chainId = token.chainId as Hex | undefined;
  const assetSymbol = token.symbol ?? '';

  const {
    transactions,
    submittedTxs,
    confirmedTxs,
    loading: isActivityLoading,
    bridgeArrivalTxs,
    selectedAddress,
    isNonEvmAsset,
  } = useTokenTransactions(token);

  const accountImportTime = useSelector(
    (state: RootState) =>
      selectSelectedInternalAccount(state)?.metadata.importTime,
  );
  const networkConfigurationsByChainId = useSelector(
    selectEvmNetworkConfigurationsByChainId,
  );
  const bridgeHistory = useSelector(selectBridgeHistoryForAccount);

  const caipAssetId = useTokenCaipAssetId(token);

  if (isNonEvmAsset) {
    return includeNonEvm ? (
      <NonEvmActivityRows
        token={token}
        transactions={transactions}
        address={selectedAddress}
        chainId={token.chainId as SupportedCaipChainId}
        bridgeArrivals={bridgeArrivalTxs}
        navigation={navigation}
        showSectionRule={showSectionRule}
      />
    ) : null;
  }

  return (
    <ActivityRows
      token={token}
      transactions={transactions}
      submittedTxs={submittedTxs}
      confirmedTxs={confirmedTxs}
      chainId={chainId}
      caipAssetId={caipAssetId ?? undefined}
      selectedAddress={selectedAddress}
      assetSymbol={assetSymbol}
      isActivityLoading={isActivityLoading}
      showSectionRule={showSectionRule}
      footer={
        showEvmFooter ? (
          <EvmActivityFooter
            chainId={chainId}
            address={selectedAddress}
            navigation={navigation}
            networkConfigurations={networkConfigurationsByChainId}
          />
        ) : null
      }
      renderItem={({ item, index }) => {
        // Check if this is an API activity item (doesn't have a mapped transaction)
        const transaction = [...submittedTxs, ...confirmedTxs, ...transactions].find(
          tx => tx.id === item.hash
        );
        
        if (!transaction) {
          // This is an API-only item
          return (
            <ActivityListItemRow
              item={item}
              index={index}
              onPress={(pressedItem) => {
                const detailsRoute = getActivityDetailsRoute(pressedItem);
                if (detailsRoute) {
                  navigation.navigate(Routes.ACTIVITY_DETAILS, detailsRoute);
                }
              }}
            />
          );
        }

        return (
          <AssetDetailsActivityListItem
            transaction={transaction}
            index={index}
            assetSymbol={assetSymbol}
            chainId={chainId}
            tokenChainId={chainId}
            navigation={navigation}
            accountImportTime={accountImportTime}
            networkConfigurations={networkConfigurationsByChainId}
            bridgeHistory={bridgeHistory}
          />
        );
      }}
    />
  );
};

ActivitySection.displayName = 'ActivitySection';

export default memo(ActivitySection);
