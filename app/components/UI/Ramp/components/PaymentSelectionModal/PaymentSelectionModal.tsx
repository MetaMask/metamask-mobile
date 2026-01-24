import React, { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, useWindowDimensions } from 'react-native';
import { FlatList } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
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
import ProviderSelection from './ProviderSelection';
import type { PaymentMethod, Provider } from '@metamask/ramps-controller';
import { useRampsController } from '../../hooks/useRampsController';
import { useRampsPaymentMethods } from '../../hooks/useRampsPaymentMethods';
import { useTheme } from '../../../../../util/theme';

export const createPaymentSelectionModalNavigationDetails =
  createNavigationDetails(
    Routes.RAMP.MODALS.ID,
    Routes.RAMP.MODALS.PAYMENT_SELECTION,
  );

const ANIMATION_DURATION = 300;

function PaymentSelectionModal() {
  const sheetRef = useRef<BottomSheetRef>(null);
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const { styles } = useStyles(styleSheet, {
    screenHeight,
  });
  const { colors } = useTheme();

  const {
    preferredProvider,
    providers,
    paymentMethods: controllerPaymentMethods,
    setSelectedPaymentMethod,
    setPreferredProvider,
    selectedToken,
  } = useRampsController();

  const assetId = selectedToken?.assetId;

  const { fetchPaymentMethods } = useRampsPaymentMethods();

  const [currentPage, setCurrentPage] = useState<'payment' | 'provider'>('payment');
  const translateX = useSharedValue(0);

  const [tmpProvider, setTmpProvider] = useState<Provider | null>(null);
  const [tmpPaymentMethods, setTmpPaymentMethods] = useState<PaymentMethod[] | null>(null);
  const [tmpLoading, setTmpLoading] = useState(false);
  const [tmpError, setTmpError] = useState<string | null>(null);

  const displayProvider = tmpProvider ?? preferredProvider;
  const displayPaymentMethods = tmpPaymentMethods ?? controllerPaymentMethods;
  const isLoading = tmpLoading;
  const error = tmpError;

  const paymentPageStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const providerPageStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value + screenWidth }],
  }));

  const handleProviderPillPress = useCallback(() => {
    translateX.value = withTiming(-screenWidth, { duration: ANIMATION_DURATION });
    setCurrentPage('provider');
  }, [screenWidth, translateX]);

  const handleProviderBack = useCallback(() => {
    setTmpProvider(null);
    setTmpPaymentMethods(null);
    setTmpError(null);
    translateX.value = withTiming(0, { duration: ANIMATION_DURATION });
    setCurrentPage('payment');
  }, [translateX]);

  const handleProviderSelect = useCallback(
    async (provider: Provider) => {
      if (!assetId) {
        setTmpError('No token selected');
        return;
      }

      setTmpProvider(provider);
      setTmpLoading(true);
      setTmpError(null);

      translateX.value = withTiming(0, { duration: ANIMATION_DURATION });
      setCurrentPage('payment');

      try {
        console.log('[PaymentSelectionModal] handleProviderSelect - fetching payment methods:', {
          assetId,
          provider: provider.id,
        });
        const response = await fetchPaymentMethods({
          assetId,
          provider: provider.id,
          doNotUpdateState: true,
        });
        setTmpPaymentMethods(response.payments);
      } catch (err) {
        setTmpError(err instanceof Error ? err.message : 'Failed to fetch payment methods');
      } finally {
        setTmpLoading(false);
      }
    },
    [fetchPaymentMethods, assetId, translateX],
  );

  const handlePaymentMethodPress = useCallback(
    (_paymentMethod: PaymentMethod) => {
      if (tmpProvider) {
        setPreferredProvider(tmpProvider);
      }
      setSelectedPaymentMethod(_paymentMethod);
      sheetRef.current?.onCloseBottomSheet();
    },
    [tmpProvider, setPreferredProvider, setSelectedPaymentMethod],
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

  const renderListContent = () => {
    if (isLoading) {
      return (
        <Box twClassName="flex-1 items-center justify-center py-8">
          <ActivityIndicator size="large" color={colors.primary.default} />
        </Box>
      );
    }

    if (error) {
      return (
        <Box twClassName="flex-1 items-center justify-center py-8 px-4">
          <Text variant={TextVariant.BodyMD} color={TextColor.Error}>
            {error}
          </Text>
        </Box>
      );
    }

    return (
      <FlatList
        style={styles.list}
        data={displayPaymentMethods}
        renderItem={renderPaymentMethod}
        keyExtractor={(item) => item.id}
        keyboardDismissMode="none"
        keyboardShouldPersistTaps="always"
      />
    );
  };

  return (
    <BottomSheet ref={sheetRef} shouldNavigateBack>
      <Box twClassName="overflow-hidden relative" style={{ minHeight: screenHeight * 0.5 }}>
        <Animated.View
          style={[
            { position: 'absolute', width: screenWidth, top: 0, left: 0 },
            paymentPageStyle,
          ]}
        >
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            justifyContent={BoxJustifyContent.Between}
            twClassName="px-4 py-3"
          >
            <Text variant={TextVariant.HeadingMD}>
              {strings('fiat_on_ramp.pay_with')}
            </Text>
            <ProviderPill provider={displayProvider} onPress={handleProviderPillPress} />
          </Box>
          <Box twClassName="px-4 pb-4">
            <Text variant={TextVariant.BodySM} color={TextColor.Alternative}>
              {strings('fiat_on_ramp.debit_card_payments_more_likely')}
            </Text>
          </Box>
          {renderListContent()}
        </Animated.View>

        <Animated.View
          style={[
            { position: 'absolute', width: screenWidth, top: 0, left: 0 },
            providerPageStyle,
          ]}
        >
          <ProviderSelection
            providers={providers}
            selectedProvider={displayProvider}
            onProviderSelect={handleProviderSelect}
            onBack={handleProviderBack}
          />
        </Animated.View>
      </Box>
    </BottomSheet>
  );
}

export default PaymentSelectionModal;
