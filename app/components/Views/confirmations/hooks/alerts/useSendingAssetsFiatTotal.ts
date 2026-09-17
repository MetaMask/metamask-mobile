import type { Hex } from '@metamask/utils';

import useBalanceChanges from '../../../../UI/SimulationDetails/useBalanceChanges';
import { calculateTotalFiat } from '../../../../UI/SimulationDetails/FiatDisplay/FiatDisplay';
import useFiatFormatter from '../../../../UI/SimulationDetails/FiatDisplay/useFiatFormatter';
import useHideFiatForTestnet from '../../../../hooks/useHideFiatForTestnet';
import { FIAT_UNAVAILABLE } from '../../../../UI/SimulationDetails/types';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';

/**
 * Above this USD value the formatted amount is suppressed and copy falls back
 * to the word "funds", to avoid alarming users with implausible simulated
 * totals (per PSAFE-509 product decision).
 */
export const SENDING_ASSETS_FIAT_DISPLAY_CEILING_USD = 10_000_000;

/**
 * Returns the formatted fiat total of assets leaving the user's wallet
 * according to transaction simulation, for use in security alert copy
 * ("If you continue, your $1,234.56 can't be recovered.").
 *
 * Returns null when no amount should be displayed: signatures and other
 * confirmations without simulation data, zero/unavailable fiat or USD
 * conversion (including when any outgoing asset is unpriced), fiat hidden on
 * testnets, simulation still loading, or totals above the display ceiling.
 * Callers fall back to amount-less copy.
 */
export function useSendingAssetsFiatTotal(): string | null {
  const transactionMetadata = useTransactionMetadataRequest();
  const { chainId, networkClientId, simulationData } =
    transactionMetadata ?? {};
  const hideFiatForTestnet = useHideFiatForTestnet(chainId as Hex);
  const fiatFormatter = useFiatFormatter();

  const { pending, value: balanceChanges } = useBalanceChanges({
    chainId: chainId as Hex,
    simulationData,
    networkClientId: networkClientId as string,
  });

  if (
    hideFiatForTestnet ||
    pending ||
    !simulationData ||
    simulationData.error
  ) {
    return null;
  }

  const sendingAssets = balanceChanges.filter((change) =>
    change.amount.isNegative(),
  );

  if (sendingAssets.length === 0) {
    return null;
  }

  const hasUnavailableConversion = sendingAssets.some(
    (change) =>
      change.fiatAmount === FIAT_UNAVAILABLE ||
      change.usdAmount === FIAT_UNAVAILABLE,
  );

  if (hasUnavailableConversion) {
    return null;
  }

  const totalFiat = calculateTotalFiat(
    sendingAssets.map((change) => change.fiatAmount),
  ).abs();
  const totalUsd = calculateTotalFiat(
    sendingAssets.map((change) => change.usdAmount),
  ).abs();

  // The ceiling is denominated in USD, and unavailable conversions total to
  // zero, so a zero USD total means the amount cannot be checked against the
  // ceiling rather than meaning the amount is small.
  if (
    totalFiat.isZero() ||
    totalUsd.isZero() ||
    totalUsd.isGreaterThan(SENDING_ASSETS_FIAT_DISPLAY_CEILING_USD)
  ) {
    return null;
  }

  return fiatFormatter(totalFiat);
}
