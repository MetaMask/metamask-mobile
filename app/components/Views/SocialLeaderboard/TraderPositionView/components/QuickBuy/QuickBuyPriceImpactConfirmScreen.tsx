import React, { useCallback, useState } from 'react';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../locales/i18n';
import { PriceImpactHeader } from '../../../../../UI/Bridge/components/PriceImpactModal/PriceImpactHeader';
import { PriceImpactFooter } from '../../../../../UI/Bridge/components/PriceImpactModal/PriceImpactFooter';
import { PriceImpactModalType } from '../../../../../UI/Bridge/components/PriceImpactModal/constants';
import { usePriceImpactFiat } from '../../../../../UI/Bridge/hooks/usePriceImpactFiat';
import { useQuickBuyContext } from './useQuickBuyContext';

// This screen is only ever mounted at the error case for high-price-impact swaps
const QuickBuyPriceImpactConfirmScreen: React.FC = () => {
  const {
    activeQuote,
    formattedPriceImpact,
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
    try {
      await handleConfirm();
    } finally {
      setLoading(false);
    }
  }, [handleConfirm]);

  return (
    <>
      <PriceImpactHeader
        onClose={handleClose}
        iconName={IconName.Warning}
        iconColor={IconColor.ErrorDefault}
        content="bridge.price_impact_error_title"
      />

      <Box twClassName="px-4 py-2" gap={4}>
        <Text
          variant={TextVariant.BodyMd}
          color={TextColor.TextAlternative}
          twClassName="text-center"
          testID="price-impact-description"
        >
          {strings('bridge.price_impact_error_description', {
            priceImpact: formattedPriceImpact ?? '0%',
          })}
        </Text>

        {formattedPriceImpactFiat && (
          <Box
            twClassName="bg-error-muted rounded-2xl pl-6 pr-4 py-3"
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            gap={4}
            testID="price-impact-fiat-banner"
          >
            <Icon
              name={IconName.Warning}
              size={IconSize.Md}
              color={IconColor.ErrorDefault}
            />
            <Text
              variant={TextVariant.BodyMd}
              color={TextColor.ErrorDefault}
              twClassName="flex-1"
              testID="price-impact-fiat-text"
            >
              {strings('bridge.price_impact_fiat_alert', {
                priceImpactFiat: formattedPriceImpactFiat,
              })}
            </Text>
          </Box>
        )}
      </Box>

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
