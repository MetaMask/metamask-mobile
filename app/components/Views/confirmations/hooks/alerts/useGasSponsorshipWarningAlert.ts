import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import type { Hex } from '@metamask/utils';
import { SimulationData } from '@metamask/transaction-controller';

import { strings } from '../../../../../../locales/i18n';
import { RowAlertKey } from '../../components/UI/info-row/alert-row/constants';
import { AlertKeys } from '../../constants/alerts';
import { Alert, Severity } from '../../types/alerts';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { useIsGaslessSupported } from '../gas/useIsGaslessSupported';
import { selectNetworkConfigurations } from '../../../../../selectors/networkController';
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
    matchers: ['reserve balance violation'],
  },
};

/**
 * Checks if the callTraceErrors match any sponsorship warning rules for the given chain.
 *
 * @param params - Parameters for checking sponsorship warning
 * @param params.callTraceErrors - Array of error messages from simulation
 * @param params.chainId - The chain ID of the transaction
 * @param params.nativeTokenSymbol - The native token symbol of the chain
 * @returns The warning message if a rule matches, null otherwise
 */
function getGasSponsorshipWarning({
  callTraceErrors,
  chainId,
  nativeTokenSymbol,
}: {
  callTraceErrors?: string[];
  chainId: Hex;
  nativeTokenSymbol: string;
}): { message: string; title: string } | null {
  if (!callTraceErrors?.length) {
    return null;
  }

  const rule = GAS_SPONSORSHIP_WARNING_RULES[chainId];
  if (!rule) {
    return null;
  }

  const normalizedErrors = callTraceErrors.map((error) => error.toLowerCase());
  const hasMatch = rule.matchers.some((matcher) =>
    normalizedErrors.some((error) => error.includes(matcher)),
  );

  if (!hasMatch) {
    return null;
  }

  return {
    message: strings(rule.messageKey, {
      minBalance: rule.minBalance,
      nativeTokenSymbol,
    }),
    title: strings('alert_system.gas_sponsorship_reserve_balance.title'),
  };
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
  const networkConfigurations = useSelector(selectNetworkConfigurations);

  const { chainId, isGasFeeSponsored, simulationData } =
    transactionMetadata ?? {};

  const { nativeCurrency } =
    networkConfigurations[(chainId as Hex) ?? ''] ?? {};

  const callTraceErrors = (
    simulationData as SimulationDataWithCallTraceErrors | undefined
  )?.callTraceErrors;

  const warningContent =
    chainId && nativeCurrency
      ? getGasSponsorshipWarning({
          callTraceErrors,
          chainId: chainId as Hex,
          nativeTokenSymbol: nativeCurrency,
        })
      : null;

  // Only show warning when:
  // 1. We have a warning message from matching rules
  // 2. Gas fee is NOT currently sponsored (the warning explains why)
  // 3. Gasless is supported on this network (otherwise sponsorship wouldn't be expected)
  const shouldShow =
    Boolean(warningContent) && !isGasFeeSponsored && isGaslessSupported;

  return useMemo(() => {
    if (!shouldShow || !warningContent) {
      return [];
    }

    return [
      {
        isBlocking: false,
        field: RowAlertKey.EstimatedFee,
        key: AlertKeys.GasSponsorshipReserveBalance,
        message: warningContent.message,
        title: warningContent.title,
        severity: Severity.Warning,
      },
    ];
  }, [shouldShow, warningContent]);
};
