import React from 'react';
import {
  Box,
  Button,
  ButtonVariant,
  Text,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import type {
  CardLedgerEntry,
  CardSummaryResponse,
} from '../../../../../core/Engine/controllers/rewards-money-controller/types';

export const CardCashbackSelectors = {
  LOADING: 'card-cashback-loading',
  UNAVAILABLE: 'card-cashback-unavailable',
  CLAIMABLE: 'card-cashback-claimable',
  CLAIM: 'card-cashback-claim',
  MPC: 'card-cashback-mpc',
  PAIRING: 'card-cashback-pairing',
  LEDGER: 'card-cashback-ledger',
  RATE: 'card-cashback-rate',
};

/** mUSD base units use 6 decimal places. */
export function formatMusdBaseUnits(value: string): string {
  if (!/^\d+$/.test(value)) return value;
  const padded = value.padStart(7, '0');
  const whole = padded.slice(0, -6).replace(/^0+(?=\d)/, '');
  const fraction = padded.slice(-6).replace(/0+$/, '');
  return fraction.length > 0 ? `${whole}.${fraction}` : whole;
}

export function cardCashbackRateLabel(
  ledger: CardLedgerEntry[],
): string | null {
  const rate = ledger.find((entry) => entry.card_source)?.card_source
    ?.rate_bps;
  if (rate === undefined || !Number.isInteger(rate) || rate < 0) return null;
  return strings('card.card_home.cashback_screen.rate', {
    rate: String(rate / 100),
  });
}

interface CardCashbackViewProps {
  status: 'loading' | 'unavailable' | 'ready';
  summary?: CardSummaryResponse | null;
  ledger?: CardLedgerEntry[];
  canClaim?: boolean;
  mpcAccount?: boolean;
  isClaiming?: boolean;
  onClaim?: () => void;
}

const CardCashbackView: React.FC<CardCashbackViewProps> = ({
  status,
  summary,
  ledger = [],
  canClaim = false,
  mpcAccount = false,
  isClaiming = false,
  onClaim,
}) => {
  if (status === 'loading') {
    return (
      <Text testID={CardCashbackSelectors.LOADING}>
        {strings('card.card_home.cashback_screen.loading')}
      </Text>
    );
  }
  if (status === 'unavailable' || !summary) {
    return (
      <Text testID={CardCashbackSelectors.UNAVAILABLE}>
        {strings('card.card_home.cashback_screen.unavailable')}
      </Text>
    );
  }

  const claimable = BigInt(summary.claimable || '0');
  const minimum = BigInt(summary.minimum_musd_base_units || '0');
  const belowMinimum = claimable > BigInt(0) && claimable < minimum;
  const showClaim =
    canClaim &&
    !mpcAccount &&
    !summary.pairing_pending &&
    !summary.blocking_reason &&
    !belowMinimum &&
    claimable > BigInt(0);
  const rate = cardCashbackRateLabel(ledger);

  return (
    <Box>
      <Text accessibilityRole="header">
        {strings('card.card_home.cashback_screen.title')}
      </Text>
      {rate ? <Text testID={CardCashbackSelectors.RATE}>{rate}</Text> : null}
      <Text testID={CardCashbackSelectors.CLAIMABLE}>
        {`${strings('card.card_home.cashback_screen.claimable')} ${formatMusdBaseUnits(summary.claimable)}`}
      </Text>
      <Text>{`${strings('card.card_home.cashback_screen.pending')} ${formatMusdBaseUnits(summary.pending)}`}</Text>
      <Text>{`${strings('card.card_home.cashback_screen.held')} ${formatMusdBaseUnits(summary.held)}`}</Text>
      <Text>{`${strings('card.card_home.cashback_screen.blocked')} ${formatMusdBaseUnits(summary.blocked)}`}</Text>
      <Text>{`${strings('card.card_home.cashback_screen.claimed')} ${formatMusdBaseUnits(summary.claimed)}`}</Text>
      {summary.pairing_pending ? (
        <Text testID={CardCashbackSelectors.PAIRING}>
          {strings('card.card_home.cashback_screen.pairing_pending')}
        </Text>
      ) : null}
      {summary.blocking_reason || belowMinimum ? (
        <Text>
          {summary.blocking_reason ??
            strings('card.card_home.cashback_screen.below_minimum')}
        </Text>
      ) : null}
      {mpcAccount ? (
        <Text testID={CardCashbackSelectors.MPC}>
          {strings('card.card_home.cashback_screen.mpc_unavailable')}
        </Text>
      ) : null}
      {showClaim ? (
        <Button
          variant={ButtonVariant.Primary}
          isLoading={isClaiming}
          onPress={onClaim}
          testID={CardCashbackSelectors.CLAIM}
        >
          {strings('card.card_home.cashback_screen.claim')}
        </Button>
      ) : null}
      <Box testID={CardCashbackSelectors.LEDGER}>
        {ledger.length === 0 ? (
          <Text>{strings('card.card_home.cashback_screen.empty_ledger')}</Text>
        ) : (
          ledger.map((entry) => (
            <Text key={entry.id}>
              {entry.musd_amount
                ? formatMusdBaseUnits(entry.musd_amount)
                : entry.id}
            </Text>
          ))
        )}
      </Box>
    </Box>
  );
};

export default CardCashbackView;
