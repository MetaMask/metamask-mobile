import React from 'react';
import { useSelector } from 'react-redux';
import { SectionDivider } from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { selectSelectedAccountGroupEvmInternalAccount } from '../../../../../selectors/multichainAccounts/accountTreeController';
import {
  ActivityDetailRow,
  ActivityDetailSection,
  ActivityDetailsAccountValue,
  ActivityDetailsBlockExplorerButton,
  ActivityDetailsDoItAgainButton,
  ActivityDetailsPayFeesAndTotal,
  ActivityDetailsPayNetworkRow,
  ActivityDetailsStepTimeline,
  ActivityDetailsTemplateFrame,
  useActivityPayFiat,
  useFormatActivityTokenAmount,
} from '../../components';
import { ActivityDetailsSelectorsIDs } from '../../ActivityDetails.testIds';
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

function PredictFundsMetadata({
  item,
  isDeposit,
}: {
  item: PredictActivityListItem;
  isDeposit: boolean;
}) {
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
      <ActivityDetailsPayNetworkRow item={item} isDeposit={isDeposit} />
    </ActivityDetailSection>
  );
}

export function PredictFundsDetails({
  item,
}: {
  item: PredictActivityListItem;
}) {
  const openPredictHome = useOpenPredictHome();
  const formatActivityTokenAmount = useFormatActivityTokenAmount();
  const isDeposit = item.type === 'predictionsAddFunds';
  const amount = formatActivityTokenAmount(item.data.token);

  const steps =
    isDeposit && item.status !== 'cancelled'
      ? getPredictFundsSteps(item.status, item.timestamp)
      : undefined;
  const completedCount = item.status === 'success' ? 2 : 1;
  const pay = useActivityPayFiat(item);
  const showPaySection = isDeposit && Boolean(pay);
  const showDetails = showPaySection || Boolean(steps);

  return (
    <ActivityDetailsTemplateFrame
      hero={
        <PredictHero
          amount={amount}
          isPositive={isDeposit && item.status !== 'failed'}
          showTokenIcon
        />
      }
      metadata={<PredictFundsMetadata item={item} isDeposit={isDeposit} />}
      details={
        showDetails ? (
          <>
            {showPaySection && pay ? (
              <ActivityDetailsPayFeesAndTotal pay={pay} />
            ) : null}
            {showPaySection && steps ? (
              <SectionDivider marginVertical={3} />
            ) : null}
            {steps ? (
              <ActivityDetailsStepTimeline
                explorerTarget={
                  item.hash
                    ? { chainId: item.chainId, hash: item.hash }
                    : undefined
                }
                steps={steps}
                title={getPredictFundsStepTitle(
                  item.status,
                  completedCount,
                  steps.length,
                )}
              />
            ) : null}
          </>
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
