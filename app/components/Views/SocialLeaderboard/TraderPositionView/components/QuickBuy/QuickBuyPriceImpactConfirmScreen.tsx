import React, { useCallback, useState } from 'react';
import { PriceImpactHeader } from '../../../../../UI/Bridge/components/PriceImpactModal/PriceImpactHeader';
import { PriceImpactDescription } from '../../../../../UI/Bridge/components/PriceImpactModal/PriceImpactDescription';
import { PriceImpactFooter } from '../../../../../UI/Bridge/components/PriceImpactModal/PriceImpactFooter';
import { PriceImpactModalType } from '../../../../../UI/Bridge/components/PriceImpactModal/constants';
import { usePriceImpactFiat } from '../../../../../UI/Bridge/hooks/usePriceImpactFiat';
import { useQuickBuyContext } from './useQuickBuyContext';

const QuickBuyPriceImpactConfirmScreen: React.FC = () => {
  const {
    activeQuote,
    formattedPriceImpact,
    priceImpactViewData,
    setActiveScreen,
    handleConfirm,
    isSubmittingTx,
  } = useQuickBuyContext();

  const [loading, setLoading] = useState(false);

  const formattedPriceImpactFiat = usePriceImpactFiat(activeQuote);

  const handleClose = useCallback(() => {
    setActiveScreen('amount');
  }, [setActiveScreen]);

  const handleProceed = useCallback(async () => {
    setLoading(true);
    await handleConfirm();
    setLoading(false);
  }, [handleConfirm]);

  return (
    <>
      <PriceImpactHeader
        onClose={handleClose}
        iconName={priceImpactViewData.icon?.name}
        iconColor={priceImpactViewData.icon?.color}
        content={priceImpactViewData.title}
      />
      <PriceImpactDescription
        formattedPriceImpact={formattedPriceImpact}
        content={priceImpactViewData.description}
        isDanger
        formattedPriceImpactFiat={formattedPriceImpactFiat}
      />
      <PriceImpactFooter
        type={PriceImpactModalType.Execution}
        onCancel={handleProceed}
        onConfirm={handleClose}
        loading={loading || isSubmittingTx}
      />
    </>
  );
};

export default QuickBuyPriceImpactConfirmScreen;
