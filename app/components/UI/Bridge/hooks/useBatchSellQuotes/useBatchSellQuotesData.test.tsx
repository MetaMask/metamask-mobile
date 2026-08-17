import React, { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { BigNumber } from 'bignumber.js';
import { BigNumber as EthersBigNumber } from 'ethers';
import { formatAddressToAssetId } from '@metamask/bridge-controller';
import type { CaipAssetType } from '@metamask/utils';

import '../../_mocks_/initialState';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { createBridgeTestState } from '../../testUtils';
import type { BridgeToken } from '../../types';
import formatFiat from '../../../../../util/formatFiat';
import { formatTokenBalance } from '../../utils';
import {
  selectBatchSellDestToken,
  selectBatchSellSlippages,
  selectBatchSellSourceTokenAmounts,
  selectBatchSellSourceTokens,
  setSourceAmount,
} from '../../../../../core/redux/slices/bridge';
import {
  BatchSellQuotesProvider,
  useBatchSellQuotesContext,
} from './BatchSellQuotesProvider';
import { useBatchSellQuoteData } from '../useBatchSellQuoteData';
import { runBatchSellQuoteDataCases } from '../quoteTestCases/runBatchSellQuoteDataCases';

jest.mock('../../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: {
      BridgeController: {
        state: {
          batchSellTrades: undefined,
          batchSellTradesLoadingStatus: undefined,
          quotesLoadingStatus: undefined,
        },
        updateBatchSellTrades: jest.fn().mockResolvedValue(undefined),
        updateBridgeQuoteRequestParams: jest.fn().mockResolvedValue(undefined),
        resetState: jest.fn(),
      },
      KeyringController: {
        state: {
          keyrings: [
            {
              accounts: ['0x1234567890123456789012345678901234567890'],
              type: 'HD Key Tree',
              metadata: {
                id: '01JKZ55Y6KPCYH08M6B9VSZWKW',
                name: '',
              },
            },
          ],
        },
      },
      NetworkController: {
        findNetworkClientIdByChainId: jest.fn(() => 'mainnet'),
        getNetworkClientById: jest.fn(() => ({
          configuration: {
            chainId: '0x1',
          },
        })),
      },
    },
  },
}));

jest.mock('../../../../../util/bridge/hooks/useValidateBridgeTx', () => ({
  __esModule: true,
  default: () => ({
    validateBridgeTx: jest.fn().mockResolvedValue({ status: 'SUCCESS' }),
  }),
}));

jest.mock('../../../../../selectors/currencyRateController', () => ({
  ...jest.requireActual('../../../../../selectors/currencyRateController'),
  selectCurrentCurrency: jest.fn(() => 'USD'),
}));

jest.mock('../../../../../util/Logger', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
    log: jest.fn(),
  },
}));

const Probe = ({
  onValue,
}: {
  onValue: (value: ReturnType<typeof useBatchSellQuotesContext>) => void;
}) => {
  onValue(useBatchSellQuotesContext());
  return null;
};

const formatTokenAmountWithSymbol = (
  amount: string | undefined,
  symbol: string | undefined,
) => {
  const tokenSymbol = symbol ? ` ${symbol}` : '';

  if (amount === undefined) return `--${tokenSymbol}`;

  return `${formatTokenBalance(amount)}${tokenSymbol}`;
};

const formatQuoteDisplayValue = ({
  amount,
  valueInCurrency,
  symbol,
}: {
  amount: string | undefined;
  valueInCurrency: string | null | undefined;
  symbol: string | undefined;
}) => {
  const hasTokenAmount = amount !== undefined;
  const hasNonZeroTokenAmount = hasTokenAmount && new BigNumber(amount).gt(0);
  const hasMissingDisplayValue =
    !valueInCurrency ||
    (new BigNumber(valueInCurrency).isZero() && hasNonZeroTokenAmount);

  if (hasMissingDisplayValue && hasTokenAmount) {
    return formatTokenAmountWithSymbol(amount, symbol);
  }

  if (!valueInCurrency) return '-';

  return formatFiat(new BigNumber(valueInCurrency), 'USD');
};

const mapToLegacyBatchSellQuoteData = (
  value: ReturnType<typeof useBatchSellQuotesContext>,
  sourceTokens: BridgeToken[],
  destToken?: BridgeToken,
) => {
  const destSymbol = destToken?.symbol ?? 'UNKNOWN';
  const isWaiting =
    value.isLoading || value.isSummaryLoading || value.hasPendingQuoteRows;

  return {
    ...value,
    tokenData: Object.fromEntries(
      sourceTokens.flatMap((token) => {
        const assetId = formatAddressToAssetId(token.address, token.chainId);
        if (!assetId) return [];
        const row = value.quotesByAssetId[assetId];
        const visibleQuote =
          value.hasAnyQuote &&
          row?.recommendedQuote &&
          row.isActiveQuoteForCurrentTokenPair
            ? row.recommendedQuote
            : null;
        const destAmount = visibleQuote?.quote.dest.normalizedAmount;
        const destValue = visibleQuote?.quote.dest.valueInCurrency;
        const quoteDestSymbol =
          visibleQuote?.quote.dest.asset.symbol ?? destSymbol;

        return [
          [
            assetId,
            {
              key: assetId,
              tokenSymbol: token.symbol,
              quote: visibleQuote,
              receivedAmount: formatTokenAmountWithSymbol(
                destAmount,
                quoteDestSymbol,
              ),
              receivedAmountFiat: visibleQuote
                ? formatQuoteDisplayValue({
                    amount: destAmount,
                    valueInCurrency: destValue,
                    symbol: quoteDestSymbol,
                  })
                : '-',
              priceImpact: visibleQuote?.quote.priceData?.priceImpact?.amount,
              isLoading: !visibleQuote && isWaiting,
              isHighPriceImpact: visibleQuote
                ? (row?.shouldShowPriceImpactWarning ?? false)
                : false,
              isQuoteUnavailable: !visibleQuote && !isWaiting,
            },
          ],
        ];
      }),
    ),
  };
};

const Harness = ({
  onValue,
}: {
  onValue: (value: ReturnType<typeof useBatchSellQuoteData>) => void;
}) => {
  const sourceTokens = useSelector(selectBatchSellSourceTokens);
  const destToken = useSelector(selectBatchSellDestToken);
  const sourceTokenAmounts = useSelector(selectBatchSellSourceTokenAmounts);
  const slippages = useSelector(selectBatchSellSlippages);
  const latestSourceAtomicBalances = useMemo(
    () =>
      sourceTokens.reduce<
        Partial<Record<CaipAssetType, EthersBigNumber | undefined>>
      >((balances, token) => {
        const assetId = formatAddressToAssetId(token.address, token.chainId);
        if (assetId) {
          balances[assetId] = EthersBigNumber.from('10000000000000000000');
        }
        return balances;
      }, {}),
    [sourceTokens],
  );

  return (
    <BatchSellQuotesProvider
      config={{
        sourceTokens,
        destToken,
        sourceTokenAmounts,
        slippages,
        walletAddress: '0x1234567890123456789012345678901234567890',
        latestSourceAtomicBalances,
      }}
    >
      <Probe
        onValue={(value) => {
          onValue(
            mapToLegacyBatchSellQuoteData(
              value,
              sourceTokens,
              destToken,
            ) as unknown as ReturnType<typeof useBatchSellQuoteData>,
          );
        }}
      />
    </BatchSellQuotesProvider>
  );
};

runBatchSellQuoteDataCases(() => {
  const box: { current: ReturnType<typeof useBatchSellQuoteData> } = {
    current: undefined as never,
  };
  let flushCount = 0;
  const view = renderWithProvider(
    <Harness
      onValue={(value) => {
        box.current = value;
      }}
    />,
    { state: createBridgeTestState() },
    false,
  );

  return {
    result: box,
    rerender: () => {
      flushCount += 1;
      view.store.dispatch(setSourceAmount(`flush-${flushCount}`));
      view.rerender(
        <Harness
          onValue={(value) => {
            box.current = value;
          }}
        />,
      );
    },
  };
}, { implementation: 'copied' });
