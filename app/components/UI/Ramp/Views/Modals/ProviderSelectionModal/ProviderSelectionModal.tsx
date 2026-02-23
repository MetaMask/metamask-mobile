import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useWindowDimensions, View } from 'react-native';
import type { CaipChainId } from '@metamask/utils';
import type { Provider, QuotesResponse } from '@metamask/ramps-controller';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../../component-library/components/BottomSheets/BottomSheet';
import { useNavigation } from '@react-navigation/native';
import {
  createNavigationDetails,
  useParams,
} from '../../../../../../util/navigation/navUtils';
import Routes from '../../../../../../constants/navigation/Routes';
import ProviderSelection from '../PaymentSelectionModal/ProviderSelection';
import { useRampsController } from '../../../hooks/useRampsController';
import useRampAccountAddress from '../../../hooks/useRampAccountAddress';
import { useStyles } from '../../../../../hooks/useStyles';
import styleSheet from './ProviderSelectionModal.styles';

export interface ProviderSelectionModalParams {
  amount: number;
}

export const createProviderSelectionModalNavigationDetails =
  createNavigationDetails<ProviderSelectionModalParams>(
    Routes.RAMP.MODALS.ID,
    Routes.RAMP.MODALS.PROVIDER_SELECTION,
  );

const DEFAULT_QUOTE_AMOUNT = 100;

function ProviderSelectionModal() {
  const sheetRef = useRef<BottomSheetRef>(null);
  const { height: screenHeight } = useWindowDimensions();
  const { styles } = useStyles(styleSheet, { screenHeight });
  const navigation = useNavigation();
  const { amount: routeAmount } = useParams<ProviderSelectionModalParams>();

  const {
    providers,
    setSelectedProvider,
    selectedPaymentMethod,
    selectedToken,
    getQuotes,
  } = useRampsController();

  const [quotes, setQuotes] = useState<QuotesResponse | null>(null);
  const [quotesLoading, setQuotesLoading] = useState(false);
  const [quotesError, setQuotesError] = useState<string | null>(null);

  const amount = routeAmount ?? DEFAULT_QUOTE_AMOUNT;
  const walletAddress =
    useRampAccountAddress((selectedToken?.chainId as CaipChainId) ?? null) ??
    '';
  const assetId = selectedToken?.assetId ?? '';

  const providerIds = useMemo(() => providers.map((p) => p.id), [providers]);

  useEffect(() => {
    if (!walletAddress || !assetId) return;
    let cancelled = false;
    setQuotesLoading(true);
    getQuotes({
      amount,
      walletAddress,
      assetId,
      providers: providerIds,
      paymentMethods: selectedPaymentMethod
        ? [selectedPaymentMethod.id]
        : undefined,
      forceRefresh: true,
    })
      .then((data) => {
        if (!cancelled) {
          setQuotes(data);
          setQuotesError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setQuotes(null);
          setQuotesError(
            err instanceof Error ? err.message : 'Failed to fetch quotes',
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setQuotesLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [
    amount,
    assetId,
    getQuotes,
    providerIds,
    selectedPaymentMethod,
    walletAddress,
  ]);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleProviderSelect = useCallback(
    (provider: Provider) => {
      setSelectedProvider(provider);
      navigation.goBack();
    },
    [setSelectedProvider, navigation],
  );

  return (
    <BottomSheet ref={sheetRef} shouldNavigateBack>
      <View style={styles.container}>
        <ProviderSelection
          quotes={quotes}
          quotesLoading={quotesLoading}
          quotesError={quotesError}
          onBack={handleBack}
          onProviderSelect={handleProviderSelect}
        />
      </View>
    </BottomSheet>
  );
}

export default ProviderSelectionModal;
