import { Hex } from '@metamask/utils';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { useParams } from '../../../../../../util/navigation/navUtils';
import OutputAmountTag from '../../../../../UI/Earn/components/OutputAmountTag';
import {
  MUSD_TOKEN,
  MUSD_TOKEN_ADDRESS_BY_CHAIN,
} from '../../../../../UI/Earn/constants/musd';
import { MusdConversionConfig } from '../../../../../UI/Earn/hooks/useMusdConversion';
import { useCustomAmount } from '../../../hooks/earn/useCustomAmount';
import { useAddToken } from '../../../hooks/tokens/useAddToken';
import { PayWithRow } from '../../rows/pay-with-row';
import { CustomAmountInfo } from '../custom-amount-info';
import { useTransactionPayAvailableTokens } from '../../../hooks/pay/useTransactionPayAvailableTokens';
import { useMusdConversionNavbar } from '../../../../../UI/Earn/hooks/useMusdConversionNavbar';
import { useTransactionMetadataRequest } from '../../../hooks/transactions/useTransactionMetadataRequest';
import { useTransactionPayToken } from '../../../hooks/pay/useTransactionPayToken';
import { useMusdConversionQuoteTrace } from '../../../../../UI/Earn/hooks/useMusdConversionQuoteTrace';
import { endTrace, TraceName } from '../../../../../../util/trace';
import {
  replaceMusdConversionTransactionForPayToken,
  type PayTokenSelection,
} from '../../../../../UI/Earn/utils/replaceMusdConversionTransactionForPayToken';

interface MusdOverrideContentProps {
  amountHuman: string;
}

interface MusdConversionInfoContentProps {
  transactionMeta: NonNullable<
    ReturnType<typeof useTransactionMetadataRequest>
  >;
  outputChainId: Hex;
  preferredPaymentToken: MusdConversionConfig['preferredPaymentToken'];
}

const MusdOverrideContent: React.FC<MusdOverrideContentProps> = ({
  amountHuman,
}) => {
  const { shouldShowOutputAmountTag, outputAmount, outputSymbol } =
    useCustomAmount({ amountHuman });

  const availableTokens = useTransactionPayAvailableTokens();
  const hasTokens = availableTokens.length > 0;

  return (
    <>
      {shouldShowOutputAmountTag && outputAmount !== null && (
        <OutputAmountTag
          amount={outputAmount}
          symbol={outputSymbol ?? undefined}
          showBackground={false}
        />
      )}
      {hasTokens && <PayWithRow />}
    </>
  );
};

const MusdConversionInfoContent = ({
  transactionMeta,
  outputChainId,
  preferredPaymentToken,
}: MusdConversionInfoContentProps) => {
  const { payToken, setPayToken } = useTransactionPayToken();

  const lastSameChainPayToken = useRef<PayTokenSelection | null>(null);
  const isReplacementInFlight = useRef(false);
  const replacementAttemptCount = useRef(0);

  const selectedPayToken = useMemo<PayTokenSelection | null>(() => {
    if (!payToken?.address || !payToken?.chainId) {
      return null;
    }

    return {
      address: payToken.address as Hex,
      chainId: payToken.chainId as Hex,
    };
  }, [payToken?.address, payToken?.chainId]);

  const { decimals, name, symbol } = MUSD_TOKEN;

  const tokenToAddAddress = MUSD_TOKEN_ADDRESS_BY_CHAIN?.[outputChainId];

  if (!tokenToAddAddress) {
    throw new Error(
      `mUSD token address not found for chain ID: ${outputChainId}`,
    );
  }

  useMusdConversionNavbar();

  const { startQuoteTrace } = useMusdConversionQuoteTrace();

  // End navigation trace on first paint
  useEffect(() => {
    endTrace({
      name: TraceName.MusdConversionNavigation,
      data: {
        outputChainId,
      },
    });
  }, [outputChainId]);

  useAddToken({
    chainId: outputChainId,
    decimals,
    name,
    symbol,
    tokenAddress: tokenToAddAddress,
  });

  // Store the last same-chain pay token to revert to if the replacement fails.
  useEffect(() => {
    if (
      selectedPayToken?.chainId &&
      selectedPayToken.chainId.toLowerCase() === outputChainId.toLowerCase()
    ) {
      lastSameChainPayToken.current = selectedPayToken;
    }
  }, [outputChainId, selectedPayToken, transactionMeta.id]);

  const replaceMusdConversionTransaction = useCallback(
    async (newPayToken: PayTokenSelection) => {
      const newTransactionId =
        await replaceMusdConversionTransactionForPayToken(
          transactionMeta,
          newPayToken,
        );

      if (!newTransactionId) {
        const fallbackPayToken = lastSameChainPayToken.current;
        if (fallbackPayToken) {
          setPayToken(fallbackPayToken);
        }
      }
    },
    [setPayToken, transactionMeta],
  );

  useEffect(() => {
    if (!selectedPayToken) {
      return;
    }

    // If a replacement is already in flight, we don't need to run it again.
    if (isReplacementInFlight.current) {
      return;
    }

    // If the selected pay token is on the same chain as the output chain,
    // we don't need to replace the transaction.
    if (
      selectedPayToken.chainId.toLowerCase() === outputChainId.toLowerCase()
    ) {
      return;
    }

    // TODO: Reminder to remove if not necessary anymore.
    replacementAttemptCount.current += 1;

    const runReplacement = async () => {
      isReplacementInFlight.current = true;

      try {
        await replaceMusdConversionTransaction(selectedPayToken);
      } catch (error) {
        console.error(
          '[mUSD Conversion] Unexpected error during chain replacement',
          error,
        );
      } finally {
        isReplacementInFlight.current = false;
      }
    };

    runReplacement().catch(() => undefined);
  }, [
    outputChainId,
    replaceMusdConversionTransaction,
    selectedPayToken,
    transactionMeta.id,
  ]);

  const renderOverrideContent = useCallback(
    (amountHuman: string) => <MusdOverrideContent amountHuman={amountHuman} />,
    [],
  );

  return (
    <CustomAmountInfo
      preferredToken={preferredPaymentToken}
      overrideContent={renderOverrideContent}
      hasMax
      onAmountSubmit={startQuoteTrace}
    />
  );
};

export const MusdConversionInfo = () => {
  const { preferredPaymentToken } = useParams<MusdConversionConfig>();
  const transactionMeta = useTransactionMetadataRequest();
  const outputChainId = transactionMeta?.chainId;

  if (!transactionMeta || !outputChainId) {
    return null;
  }

  return (
    <MusdConversionInfoContent
      transactionMeta={transactionMeta}
      outputChainId={outputChainId}
      preferredPaymentToken={preferredPaymentToken}
    />
  );
};
