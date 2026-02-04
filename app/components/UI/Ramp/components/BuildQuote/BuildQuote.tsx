import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { CaipChainId } from '@metamask/utils';

import ScreenLayout from '../../Aggregator/components/ScreenLayout';
import Keypad, { type KeypadChangeData } from '../../../../Base/Keypad';
import PaymentMethodPill from '../PaymentMethodPill';
import QuickAmounts from '../QuickAmounts';
import Text, {
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import {
  Button,
  ButtonVariant,
  ButtonSize,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';

import {
  createNavigationDetails,
  useParams,
} from '../../../../../util/navigation/navUtils';
import { getRampsBuildQuoteNavbarOptions } from '../../../Navbar';
import Routes from '../../../../../constants/navigation/Routes';
import { useStyles } from '../../../../hooks/useStyles';
import styleSheet from './BuildQuote.styles';
import { formatCurrency } from '../../utils/formatCurrency';
import { useTokenNetworkInfo } from '../../hooks/useTokenNetworkInfo';
import { useRampsController } from '../../hooks/useRampsController';
import { useRampsTokens } from '../../hooks/useRampsTokens';
import { createSettingsModalNavDetails } from '../Modals/SettingsModal';
import { createPaymentSelectionModalNavigationDetails } from '../PaymentSelectionModal';

interface BuildQuoteParams {
  assetId?: string;
}

export const createBuildQuoteNavDetails =
  createNavigationDetails<BuildQuoteParams>(Routes.RAMP.AMOUNT_INPUT);

export const createRampOpenWithBuildQuoteDetails = (assetId: string) =>
  [
    Routes.RAMP.TOKEN_SELECTION,
    {
      screen: Routes.RAMP.TOKEN_SELECTION,
      params: { openBuildQuoteWithAssetId: assetId },
    },
  ] as const;

function BuildQuote() {
  const navigation = useNavigation();
  const { styles } = useStyles(styleSheet, {});
  const { assetId: assetIdParam } = useParams<BuildQuoteParams>();
  const { selectedToken: controllerSelectedToken } = useRampsTokens();

  const [amount, setAmount] = useState<string>('0');
  const [amountAsNumber, setAmountAsNumber] = useState<number>(0);

  const {
    userRegion,
    selectedProvider,
    tokens,
    paymentMethodsLoading,
    selectedPaymentMethod,
  } = useRampsController();

  const currency = userRegion?.country?.currency || 'USD';
  const quickAmounts = userRegion?.country?.quickAmounts ?? [50, 100, 200, 400];

  const getTokenNetworkInfo = useTokenNetworkInfo();

  const selectedToken = useMemo(() => {
    if (controllerSelectedToken) return controllerSelectedToken;
    if (!assetIdParam || !tokens?.allTokens) return null;
    return (
      tokens.allTokens.find((token) => token.assetId === assetIdParam) ?? null
    );
  }, [controllerSelectedToken, assetIdParam, tokens?.allTokens]);

  // Get network info for the selected token
  const networkInfo = useMemo(() => {
    if (!selectedToken) return null;
    return getTokenNetworkInfo(selectedToken.chainId as CaipChainId);
  }, [selectedToken, getTokenNetworkInfo]);

  // Update navigation options - shows skeleton when data is loading
  useEffect(() => {
    navigation.setOptions(
      getRampsBuildQuoteNavbarOptions(navigation, {
        tokenName: selectedToken?.name,
        tokenSymbol: selectedToken?.symbol,
        tokenIconUrl: selectedToken?.iconUrl,
        networkName: networkInfo?.networkName ?? undefined,
        networkImageSource: networkInfo?.networkImageSource,
        onSettingsPress: () => {
          navigation.navigate(...createSettingsModalNavDetails());
        },
      }),
    );
  }, [navigation, selectedToken, networkInfo]);

  const handleKeypadChange = useCallback(
    ({ value, valueAsNumber }: KeypadChangeData) => {
      setAmount(value || '0');
      setAmountAsNumber(valueAsNumber || 0);
    },
    [],
  );

  const handleQuickAmountPress = useCallback((quickAmount: number) => {
    setAmount(String(quickAmount));
    setAmountAsNumber(quickAmount);
  }, []);

  const handleContinuePress = useCallback(() => {
    // TODO: Navigate to next screen with amount
  }, []);

  const hasAmount = amountAsNumber > 0;

  return (
    <ScreenLayout>
      <ScreenLayout.Body>
        <ScreenLayout.Content style={styles.content}>
          <View style={styles.centerGroup}>
            <View style={styles.amountContainer}>
              <Text
                variant={TextVariant.HeadingLG}
                style={styles.mainAmount}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {formatCurrency(amountAsNumber, currency, {
                  currencyDisplay: 'narrowSymbol',
                })}
              </Text>
              <PaymentMethodPill
                label={
                  selectedPaymentMethod?.name ||
                  strings('fiat_on_ramp.select_payment_method')
                }
                isLoading={paymentMethodsLoading}
                onPress={() => {
                  navigation.navigate(
                    ...createPaymentSelectionModalNavigationDetails(),
                  );
                }}
              />
            </View>
          </View>

          <View style={styles.actionSection}>
            {selectedProvider && (
              <Text variant={TextVariant.BodySM} style={styles.poweredByText}>
                {strings('fiat_on_ramp.powered_by_provider', {
                  provider: selectedProvider.name,
                })}
              </Text>
            )}
            {hasAmount ? (
              <Button
                variant={ButtonVariant.Primary}
                size={ButtonSize.Lg}
                onPress={handleContinuePress}
                isFullWidth
                testID="build-quote-continue-button"
              >
                {strings('fiat_on_ramp.continue')}
              </Button>
            ) : (
              quickAmounts.length > 0 && (
                <QuickAmounts
                  amounts={quickAmounts}
                  currency={currency}
                  onAmountPress={handleQuickAmountPress}
                />
              )
            )}
          </View>
          <Keypad
            currency={currency}
            value={amount}
            onChange={handleKeypadChange}
          />
        </ScreenLayout.Content>
      </ScreenLayout.Body>
    </ScreenLayout>
  );
}

export default BuildQuote;
