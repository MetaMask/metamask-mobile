import React, { useCallback, useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import { useSelector } from 'react-redux';
import { strings } from '../../../../../../locales/i18n';
import Engine from '../../../../../core/Engine';
import { selectRewardsMoneyControllerEnabled } from '../../../../../selectors/featureFlagController/rewardsMoneyController';
import type {
  CardLedgerEntry,
  CardSummaryResponse,
} from '../../../../../core/Engine/controllers/rewards-money-controller/types';
import CardCashbackView from './CardCashbackView';
import { useCardCashbackClaim } from './useCardCashbackClaim';

const CardCashback: React.FC = () => {
  const enabled = useSelector(selectRewardsMoneyControllerEnabled);
  const [summary, setSummary] = useState<CardSummaryResponse | null>(null);
  const [ledger, setLedger] = useState<CardLedgerEntry[]>([]);
  const [failed, setFailed] = useState(false);
  const [claimFailed, setClaimFailed] = useState(false);

  const load = useCallback(async () => {
    const [nextSummary, page] = await Promise.all([
      Engine.context.RewardsMoneyController.getCardSummary(),
      Engine.context.RewardsMoneyController.getCardLedger(),
    ]);
    setSummary(nextSummary);
    setLedger(page.results);
    setFailed(false);
  }, []);

  const { claim, isClaiming, canClaim, mpcAccount } = useCardCashbackClaim(
    async () => {
      try {
        await load();
      } catch {
        // The claim already went through. Keep the summary on screen.
      }
    },
  );

  const reportClaimFailure = () => {
    setClaimFailed(true);
    AccessibilityInfo.announceForAccessibility(
      strings('card.card_home.cashback_screen.claim_failed'),
    );
  };

  useEffect(() => {
    if (!enabled) return undefined;
    let cancelled = false;
    load().catch(() => {
      if (!cancelled) setFailed(true);
    });
    return () => {
      cancelled = true;
    };
  }, [enabled, load]);

  if (!enabled || failed) {
    return <CardCashbackView status="unavailable" />;
  }
  if (!summary) {
    return <CardCashbackView status="loading" />;
  }
  return (
    <CardCashbackView
      status="ready"
      summary={summary}
      ledger={ledger}
      canClaim={canClaim}
      mpcAccount={mpcAccount}
      isClaiming={isClaiming}
      claimFailed={claimFailed}
      onClaim={() => {
        claim()
          .then((result) => {
            if (result === 'failed') {
              reportClaimFailure();
            } else if (result === 'submitted') {
              setClaimFailed(false);
            }
          })
          .catch(reportClaimFailure);
      }}
    />
  );
};

export default CardCashback;
