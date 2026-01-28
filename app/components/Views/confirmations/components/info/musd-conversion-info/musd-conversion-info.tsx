import { Hex } from '@metamask/utils';
import React, { useCallback, useEffect } from 'react';
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
import { useMusdConversionQuoteTrace } from '../../../../../UI/Earn/hooks/useMusdConversionQuoteTrace';
import { endTrace, TraceName } from '../../../../../../util/trace';

interface MusdOverrideContentProps {
  amountHuman: string;
}

interface MusdConversionInfoContentProps {
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
  outputChainId,
  preferredPaymentToken,
}: MusdConversionInfoContentProps) => {
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
      outputChainId={outputChainId}
      preferredPaymentToken={preferredPaymentToken}
    />
  );
};
