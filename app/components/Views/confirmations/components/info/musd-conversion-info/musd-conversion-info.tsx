import { providerErrors } from '@metamask/rpc-errors';
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
import Engine from '../../../../../../core/Engine';
import EngineService from '../../../../../../core/EngineService';
import { getTokenTransferData } from '../../../utils/transaction-pay';
import { parseStandardTokenTransactionData } from '../../../utils/transaction';
import { useMusdConversionQuoteTrace } from '../../../../../UI/Earn/hooks/useMusdConversionQuoteTrace';
import { endTrace, TraceName } from '../../../../../../util/trace';
import { createMusdConversionTransaction } from '../../../../../UI/Earn/utils/createMusdConversionTransaction';

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

interface PayTokenSelection {
  address: Hex;
  chainId: Hex;
}

function getHexFromEthersBigNumberLike(value: unknown): string | undefined {
  if (!value || typeof value !== 'object') {
    return undefined;
  }

  const maybeHex = (value as { _hex?: unknown })._hex;
  if (typeof maybeHex === 'string') {
    return maybeHex;
  }

  const toHexString = (value as { toHexString?: unknown }).toHexString;
  if (typeof toHexString === 'function') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (toHexString as any).call(value) as string;
  }

  return undefined;
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
      if (!transactionMeta?.id || !transactionMeta?.txParams?.from) {
        console.error(
          '[mUSD Conversion] Missing transaction metadata for replacement',
          { transactionMeta },
        );
        return;
      }

      const newChainId = newPayToken.chainId;

      const musdTokenAddress = MUSD_TOKEN_ADDRESS_BY_CHAIN[newChainId];
      if (!musdTokenAddress) {
        console.error(
          '[mUSD Conversion] mUSD not supported on selected chain',
          { newChainId },
        );

        const fallbackPayToken = lastSameChainPayToken.current;
        if (fallbackPayToken) {
          setPayToken(fallbackPayToken);
        }

        return;
      }

      const tokenTransferData = getTokenTransferData(transactionMeta);

      const parsedTokenTransferData = parseStandardTokenTransactionData(
        tokenTransferData?.data,
      );

      const recipientAddress =
        (parsedTokenTransferData?.args?._to?.toString() as Hex | undefined) ??
        (transactionMeta.txParams.from as Hex);

      const amountHex =
        getHexFromEthersBigNumberLike(parsedTokenTransferData?.args?._value) ??
        '0x0';

      try {
        const { transactionId: newTransactionId } =
          await createMusdConversionTransaction({
            outputChainId: newChainId,
            // TODO: May be able to simplify this by selecting active account address like we do in useMusdConversion > initiateConversion.
            fromAddress: transactionMeta.txParams.from as Hex,
            recipientAddress,
            amountHex,
          });

        const {
          GasFeeController,
          TransactionPayController,
          ApprovalController,
        } = Engine.context;

        const { NetworkController } = Engine.context;
        const networkClientId =
          NetworkController.findNetworkClientIdByChainId(newChainId);

        GasFeeController.fetchGasFeeEstimates({ networkClientId }).catch(
          () => undefined,
        );

        TransactionPayController.updatePaymentToken({
          transactionId: newTransactionId,
          tokenAddress: newPayToken.address,
          chainId: newPayToken.chainId,
        });

        EngineService.flushState();

        ApprovalController.reject(
          transactionMeta.id,
          providerErrors.userRejectedRequest(),
        );
      } catch (error) {
        console.error(
          '[mUSD Conversion] Failed to replace transaction on chain change',
          error,
        );

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

    if (isReplacementInFlight.current) {
      return;
    }

    if (
      selectedPayToken.chainId.toLowerCase() === outputChainId.toLowerCase()
    ) {
      return;
    }

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
