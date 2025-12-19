import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { TransactionType } from '@metamask/transaction-controller';
import { RootState } from '../../../../../../reducers';
import { selectCurrentCurrency } from '../../../../../../selectors/currencyRateController';
import { earnSelectors } from '../../../../../../selectors/earnController/earn';
import {
  renderFromTokenMinimalUnit,
  addCurrencySymbol,
} from '../../../../../../util/number';
import { useTransactionMetadataRequest } from '../../../hooks/transactions/useTransactionMetadataRequest';
import { strings } from '../../../../../../../locales/i18n';
import { CHAIN_ID_TO_AAVE_POOL_CONTRACT } from '@metamask/stake-sdk';
import { getDecimalChainId } from '../../../../../../util/networks';
import { TokenI } from '../../../../../UI/Tokens/types';
import {
  decodeLendingTransactionData,
  getLendingTransactionInfo,
  LendingTransactionInfo,
} from '../../../../../UI/Earn/utils';
import { getEstimatedAnnualRewards } from '../../../../../UI/Earn/utils/token';
import { useTransactionBatchesMetadata } from '../../../hooks/transactions/useTransactionBatchesMetadata';

export interface LendingDepositDetails {
  tokenSymbol: string;
  tokenAmount: string;
  tokenFiat: string;
  apr: string;
  aprNumeric: number;
  annualRewardsFiat: string;
  annualRewardsToken: string;
  rewardFrequency: string;
  withdrawalTime: string;
  protocol: string;
  protocolContractAddress: string;
  receiptTokenSymbol: string;
  receiptTokenName: string;
  receiptTokenAmount: string;
  receiptTokenAmountFiat: string;
  receiptTokenImage: string;
  amountMinimalUnit: string;
  tokenDecimals: number;
  token: Partial<TokenI>;
}

export const useLendingDepositDetails = (): LendingDepositDetails | null => {
  const transactionMeta = useTransactionMetadataRequest();
  const transactionBatchesMetadata = useTransactionBatchesMetadata();
  const currentCurrency = useSelector(selectCurrentCurrency);

  // Get lending info from transactionMeta OR transactionBatchesMetadata
  const lendingInfo = useMemo((): LendingTransactionInfo | null => {
    // Try transactionMeta first (7702 flow)
    if (transactionMeta) {
      return getLendingTransactionInfo(transactionMeta);
    }

    // Fallback to transactionBatchesMetadata (non-7702 like Linea)
    if (transactionBatchesMetadata?.transactions) {
      const lendingTx = transactionBatchesMetadata.transactions.find(
        (tx) =>
          tx.type === TransactionType.lendingDeposit ||
          tx.type === TransactionType.lendingWithdraw,
      );
      // @ts-expect-error TODO: fix this type mismatch
      if (lendingTx?.params?.data) {
        return {
          type: lendingTx.type as
            | TransactionType.lendingDeposit
            | TransactionType.lendingWithdraw,
          // @ts-expect-error TODO: fix this type mismatch
          data: lendingTx.params?.data as string,
        };
      }
    }

    return null;
  }, [transactionMeta, transactionBatchesMetadata]);

  // Decode the transaction data
  const decodedData = useMemo(() => {
    if (!lendingInfo) return null;
    return decodeLendingTransactionData(lendingInfo);
  }, [lendingInfo]);

  // Get chainId from either source
  const chainId =
    transactionMeta?.chainId ?? transactionBatchesMetadata?.chainId;

  // Create a token-like object for the selector
  const tokenAsset = useMemo((): TokenI | null => {
    if (!chainId || !decodedData?.tokenAddress) return null;
    return {
      chainId,
      address: decodedData.tokenAddress,
      isETH: false,
    } as TokenI;
  }, [chainId, decodedData?.tokenAddress]);

  // Get earn token pair from selector
  const earnTokenPair = useSelector((state: RootState) =>
    tokenAsset ? earnSelectors.selectEarnTokenPair(state, tokenAsset) : null,
  );

  const earnToken = earnTokenPair?.earnToken;
  const outputToken = earnTokenPair?.outputToken;

  // Calculate token amount and fiat values
  const {
    tokenAmount,
    tokenFiat,
    amountFiatNumber,
    annualRewardsFiat,
    annualRewardsToken,
  } = useMemo(() => {
    if (!earnToken || !decodedData?.amountMinimalUnit) {
      return {
        tokenAmount: '0',
        tokenFiat: '0',
        amountFiatNumber: 0,
        annualRewardsFiat: '',
        annualRewardsToken: '',
      };
    }

    const amountMinimalUnit = decodedData.amountMinimalUnit;
    const decimals = earnToken.decimals || 18;
    const symbol = earnToken.ticker || earnToken.symbol || '';

    // Calculate token amount from minimal units
    const amount = parseFloat(
      renderFromTokenMinimalUnit(amountMinimalUnit, decimals),
    );

    // Use tokenUsdExchangeRate from earnToken (direct token to USD rate)
    const tokenUsdRate = earnToken.tokenUsdExchangeRate || 0;
    const fiatValue = amount * tokenUsdRate;

    // Use the same utility function as the original component
    const apr = earnToken.experience?.apr || '0';
    const estimatedRewards = getEstimatedAnnualRewards(
      apr,
      fiatValue,
      amountMinimalUnit,
      currentCurrency,
      decimals,
      symbol,
    );

    return {
      tokenAmount: amount.toString(),
      tokenFiat: fiatValue.toString(),
      amountFiatNumber: fiatValue,
      annualRewardsFiat: estimatedRewards.estimatedAnnualRewardsFormatted,
      annualRewardsToken: estimatedRewards.estimatedAnnualRewardsTokenFormatted,
    };
  }, [earnToken, decodedData, currentCurrency]);

  if (
    (!transactionMeta && !transactionBatchesMetadata) ||
    !earnToken ||
    !decodedData ||
    !chainId ||
    !outputToken
  ) {
    return null;
  }

  const tokenSymbol = earnToken.ticker || earnToken.symbol || '';
  // APR value without % suffix - view will add it
  const apr = earnToken.experience?.apr || '0';

  // Extract numeric APR value (remove % sign if present)
  const aprNumeric = parseFloat(String(apr).replace('%', '')) || 0;

  // Get protocol contract address
  const protocolContractAddress =
    CHAIN_ID_TO_AAVE_POOL_CONTRACT[getDecimalChainId(chainId)] ?? '';

  const tokenDecimals = earnToken.decimals || 18;

  // Create token object for hero component
  const token: Partial<TokenI> = {
    address: decodedData.tokenAddress,
    symbol: earnToken.ticker || earnToken.symbol || '',
    decimals: tokenDecimals,
    image: earnToken.image || '',
    name: earnToken.name || '',
    chainId,
    isNative: false,
  };

  // Format receipt token amount like the original (amount + symbol)
  const formattedReceiptTokenAmount = `${renderFromTokenMinimalUnit(
    decodedData.amountMinimalUnit,
    earnToken.decimals,
  )} ${outputToken.ticker || outputToken.symbol || ''}`;

  return {
    tokenSymbol,
    tokenAmount,
    tokenFiat,
    apr,
    aprNumeric,
    annualRewardsFiat,
    annualRewardsToken,
    rewardFrequency: strings('earn.every_minute'),
    withdrawalTime: strings('earn.immediate'),
    protocol: 'Aave',
    protocolContractAddress,
    receiptTokenSymbol: outputToken.ticker || outputToken.symbol || '',
    receiptTokenName:
      outputToken.name || outputToken.ticker || outputToken.symbol || '',
    receiptTokenAmount: formattedReceiptTokenAmount,
    receiptTokenAmountFiat: addCurrencySymbol(
      amountFiatNumber.toString(),
      currentCurrency,
    ),
    receiptTokenImage: outputToken.image || '',
    amountMinimalUnit: decodedData.amountMinimalUnit,
    tokenDecimals,
    token,
  };
};
