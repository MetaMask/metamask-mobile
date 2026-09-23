import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import { SafeAreaView } from 'react-native-safe-area-context';
import { parseCaipAssetType, type CaipChainId } from '@metamask/utils';
import { MetaMetricsSwapsEventSource } from '@metamask/bridge-controller';
import {
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
  HeaderStandard,
  SectionDivider,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../locales/i18n';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import Routes from '../../../../../constants/navigation/Routes';
import { setSourceAmount } from '../../../../../core/redux/slices/bridge';
import type {
  Status,
  TokenAmount,
} from '../../../../../util/activity-adapters';
import { formatTimestampToDateTime } from '../../../../../util/date';
import { useParams } from '../../../../../util/navigation/navUtils';
/* eslint-disable import-x/no-restricted-paths -- reuse the shared Activity Details presentation and transaction enrichment */
import {
  ActivityDetailRow,
  ActivityDetailSection,
  ActivityDetailsAccountValue,
  ActivityDetailsBlockExplorerButton,
  ActivityDetailsDoItAgainButton,
  ActivityDetailsDualAmountHeader,
  ActivityDetailsFeesAndTotal,
  ActivityDetailsNetworkValue,
  ActivityDetailsStatus,
  ActivityDetailsTemplateFrame,
  ActivityDetailsTransactionId,
} from '../../../../Views/ActivityDetails/components';
import { useActivityDetailsItem } from '../../../../Views/ActivityDetails/hooks/useActivityDetailsItem';
import { useActivityNetworkName } from '../../../../Views/ActivityDetails/hooks/useActivityNetworkName';
/* eslint-enable import-x/no-restricted-paths */
import {
  RecurringSwapStatus,
  type RecurringSwap,
} from '../../api/recurringOrders.types';
import { showRecurringAutoUpgradeError } from '../../components/RecurringConfirmOrderSheet/RecurringConfirmOrderSheet.utils';
import { useAutoUpgradeEIP7702Account } from '../../hooks/useAutoUpgradeEIP7702Account';
import { useBridgeSession } from '../../hooks/useBridgeSession';
import { BridgeViewMode, type BridgeToken } from '../../types';
import { getRecurringOrderTokens } from '../../utils/recurringOrders';
import { startSwapBridgePageLoadTrace } from '../../utils/swapBridgePageLoadTrace';
import { BridgeTabKey } from '../BridgeView/BridgeView.constants';
import { RecurringSwapDetailsViewSelectorsIDs } from './RecurringSwapDetailsView.testIds';
import type { RecurringSwapDetailsRouteParams } from './RecurringSwapDetailsView.types';

interface RecurringSwapStatusDisplay {
  status: Status;
  label?: string;
}

function getRecurringSwapStatusDisplay(
  swap: RecurringSwap,
): RecurringSwapStatusDisplay {
  if (swap.status === RecurringSwapStatus.Filled) {
    return { status: 'success' };
  }

  if (swap.status === RecurringSwapStatus.Failed) {
    return { status: 'failed' };
  }

  return {
    status: 'pending',
    label: strings('bridge.recurring.skipped'),
  };
}

function getSkipReason(swap: RecurringSwap): string | undefined {
  if (swap.status !== RecurringSwapStatus.Skipped || !swap.skipReason) {
    return undefined;
  }

  return strings(`bridge.recurring.${swap.skipReason}`);
}

function RecurringSwapFeesAndTotal({
  chainId,
  txHash,
  sourceToken,
}: {
  chainId: CaipChainId;
  txHash: string;
  sourceToken: TokenAmount;
}) {
  const { item } = useActivityDetailsItem(txHash, chainId);

  if (!item) {
    return null;
  }

  return (
    <>
      <SectionDivider marginVertical={0} />
      <Box testID={RecurringSwapDetailsViewSelectorsIDs.FEES_AND_TOTAL}>
        <ActivityDetailsFeesAndTotal item={item} token={sourceToken} fiatOnly />
      </Box>
    </>
  );
}

type DelegationStatus = 'checking' | 'required' | 'upgrading' | 'hidden';

export function RecurringSwapDelegationButton({
  address,
  chainId,
}: {
  address: string;
  chainId: string | undefined;
}) {
  const { autoUpgradeEIP7702Account, getUpgradeStatus } =
    useAutoUpgradeEIP7702Account({ address, chainId });
  const [delegationStatus, setDelegationStatus] =
    useState<DelegationStatus>('checking');
  const isDelegatingRef = useRef(false);

  useEffect(() => {
    let isActive = true;

    setDelegationStatus('checking');
    getUpgradeStatus()
      .then((upgradeStatus) => {
        if (!isActive) return;

        setDelegationStatus(
          upgradeStatus.isUpgradeRequired ? 'required' : 'hidden',
        );
      })
      .catch((error) => {
        if (!isActive) return;

        showRecurringAutoUpgradeError(error);
        setDelegationStatus('hidden');
      });

    return () => {
      isActive = false;
    };
  }, [getUpgradeStatus]);

  const handleDelegateAccount = useCallback(async () => {
    if (isDelegatingRef.current) return;

    isDelegatingRef.current = true;
    setDelegationStatus('upgrading');

    try {
      await autoUpgradeEIP7702Account();
      setDelegationStatus('hidden');
    } catch (error) {
      showRecurringAutoUpgradeError(error);
      setDelegationStatus('required');
    } finally {
      isDelegatingRef.current = false;
    }
  }, [autoUpgradeEIP7702Account]);

  if (delegationStatus === 'hidden') return null;

  const isLoading =
    delegationStatus === 'checking' || delegationStatus === 'upgrading';

  return (
    <Button
      variant={ButtonVariant.Primary}
      size={ButtonSize.Lg}
      isFullWidth
      isDisabled={isLoading}
      isLoading={isLoading}
      onPress={handleDelegateAccount}
      testID={RecurringSwapDetailsViewSelectorsIDs.DELEGATE_ACCOUNT_BUTTON}
    >
      {strings('bridge.recurring.delegate_your_account')}
    </Button>
  );
}

export function RecurringSwapAgainButton({
  sourceToken,
  destinationToken,
}: {
  sourceToken: BridgeToken;
  destinationToken: BridgeToken;
}) {
  const navigation = useNavigation<AppNavigationProp>();
  const dispatch = useDispatch();
  const { setSelectedTab, setRenderedTab } = useBridgeSession();

  const handleSwapAgain = useCallback(() => {
    dispatch(setSourceAmount(undefined));
    setSelectedTab(BridgeTabKey.Market);
    setRenderedTab(BridgeTabKey.Market);

    const params = startSwapBridgePageLoadTrace({
      sourcePage: 'RecurringSwapDetails',
      bridgeViewMode: BridgeViewMode.Unified,
      sourceToken,
      destToken: destinationToken,
      // TODO: Add a recurring source to MetaMetricsSwapsEventSource in @metamask/bridge-controller.
      location: MetaMetricsSwapsEventSource.TransactionDetails,
      scrollToTopOnNav: true,
    });

    navigation.navigate(Routes.BRIDGE.ROOT, {
      screen: Routes.BRIDGE.BRIDGE_VIEW,
      params,
    });
  }, [
    destinationToken,
    dispatch,
    navigation,
    setRenderedTab,
    setSelectedTab,
    sourceToken,
  ]);

  return (
    <ActivityDetailsDoItAgainButton
      label={strings('activity_details.swap_again')}
      onPress={handleSwapAgain}
    />
  );
}

function handleAddFunds() {
  // TODO: Replace this log with Add funds navigation once the destination is defined.
  // eslint-disable-next-line no-console
  console.log('[RecurringSwapDetails:AddFunds] Add funds pressed');
}

function RecurringSwapDetailsView() {
  const tw = useTailwind();
  const navigation = useNavigation<AppNavigationProp>();
  const {
    order,
    swap,
    showAddFundsCta = false,
  } = useParams<RecurringSwapDetailsRouteParams>();
  const { sourceToken, destinationToken } = getRecurringOrderTokens(order);
  const chainId = parseCaipAssetType(order.src.asset.assetId).chainId;
  const networkName = useActivityNetworkName(chainId);
  const hasZeroAmounts = swap.status !== RecurringSwapStatus.Filled;
  const statusDisplay = getRecurringSwapStatusDisplay(swap);
  const sourceTokenAmount: TokenAmount = {
    amount: hasZeroAmounts ? '0' : swap.src.amount,
    decimals: sourceToken.decimals,
    symbol: sourceToken.symbol,
    assetId: order.src.asset.assetId,
    direction: 'out',
  };
  const destinationTokenAmount: TokenAmount = {
    amount: hasZeroAmounts ? '0' : swap.dest.amount,
    decimals: destinationToken.decimals,
    symbol: destinationToken.symbol,
    assetId: order.dest.asset.assetId,
    direction: 'in',
  };
  const executionTimestamp = Date.parse(swap.executedAt ?? swap.scheduledAt);
  const skipReason = getSkipReason(swap);
  const shouldOfferDelegation =
    swap.status === RecurringSwapStatus.Skipped &&
    swap.skipReason === 'needs_smart_account';
  const shouldOfferSwapAgain =
    swap.status === RecurringSwapStatus.Failed && Boolean(swap.txHash);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  return (
    <SafeAreaView
      edges={{ bottom: 'additive' }}
      style={tw.style('flex-1 bg-default')}
      testID={RecurringSwapDetailsViewSelectorsIDs.SCREEN}
    >
      <Box twClassName="flex-1 bg-default">
        <HeaderStandard
          includesTopInset
          title={strings('bridge.recurring.swap_details_title', {
            source: sourceToken.symbol,
            dest: destinationToken.symbol,
          })}
          onBack={handleBack}
          backButtonProps={{
            testID: RecurringSwapDetailsViewSelectorsIDs.BACK_BUTTON,
          }}
        />
        <ScrollView
          style={tw.style('flex-1')}
          contentContainerStyle={tw.style('grow p-4')}
          showsVerticalScrollIndicator={false}
        >
          <ActivityDetailsTemplateFrame
            hero={
              <ActivityDetailsDualAmountHeader
                sentToken={sourceTokenAmount}
                receivedToken={destinationTokenAmount}
              />
            }
            metadata={
              <>
                <ActivityDetailSection>
                  <ActivityDetailRow
                    label={strings('activity_details.status')}
                    value={
                      <ActivityDetailsStatus
                        status={statusDisplay.status}
                        label={statusDisplay.label}
                      />
                    }
                    testID={RecurringSwapDetailsViewSelectorsIDs.STATUS_ROW}
                  />
                  <ActivityDetailRow
                    label={strings('bridge.recurring.reason')}
                    value={skipReason}
                    testID={RecurringSwapDetailsViewSelectorsIDs.REASON_ROW}
                  />
                  <ActivityDetailRow
                    label={strings('activity_details.date')}
                    value={formatTimestampToDateTime(executionTimestamp)}
                    testID={RecurringSwapDetailsViewSelectorsIDs.DATE_ROW}
                  />
                  <ActivityDetailRow
                    label={strings('activity_details.account')}
                    value={
                      <ActivityDetailsAccountValue
                        address={order.src.walletAddress}
                        chainId={chainId}
                      />
                    }
                    testID={RecurringSwapDetailsViewSelectorsIDs.ACCOUNT_ROW}
                  />
                  <ActivityDetailRow
                    label={strings('activity_details.network')}
                    value={
                      <ActivityDetailsNetworkValue
                        chainId={chainId}
                        name={networkName}
                      />
                    }
                    testID={RecurringSwapDetailsViewSelectorsIDs.NETWORK_ROW}
                  />
                  <ActivityDetailRow
                    label={strings('activity_details.transaction_id')}
                    value={
                      swap.txHash ? (
                        <ActivityDetailsTransactionId hash={swap.txHash} />
                      ) : undefined
                    }
                    testID={
                      RecurringSwapDetailsViewSelectorsIDs.TRANSACTION_ID_ROW
                    }
                  />
                </ActivityDetailSection>
                {swap.txHash ? (
                  <RecurringSwapFeesAndTotal
                    chainId={chainId}
                    txHash={swap.txHash}
                    sourceToken={sourceTokenAmount}
                  />
                ) : null}
              </>
            }
            footer={
              swap.txHash ? (
                <>
                  <ActivityDetailsBlockExplorerButton
                    chainId={chainId}
                    hash={swap.txHash}
                  />
                  {shouldOfferSwapAgain ? (
                    <RecurringSwapAgainButton
                      sourceToken={sourceToken}
                      destinationToken={destinationToken}
                    />
                  ) : null}
                </>
              ) : shouldOfferDelegation ? (
                <RecurringSwapDelegationButton
                  address={order.src.walletAddress}
                  chainId={chainId}
                />
              ) : showAddFundsCta ? (
                <Button
                  variant={ButtonVariant.Primary}
                  size={ButtonSize.Lg}
                  isFullWidth
                  onPress={handleAddFunds}
                >
                  {strings('wallet.add_funds')}
                </Button>
              ) : null
            }
          />
        </ScrollView>
      </Box>
    </SafeAreaView>
  );
}

export default RecurringSwapDetailsView;
