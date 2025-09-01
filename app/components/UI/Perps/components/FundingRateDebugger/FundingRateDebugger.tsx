import React, { useCallback, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { InfoClient, WebSocketTransport } from '@deeeed/hyperliquid-node20';
import Button, {
  ButtonSize,
  ButtonVariants,
} from '../../../../../component-library/components/Buttons/Button';
import Text, {
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { DevLogger } from '../../../../../core/SDKConnect/utils/DevLogger';
import {
  HYPERLIQUID_TRANSPORT_CONFIG,
  getWebSocketEndpoint,
} from '../../constants/hyperLiquidConfig';
import Engine from '../../../../../core/Engine';

interface FundingRateDebuggerProps {
  symbol: string;
}

interface FundingDebugResult {
  assetCtxFunding?: number;
  predictedFundingsHlPerp?: number;
  predictedFundingsFirst?: number;
  activeAssetCtx?: number;
  fundingHistoryLatest?: number;
  directRestApi?: number;
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    margin: 8,
  },
  title: {
    marginBottom: 8,
  },
  results: {
    marginTop: 8,
  },
  resultText: {
    fontSize: 12,
    fontFamily: 'monospace',
  },
});

export const FundingRateDebugger: React.FC<FundingRateDebuggerProps> = ({
  symbol,
}) => {
  const [isDebugging, setIsDebugging] = useState(false);
  const [lastResults, setLastResults] = useState<FundingDebugResult | null>(
    null,
  );

  const runFundingDebug = useCallback(async () => {
    if (isDebugging) return;

    setIsDebugging(true);
    const results: FundingDebugResult = {};

    try {
      const perpsController = Engine.context.PerpsController;
      const isTestnet = perpsController.getCurrentNetwork() === 'testnet';

      // Create info client directly using SDK - same way the provider does it internally
      const wsUrl = getWebSocketEndpoint(isTestnet);
      const transport = new WebSocketTransport({
        url: wsUrl,
        ...HYPERLIQUID_TRANSPORT_CONFIG,
      });
      const infoClient = new InfoClient({ transport });

      DevLogger.log(`FUNDING_COMPARE [${symbol}] Starting debug...`);

      // 1. Get assetCtx.funding from metaAndAssetCtxs
      try {
        const [perpsMeta, assetCtxs] = await Promise.all([
          infoClient.meta(),
          infoClient.metaAndAssetCtxs(),
        ]);

        if (perpsMeta?.universe && assetCtxs?.[1]) {
          const assetIndex = perpsMeta.universe.findIndex(
            (asset) => asset.name === symbol,
          );
          if (assetIndex >= 0 && assetCtxs[1][assetIndex]) {
            const assetCtx = assetCtxs[1][assetIndex];
            if (assetCtx && 'funding' in assetCtx) {
              results.assetCtxFunding = parseFloat(assetCtx.funding);
            }
          }
        }
      } catch (error) {
        DevLogger.log(
          `FUNDING_COMPARE [${symbol}] metaAndAssetCtxs error:`,
          error,
        );
      }

      // 2. Get funding from predictedFundings
      try {
        const predictedFundings = await infoClient.predictedFundings();
        if (predictedFundings) {
          const fundingData = predictedFundings.find(
            ([assetSymbol]) => assetSymbol === symbol,
          );
          if (fundingData?.[1] && fundingData[1].length > 0) {
            // Get first exchange data
            const firstExchange = fundingData[1][0];
            if (firstExchange?.[1]?.fundingRate !== undefined) {
              results.predictedFundingsFirst = parseFloat(
                firstExchange[1].fundingRate,
              );
            }

            // Look specifically for HlPerp
            const hlPerpData = fundingData[1].find(
              ([exchangeName]) => exchangeName === 'HlPerp',
            );
            if (hlPerpData?.[1]?.fundingRate !== undefined) {
              results.predictedFundingsHlPerp = parseFloat(
                hlPerpData[1].fundingRate,
              );
            }
          }
        }
      } catch (error) {
        DevLogger.log(
          `FUNDING_COMPARE [${symbol}] predictedFundings error:`,
          error,
        );
      }

      // 3. Get latest funding from history
      try {
        const fundingHistory = await infoClient.fundingHistory({
          coin: symbol,
          startTime: Date.now() - 24 * 60 * 60 * 1000,
        });
        if (fundingHistory && fundingHistory.length > 0) {
          const latest = fundingHistory[fundingHistory.length - 1];
          if (latest?.fundingRate !== undefined) {
            results.fundingHistoryLatest = parseFloat(latest.fundingRate);
          }
        }
      } catch (error) {
        DevLogger.log(
          `FUNDING_COMPARE [${symbol}] fundingHistory error:`,
          error,
        );
      }

      // 4. Get funding rate directly from HyperLiquid REST API (bypassing SDK)
      try {
        const apiUrl = isTestnet
          ? 'https://api.hyperliquid-testnet.xyz/info'
          : 'https://api.hyperliquid.xyz/info';
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: 'metaAndAssetCtxs',
          }),
        });

        if (response.ok) {
          const data = await response.json();
          DevLogger.log(
            `FUNDING_COMPARE [${symbol}] Direct REST API raw response:`,
            {
              hasUniverse: !!data[0]?.universe,
              hasAssetCtxs: !!data[1],
              assetCtxsLength: data[1]?.length || 0,
            },
          );

          if (data[0]?.universe && data[1]) {
            const assetIndex = data[0].universe.findIndex(
              (asset: { name: string }) => asset.name === symbol,
            );
            if (assetIndex >= 0 && data[1][assetIndex]) {
              const assetCtx = data[1][assetIndex];
              if (assetCtx?.funding !== undefined) {
                results.directRestApi = parseFloat(assetCtx.funding);
                DevLogger.log(
                  `FUNDING_COMPARE [${symbol}] Direct REST API funding found:`,
                  {
                    symbol,
                    assetIndex,
                    rawFunding: assetCtx.funding,
                    parsedValue: results.directRestApi,
                    asPercentage:
                      (results.directRestApi * 100).toFixed(6) + '%',
                  },
                );
              }
            }
          }
        } else {
          DevLogger.log(
            `FUNDING_COMPARE [${symbol}] Direct REST API error: ${response.status} ${response.statusText}`,
          );
        }
      } catch (error) {
        DevLogger.log(
          `FUNDING_COMPARE [${symbol}] Direct REST API fetch error:`,
          error,
        );
      }

      // Log comprehensive comparison
      DevLogger.log(`FUNDING_COMPARE [${symbol}] Results:`, {
        assetCtxFunding:
          results.assetCtxFunding !== undefined
            ? `${results.assetCtxFunding} (${(
                results.assetCtxFunding * 100
              ).toFixed(6)}%)`
            : 'N/A',
        predictedFundingsHlPerp:
          results.predictedFundingsHlPerp !== undefined
            ? `${results.predictedFundingsHlPerp} (${(
                results.predictedFundingsHlPerp * 100
              ).toFixed(6)}%)`
            : 'N/A',
        predictedFundingsFirst:
          results.predictedFundingsFirst !== undefined
            ? `${results.predictedFundingsFirst} (${(
                results.predictedFundingsFirst * 100
              ).toFixed(6)}%)`
            : 'N/A',
        fundingHistoryLatest:
          results.fundingHistoryLatest !== undefined
            ? `${results.fundingHistoryLatest} (${(
                results.fundingHistoryLatest * 100
              ).toFixed(6)}%)`
            : 'N/A',
        directRestApi:
          results.directRestApi !== undefined
            ? `${results.directRestApi} (${(
                results.directRestApi * 100
              ).toFixed(6)}%)`
            : 'N/A',
      });

      // Format comparison output
      const formatValue = (value: number | undefined) =>
        value !== undefined ? `${(value * 100).toFixed(6)}%` : 'N/A';

      DevLogger.log(`FUNDING_COMPARE [${symbol}] SUMMARY:
- SDK assetCtx.funding: ${formatValue(results.assetCtxFunding)}
- SDK predictedFundings[HlPerp]: ${formatValue(results.predictedFundingsHlPerp)}
- SDK predictedFundings[First]: ${formatValue(results.predictedFundingsFirst)}
- SDK fundingHistory[Latest]: ${formatValue(results.fundingHistoryLatest)}
- DIRECT REST API: ${formatValue(results.directRestApi)}
- Compare with HyperLiquid Official: [ENTER MANUAL VALUE]`);

      setLastResults(results);
    } catch (error) {
      DevLogger.log(`FUNDING_COMPARE [${symbol}] Debug error:`, error);
    } finally {
      setIsDebugging(false);
    }
  }, [symbol, isDebugging]);

  return (
    <View style={styles.container}>
      <Text variant={TextVariant.BodySM} style={styles.title}>
        Funding Rate Debugger ({symbol})
      </Text>

      <Button
        variant={ButtonVariants.Primary}
        size={ButtonSize.Sm}
        label={isDebugging ? 'Running Debug...' : 'Debug Funding Rates'}
        onPress={runFundingDebug}
        disabled={isDebugging}
      />

      {lastResults && (
        <View style={styles.results}>
          <Text variant={TextVariant.BodySM} style={styles.resultText}>
            Last Results (check logs for details):
            {'\n'}assetCtx:{' '}
            {lastResults.assetCtxFunding !== undefined
              ? `${(lastResults.assetCtxFunding * 100).toFixed(6)}%`
              : 'N/A'}
            {'\n'}HlPerp:{' '}
            {lastResults.predictedFundingsHlPerp !== undefined
              ? `${(lastResults.predictedFundingsHlPerp * 100).toFixed(6)}%`
              : 'N/A'}
            {'\n'}First:{' '}
            {lastResults.predictedFundingsFirst !== undefined
              ? `${(lastResults.predictedFundingsFirst * 100).toFixed(6)}%`
              : 'N/A'}
            {'\n'}History:{' '}
            {lastResults.fundingHistoryLatest !== undefined
              ? `${(lastResults.fundingHistoryLatest * 100).toFixed(6)}%`
              : 'N/A'}
            {'\n'}REST API:{' '}
            {lastResults.directRestApi !== undefined
              ? `${(lastResults.directRestApi * 100).toFixed(6)}%`
              : 'N/A'}
          </Text>
        </View>
      )}
    </View>
  );
};
