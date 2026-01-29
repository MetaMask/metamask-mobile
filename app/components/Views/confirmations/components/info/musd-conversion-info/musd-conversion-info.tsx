import React, { useCallback } from 'react';
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
import { strings } from '../../../../../../../locales/i18n';

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

export const MusdConversionInfo = () => {
  const { outputChainId, preferredPaymentToken } =
    useParams<MusdConversionConfig>();

  const { decimals, name, symbol } = MUSD_TOKEN;

  const tokenToAddAddress = MUSD_TOKEN_ADDRESS_BY_CHAIN?.[outputChainId];

  if (!tokenToAddAddress) {
    throw new Error(
      `mUSD token address not found for chain ID: ${outputChainId}`,
    );
  }

  useMusdConversionNavbar(outputChainId);

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
      footerText={strings('earn.musd_conversion.powered_by_relay')}
      hasMax
    />
  );
};
