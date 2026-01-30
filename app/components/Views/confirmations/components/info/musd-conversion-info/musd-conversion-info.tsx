import React, { useCallback, useEffect } from 'react';
import { useParams } from '../../../../../../util/navigation/navUtils';
import OutputAmountTag from '../../../../../UI/Earn/components/OutputAmountTag';
import {
  MUSD_TOKEN,
  MUSD_TOKEN_ADDRESS_BY_CHAIN,
} from '../../../../../UI/Earn/constants/musd';
import { useCustomAmount } from '../../../hooks/earn/useCustomAmount';
import { useAddToken } from '../../../hooks/tokens/useAddToken';
import { PayWithRow } from '../../rows/pay-with-row';
import { CustomAmountInfo } from '../custom-amount-info';
import { useTransactionPayAvailableTokens } from '../../../hooks/pay/useTransactionPayAvailableTokens';
import { useMusdConversionNavbar } from '../../../../../UI/Earn/hooks/useMusdConversionNavbar';
import { useMusdConversionQuoteTrace } from '../../../../../UI/Earn/hooks/useMusdConversionQuoteTrace';
import { endTrace, TraceName } from '../../../../../../util/trace';
import { Hex } from '@metamask/utils';

interface MusdOverrideContentProps {
  amountHuman: string;
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

interface MusdConversionConfirmationParams {
  preferredPaymentToken: {
    address: Hex;
    chainId: Hex;
  };
}

export const MusdConversionInfo = () => {
  const { preferredPaymentToken } =
    useParams<Partial<MusdConversionConfirmationParams>>();

  if (!preferredPaymentToken?.chainId) {
    throw new Error('Preferred payment token chainId is required');
  }

  const { decimals, name, symbol } = MUSD_TOKEN;

  const tokenToAddAddress =
    MUSD_TOKEN_ADDRESS_BY_CHAIN?.[preferredPaymentToken.chainId];

  if (!tokenToAddAddress) {
    throw new Error(
      `mUSD token address not found for chain ID: ${preferredPaymentToken.chainId}`,
    );
  }

  useMusdConversionNavbar();

  const { startQuoteTrace } = useMusdConversionQuoteTrace();

  // End navigation trace on first paint
  useEffect(() => {
    endTrace({
      name: TraceName.MusdConversionNavigation,
      data: {
        chainId: preferredPaymentToken.chainId,
      },
    });
  }, [preferredPaymentToken.chainId]);

  useAddToken({
    chainId: preferredPaymentToken.chainId,
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
