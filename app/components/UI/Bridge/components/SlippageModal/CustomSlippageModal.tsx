import React, { useCallback, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { strings } from '../../../../../../locales/i18n';
import { CaipChainId, Hex } from '@metamask/utils';
import CustomSlippageBottomSheet from '../../../CustomSlippageBottomSheet';
import { useSlippageConfig } from '../../hooks/useSlippageConfig';
import { useSlippageStepperDescription } from '../../hooks/useSlippageStepperDescription';
import { useShouldDisableCustomSlippageConfirm } from '../../hooks/useShouldDisableCustomSlippageConfirm';

interface CustomSlippageModalContentProps {
  initialSlippage?: string;
  sourceChainId?: CaipChainId | Hex;
  destChainId?: CaipChainId | Hex;
  onConfirmSlippage: (slippage: string) => void;
}

export const CustomSlippageModalContent = ({
  initialSlippage,
  sourceChainId,
  destChainId,
  onConfirmSlippage,
}: CustomSlippageModalContentProps) => {
  const navigation = useNavigation();
  const slippageConfig = useSlippageConfig({ sourceChainId, destChainId });
  const [inputAmount, setInputAmount] = useState(initialSlippage ?? '0');
  const [hasAttemptedToExceedMax, setHasAttemptedToExceedMax] = useState(false);
  const shouldDisableConfirm = useShouldDisableCustomSlippageConfirm({
    inputAmount,
    slippageConfig,
  });
  const description = useSlippageStepperDescription({
    inputAmount,
    slippageConfig,
    hasAttemptedToExceedMax,
  });

  const handleClose = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  return (
    <CustomSlippageBottomSheet
      title={strings('bridge.slippage')}
      primaryButtonLabel={strings('bridge.confirm')}
      secondaryButtonLabel={strings('bridge.cancel')}
      value={inputAmount}
      onValueChange={setInputAmount}
      minAmount={slippageConfig.min_amount}
      maxAmount={slippageConfig.max_amount}
      step={slippageConfig.input_step}
      inputMaxDecimals={slippageConfig.input_max_decimals}
      description={description}
      isConfirmDisabled={shouldDisableConfirm}
      onAttemptExceedMaxChange={setHasAttemptedToExceedMax}
      goBack={handleClose}
      onClose={handleClose}
      onConfirm={onConfirmSlippage}
    />
  );
};
