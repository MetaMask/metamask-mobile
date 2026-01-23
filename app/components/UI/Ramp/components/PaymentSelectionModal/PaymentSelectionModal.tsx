import React, { useCallback, useRef } from 'react';
import { useWindowDimensions } from 'react-native';
import { FlatList } from 'react-native-gesture-handler';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../component-library/components/BottomSheets/BottomSheet';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../component-library/components/Texts/Text';
import {
  Box,
  BoxFlexDirection,
  BoxAlignItems,
  BoxJustifyContent,
} from '@metamask/design-system-react-native';
import { useStyles } from '../../../../hooks/useStyles';
import { strings } from '../../../../../../locales/i18n';
import styleSheet from './PaymentSelectionModal.styles';
import Routes from '../../../../../constants/navigation/Routes';
import { createNavigationDetails } from '../../../../../util/navigation/navUtils';
import ProviderPill from './ProviderPill';
import PaymentMethodListItem from './PaymentMethodListItem';
import type { Provider, PaymentMethod } from '@metamask/ramps-controller';

interface PaymentSelectionModalParams {
  // No params needed for now, but keeping interface for future use
}

export const createPaymentSelectionModalNavigationDetails =
  createNavigationDetails<PaymentSelectionModalParams>(
    Routes.RAMP.MODALS.ID,
    Routes.RAMP.MODALS.PAYMENT_SELECTION,
  );

// Mock data - TODO: Replace with actual data from controller
const MOCK_PROVIDER: Provider = {
  id: '/providers/transak',
  name: 'Transak',
  environmentType: 'PRODUCTION',
  description:
    'Per Transak: "The fastest and securest way to buy 100+ cryptocurrencies on 75+ blockchains. Pay via Apple Pay, UPI, bank transfer or use your debit or credit card. Trusted by 2+ million global users. Transak empowers wallets, gaming, DeFi, NFTs, Exchanges, and DAOs across 125+ countries."',
  hqAddress: '35 Shearing Street, Bury St. Edmunds, IP32 6FE, United Kingdom',
  links: [
    {
      name: 'Homepage',
      url: 'https://www.transak.com/',
    },
    {
      name: 'Privacy Policy',
      url: 'https://transak.com/privacy-policy',
    },
    {
      name: 'Support',
      url: 'https://support.transak.com/hc/en-us',
    },
  ],
  logos: {
    light:
      'https://on-ramp.dev-api.cx.metamask.io/assets/providers/transak_light.png',
    dark: 'https://on-ramp.dev-api.cx.metamask.io/assets/providers/transak_dark.png',
    height: 24,
    width: 90,
  },
};

const MOCK_PAYMENT_METHODS: PaymentMethod[] = [
  {
    id: '/payments/debit-credit-card-1',
    paymentType: 'debit-credit-card',
    name: 'Debit or Credit',
    score: 90,
    icon: 'card',
    disclaimer:
      "Credit card purchases may incur your bank's cash advance fees.",
    delay: '5 to 10 minutes.',
    pendingOrderDescription:
      'Card purchases may take a few minutes to complete.',
  },
  {
    id: '/payments/debit-credit-card-2',
    paymentType: 'debit-credit-card',
    name: 'Debit or Credit',
    score: 90,
    icon: 'card',
    disclaimer:
      "Credit card purchases may incur your bank's cash advance fees.",
    delay: '5 to 10 minutes.',
    pendingOrderDescription:
      'Card purchases may take a few minutes to complete.',
  },
  {
    id: '/payments/debit-credit-card-3',
    paymentType: 'debit-credit-card',
    name: 'Debit or Credit',
    score: 90,
    icon: 'card',
    disclaimer:
      "Credit card purchases may incur your bank's cash advance fees.",
    delay: '5 to 10 minutes.',
    pendingOrderDescription:
      'Card purchases may take a few minutes to complete.',
  },
  {
    id: '/payments/debit-credit-card-4',
    paymentType: 'debit-credit-card',
    name: 'Debit or Credit',
    score: 90,
    icon: 'card',
    disclaimer:
      "Credit card purchases may incur your bank's cash advance fees.",
    delay: '5 to 10 minutes.',
    pendingOrderDescription:
      'Card purchases may take a few minutes to complete.',
  },
];

function PaymentSelectionModal() {
  const sheetRef = useRef<BottomSheetRef>(null);
  const listRef = useRef<FlatList>(null);
  const { height: screenHeight } = useWindowDimensions();
  const { styles } = useStyles(styleSheet, {
    screenHeight,
  });

  const provider = MOCK_PROVIDER;
  const paymentMethods = MOCK_PAYMENT_METHODS;

  const handleProviderPillPress = useCallback(() => {
    // TODO: Handle provider selection
  }, []);

  const handlePaymentMethodPress = useCallback(
    (_paymentMethod: PaymentMethod) => {
      // TODO: Handle payment method selection
      sheetRef.current?.onCloseBottomSheet();
    },
    [],
  );

  const renderPaymentMethod = useCallback(
    ({ item: paymentMethod }: { item: PaymentMethod }) => (
      <PaymentMethodListItem
        paymentMethod={paymentMethod}
        onPress={() => handlePaymentMethodPress(paymentMethod)}
      />
    ),
    [handlePaymentMethodPress],
  );

  return (
    <BottomSheet ref={sheetRef} shouldNavigateBack>
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Between}
        twClassName="px-4 py-3"
      >
        <Text variant={TextVariant.HeadingMD}>
          {strings('fiat_on_ramp.pay_with')}
        </Text>
        <ProviderPill provider={provider} onPress={handleProviderPillPress} />
      </Box>
      <Box twClassName="px-4 pb-4">
        <Text variant={TextVariant.BodySM} color={TextColor.Alternative}>
          {strings('fiat_on_ramp.debit_card_payments_more_likely')}
        </Text>
      </Box>
      <FlatList
        style={styles.list}
        ref={listRef}
        data={paymentMethods}
        renderItem={renderPaymentMethod}
        keyExtractor={(item) => item.id}
        keyboardDismissMode="none"
        keyboardShouldPersistTaps="always"
      />
    </BottomSheet>
  );
}

export default PaymentSelectionModal;
