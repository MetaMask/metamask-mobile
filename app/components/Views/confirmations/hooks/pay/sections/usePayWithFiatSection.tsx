import React, { useMemo } from 'react';
import { useNavigation } from '@react-navigation/native';
import { PaymentType } from '@consensys/on-ramp-sdk/dist/API';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../../locales/i18n';
import PaymentMethodIcon from '../../../../../UI/Ramp/Aggregator/components/PaymentMethodIcon';
import {
  PayWithRowConfig,
  PayWithSectionConfig,
} from '../../../components/modals/pay-with-bottom-sheet/pay-with-bottom-sheet.types';
import { useFiatPaymentHighlightedActions } from '../useFiatPaymentHighlightedActions';
import { useClearPaymentOverride } from './useClearPaymentOverride';

export const PAY_WITH_BANK_CARD_SECTION_TEST_ID = 'pay-with-section-bank-card';

const PAYMENT_METHOD_ICON_SIZE = 20;

export function usePayWithFiatSection(): PayWithSectionConfig | null {
  const fiatItems = useFiatPaymentHighlightedActions();
  const navigation = useNavigation();
  const tw = useTailwind();
  const iconColor = tw.color('icon-alternative');
  const clearPaymentOverride = useClearPaymentOverride();

  return useMemo(() => {
    if (fiatItems.length === 0) {
      return null;
    }

    const rows: PayWithRowConfig[] = fiatItems.map((item) => {
      const rowKey = item.paymentType ?? item.name;
      const isSelected = item.isSelected ?? false;

      const onPress = isSelected
        ? () => navigation.goBack()
        : () => {
            clearPaymentOverride();
            item.action?.();
          };

      return {
        id: `pay-with-fiat-${rowKey}`,
        icon: React.createElement(PaymentMethodIcon, {
          paymentMethodType: item.paymentType as PaymentType | undefined,
          size: PAYMENT_METHOD_ICON_SIZE,
          color: iconColor,
        }),
        title: item.name,
        subtitle: item.name_description,
        isSelected,
        isLastUsed: false,
        trailingElement: isSelected ? 'checkmark' : 'none',
        onPress,
        testID: `pay-with-fiat-${rowKey}-row`,
      };
    });

    return {
      id: 'bank-card',
      title: strings('confirm.pay_with_bottom_sheet.bank_and_card'),
      testID: PAY_WITH_BANK_CARD_SECTION_TEST_ID,
      rows,
    };
  }, [clearPaymentOverride, fiatItems, iconColor, navigation]);
}
