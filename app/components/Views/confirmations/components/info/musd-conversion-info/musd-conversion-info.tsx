import React, { useCallback } from 'react';
import { CustomAmountInfo } from '../custom-amount-info';
import {
  MUSD_TOKEN,
  MUSD_TOKEN_ADDRESS_BY_CHAIN,
} from '../../../../../UI/Earn/constants/musd';
import { useAddToken } from '../../../hooks/tokens/useAddToken';
import { MusdConversionConfig } from '../../../../../UI/Earn/hooks/useMusdConversion';
import { useParams } from '../../../../../../util/navigation/navUtils';
import { useCustomAmountRewards } from '../../../hooks/earn/useCustomAmountRewards';
import OutputAmountTag from '../../../../../UI/Earn/components/OutputAmountTag';
import RewardsTag from '../../../../../UI/Earn/components/RewardsTag';
import { PayWithRow } from '../../rows/pay-with-row';

interface MusdOverrideContentProps {
  amountHuman: string;
}

const MusdOverrideContent: React.FC<MusdOverrideContentProps> = ({
  amountHuman,
}) => {
  const {
    shouldShowRewardsTag,
    estimatedPoints,
    onRewardsTagPress,
    shouldShowOutputAmountTag,
    outputAmount,
    outputSymbol,
    renderRewardsTooltip,
  } = useCustomAmountRewards({ amountHuman });

  return (
    <>
      {shouldShowOutputAmountTag && outputAmount !== null && (
        <OutputAmountTag
          amount={outputAmount}
          symbol={outputSymbol ?? undefined}
          showBackground={false}
        />
      )}
      <PayWithRow />
      {shouldShowRewardsTag && estimatedPoints !== null && (
        <RewardsTag
          points={estimatedPoints}
          onPress={onRewardsTagPress}
          showBackground={false}
        />
      )}
      {renderRewardsTooltip()}
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
    />
  );
};
