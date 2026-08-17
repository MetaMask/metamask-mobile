import { useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import {
  resolveChainName,
  TokenScanResultResponse,
} from '@metamask/phishing-controller';
import { Alert, Severity } from '../../types/alerts';
import { AlertKeys } from '../../constants/alerts';
import { RowAlertKey } from '../../components/UI/info-row/alert-row/constants';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { strings } from '../../../../../../locales/i18n';

export function useTokenTrustSignalAlerts(): Alert[] {
  const transactionMetadata = useTransactionMetadataRequest();

  const incomingTokens = useMemo(() => {
    const tokens: { address: string; chainId: string }[] = [];
    const tokenBalanceChanges =
      transactionMetadata?.simulationData?.tokenBalanceChanges;

    if (
      !tokenBalanceChanges ||
      !Array.isArray(tokenBalanceChanges) ||
      !transactionMetadata?.chainId
    ) {
      return tokens;
    }

    const chainId = transactionMetadata.chainId;

    tokenBalanceChanges.forEach((change) => {
      if (!change.isDecrease) {
        tokens.push({
          address: change.address || '',
          chainId,
        });
      }
    });

    return tokens;
  }, [transactionMetadata]);

  const queries = useMemo(
    () =>
      incomingTokens.map(({ address, chainId }) => {
        const normalizedChainId = String(chainId).toLowerCase();
        const chain = resolveChainName(normalizedChainId);
        // EVM addresses are case-insensitive and cached lowercased; non-EVM
        // addresses are case-sensitive.
        const caseSensitive = !normalizedChainId.startsWith('0x');
        const normalizedAddress = caseSensitive
          ? address
          : address.toLowerCase();
        return {
          queryKey: [
            'PhishingDataService:scanToken',
            chain ?? '',
            normalizedAddress,
          ],
          enabled: Boolean(address && chain),
          staleTime: 0,
          retry: false,
        };
      }),
    [incomingTokens],
  );

  const tokenScanResults = useQueries({ queries });

  const alerts = useMemo(() => {
    const alertsList: Alert[] = [];
    let highestSeverity: Severity | null = null;

    tokenScanResults.forEach(({ data }) => {
      const scanResult = data as TokenScanResultResponse | undefined | null;
      if (!scanResult) {
        return;
      }

      const resultType = scanResult.result_type;
      let severity: Severity | null = null;

      if (resultType === 'Malicious') {
        severity = Severity.Danger;
      } else if (resultType === 'Warning') {
        severity = Severity.Warning;
      }

      if (!severity) {
        return;
      }

      if (!highestSeverity || severity === Severity.Danger) {
        highestSeverity = severity;
      }
    });

    if (highestSeverity) {
      const isDanger = highestSeverity === Severity.Danger;

      const alertKey = isDanger
        ? AlertKeys.TokenTrustSignalMalicious
        : AlertKeys.TokenTrustSignalWarning;

      const message = isDanger
        ? strings('alert_system.token_trust_signal.malicious.message')
        : strings('alert_system.token_trust_signal.warning.message');

      const title = isDanger
        ? strings('alert_system.token_trust_signal.malicious.title')
        : strings('alert_system.token_trust_signal.warning.title');

      alertsList.push({
        key: alertKey,
        field: RowAlertKey.IncomingTokens,
        message,
        title,
        severity: highestSeverity,
        isBlocking: false,
      });
    }

    return alertsList;
  }, [tokenScanResults]);

  return alerts;
}
