import { useMemo } from 'react';
import type { Hex } from '@metamask/utils';
import { SimulationData } from '@metamask/transaction-controller';

import { strings } from '../../../../../../locales/i18n';
import { RowAlertKey } from '../../components/UI/info-row/alert-row/constants';
import { AlertKeys } from '../../constants/alerts';
import { Alert, Severity } from '../../types/alerts';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { useIsGaslessSupported } from '../gas/useIsGaslessSupported';
import { NETWORKS_CHAIN_ID } from '../../../../../constants/network';

/**
 * Configuration for gas sponsorship warning rules per chain.
 * Each rule defines matchers for error detection and the warning message parameters.
 */
interface SponsorshipWarningRule {
  /** The localization message key for the warning */
  messageKey: string;
  /** The minimum balance required for sponsorship */
  minBalance: string;
  /** The native token symbol for this chain (e.g., 'MON' for Monad) */
  nativeCurrency: string;
  /** Array of error message patterns to match (case-insensitive) */
  matchers: string[];
}

/**
 * Extended SimulationData type that includes callTraceErrors.
 * This field is available in transaction-controller >= 62.10.0
 */
type SimulationDataWithCallTraceErrors = SimulationData & {
  callTraceErrors?: string[];
};

/**
 * Rules for displaying gas sponsorship warnings based on chain-specific requirements.
 * Currently configured for Monad which requires a 10 MON minimum reserve balance.
 */
const GAS_SPONSORSHIP_WARNING_RULES: Partial<
  Record<Hex, SponsorshipWarningRule>
> = {
  [NETWORKS_CHAIN_ID.MONAD as Hex]: {
    messageKey: 'alert_system.gas_sponsorship_reserve_balance.message',
    minBalance: '10',
    nativeCurrency: 'MON',
    matchers: ['reserve balance violation'],
  },
};

/**
 * Checks if the callTraceErrors match any sponsorship warning rules for the given chain.
 *
 * @param callTraceErrors - Array of error messages from simulation
 * @param chainId - The chain ID of the transaction
 * @returns True if a matching rule is found, false otherwise
 */
function hasGasSponsorshipWarning(
  callTraceErrors: string[] | undefined,
  chainId: Hex,
): boolean {
  if (!callTraceErrors?.length) {
    return false;
  }

  const rule = GAS_SPONSORSHIP_WARNING_RULES[chainId];
  if (!rule) {
    return false;
  }

  const normalizedErrors = callTraceErrors.map((error) => error.toLowerCase());
  return rule.matchers.some((matcher) =>
    normalizedErrors.some((error) => error.includes(matcher)),
  );
}

/**
 * Hook that returns an alert when gas sponsorship fails due to reserve balance requirements.
 *
 * This hook checks for specific error patterns in the transaction simulation's callTraceErrors
 * and displays a warning alert when sponsorship is unavailable due to insufficient reserve balance.
 *
 * Currently configured for Monad network which requires a minimum of 10 MON in the account
 * for gas sponsorship to work.
 *
 * @returns An array containing a warning alert if sponsorship failed, empty array otherwise
 */
export const useGasSponsorshipWarningAlert = (): Alert[] => {
  const transactionMetadata = useTransactionMetadataRequest();
  const { isSupported: isGaslessSupported } = useIsGaslessSupported();

  const { chainId, isGasFeeSponsored, simulationData } =
    transactionMetadata ?? {};

  const callTraceErrors = (
    simulationData as SimulationDataWithCallTraceErrors | undefined
  )?.callTraceErrors;

  // Use primitive boolean to avoid object reference changes on every render
  const hasWarning = useMemo(
    () =>
      chainId
        ? hasGasSponsorshipWarning(callTraceErrors, chainId as Hex)
        : false,
    [callTraceErrors, chainId],
  );

  // Only show warning when:
  // 1. We have a warning match from configured rules
  // 2. Gas fee is NOT currently sponsored (the warning explains why)
  // 3. Gasless is supported on this network (otherwise sponsorship wouldn't be expected)
  const shouldShow = hasWarning && !isGasFeeSponsored && isGaslessSupported;

  return useMemo(() => {
    if (!shouldShow || !chainId) {
      return [];
    }

    const rule = GAS_SPONSORSHIP_WARNING_RULES[chainId as Hex];
    if (!rule) {
      return [];
    }

    return [
      {
        isBlocking: false,
        field: RowAlertKey.EstimatedFee,
        key: AlertKeys.GasSponsorshipReserveBalance,
        message: strings(rule.messageKey, {
          minBalance: rule.minBalance,
          nativeTokenSymbol: rule.nativeCurrency,
        }),
        title: strings('alert_system.gas_sponsorship_reserve_balance.title'),
        severity: Severity.Warning,
      },
    ];
  }, [shouldShow, chainId]);
};
