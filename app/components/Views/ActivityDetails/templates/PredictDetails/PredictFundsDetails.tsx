import React from 'react';
import { useSelector } from 'react-redux';
import { strings } from '../../../../../../locales/i18n';
import { selectSelectedAccountGroupEvmInternalAccount } from '../../../../../selectors/multichainAccounts/accountTreeController';
import {
  ActivityDetailRow,
  ActivityDetailSection,
  ActivityDetailsAccountValue,
  ActivityDetailsBlockExplorerButton,
  ActivityDetailsDoItAgainButton,
  ActivityDetailsNetworkValue,
  ActivityDetailsStepTimeline,
  ActivityDetailsTemplateFrame,
  formatActivityTokenAmount,
} from '../../components';
import { ActivityDetailsSelectorsIDs } from '../../ActivityDetails.testIds';
import { useActivityNetworkName } from '../../hooks/useActivityNetworkName';
import {
  getPredictFundsCtaLabel,
  type PredictActivityListItem,
} from './PredictDetails.types';
import { PredictHero, StatusAndDateRows } from './PredictDetailsShared';
import {
  getPredictFundsSteps,
  getPredictFundsStepTitle,
} from './PredictDetails.utils';
import { useOpenPredictHome } from './useOpenPredictHome';

function PredictFundsMetadata({ item }: { item: PredictActivityListItem }) {
  const networkName = useActivityNetworkName(item.chainId);
  const selectedAccount = useSelector(
    selectSelectedAccountGroupEvmInternalAccount,
  );

  return (
    <ActivityDetailSection>
      <StatusAndDateRows item={item} />
      <ActivityDetailRow
        label={strings('activity_details.account')}
        value={
          selectedAccount?.address ? (
            <ActivityDetailsAccountValue
              address={selectedAccount.address}
              chainId={item.chainId}
            />
          ) : undefined
        }
        testID={ActivityDetailsSelectorsIDs.ACCOUNT_ROW}
      />
      <ActivityDetailRow
        label={strings('activity_details.network')}
        value={
          <ActivityDetailsNetworkValue
            chainId={item.chainId}
            name={networkName}
          />
        }
        testID={ActivityDetailsSelectorsIDs.NETWORK_ROW}
      />
    </ActivityDetailSection>
  );
}

export function PredictFundsDetails({
  item,
}: {
  item: PredictActivityListItem;
}) {
  const openPredictHome = useOpenPredictHome();
  const isDeposit = item.type === 'predictionsAddFunds';
  const amount = formatActivityTokenAmount(item.data.token);
  // The step timeline is deposit-only by design: the Predict step builder and
  // locale keys (`steps.bridge_funds` / `steps.add_funds`) describe the
  // bridge-deposit flow. Withdrawals have no defined step semantics or copy yet,
  // so their timeline is intentionally omitted — the amount, account/network
  // metadata and the withdraw CTA still render.
  const steps =
    isDeposit && item.status !== 'cancelled'
      ? getPredictFundsSteps(item.status, item.timestamp)
      : undefined;
  const completedCount = item.status === 'success' ? 2 : 1;

  return (
    <ActivityDetailsTemplateFrame
      hero={
        <PredictHero
          amount={amount}
          isPositive={isDeposit && item.status !== 'failed'}
          showTokenIcon
        />
      }
      metadata={<PredictFundsMetadata item={item} />}
      details={
        steps ? (
          <ActivityDetailsStepTimeline
            explorerTarget={
              item.hash ? { chainId: item.chainId, hash: item.hash } : undefined
            }
            steps={steps}
            title={getPredictFundsStepTitle(
              item.status,
              completedCount,
              steps.length,
            )}
          />
        ) : undefined
      }
      footer={
        <>
          {item.status !== 'success' ? (
            <ActivityDetailsBlockExplorerButton
              chainId={item.chainId}
              hash={item.hash}
            />
          ) : null}
          <ActivityDetailsDoItAgainButton
            label={getPredictFundsCtaLabel(item.status, isDeposit)}
            onPress={openPredictHome}
          />
        </>
      }
    />
  );
}
