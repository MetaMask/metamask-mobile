import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import ScreenLayout from '../../Aggregator/components/ScreenLayout';
import Keypad from '../../../../Base/Keypad';
import PaymentMethodPill from '../PaymentMethodPill';
import QuickAmounts from '../QuickAmounts';
import Text, {
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { strings } from '../../../../../../locales/i18n';

import {
  createNavigationDetails,
  useParams,
} from '../../../../../util/navigation/navUtils';
import { getRampsAmountInputNavbarOptions } from '../../../Navbar';
import Routes from '../../../../../constants/navigation/Routes';
import { useStyles } from '../../../../hooks/useStyles';
import styleSheet from './AmountInput.styles';
import { formatCurrency } from '../../Deposit/utils';
import { useRampTokens } from '../../hooks/useRampTokens';
import { useTokenNetworkInfo } from '../../hooks/useTokenNetworkInfo';

interface AmountInputParams {
  assetId?: string;
}

export const createAmountInputNavDetails =
  createNavigationDetails<AmountInputParams>(Routes.RAMP.AMOUNT_INPUT);

function AmountInput() {
  const navigation = useNavigation();
  const { styles } = useStyles(styleSheet, {});
  const { assetId } = useParams<AmountInputParams>();

  const [amount, setAmount] = useState<string>('0');
  const [amountAsNumber, setAmountAsNumber] = useState<number>(0);

  // TODO: Get currency from RampsController when integrated
  const currency = 'USD';

  // Get token and network info for the navbar
  const { allTokens } = useRampTokens();
  const getTokenNetworkInfo = useTokenNetworkInfo();

  // Find the selected token from assetId param
  const selectedToken = useMemo(() => {
    if (!assetId || !allTokens) return null;
    return allTokens.find((token) => token.assetId === assetId) ?? null;
  }, [assetId, allTokens]);

  // Get network info for the selected token
  const networkInfo = useMemo(() => {
    if (!selectedToken) return null;
    return getTokenNetworkInfo(selectedToken.chainId);
  }, [selectedToken, getTokenNetworkInfo]);

  // Update navigation options - shows skeleton when data is loading
  useEffect(() => {
    navigation.setOptions(
      getRampsAmountInputNavbarOptions(navigation, {
        tokenName: selectedToken?.name,
        tokenSymbol: selectedToken?.symbol,
        tokenIconUrl: selectedToken?.iconUrl,
        networkName: networkInfo?.networkName ?? undefined,
        networkImageSource: networkInfo?.networkImageSource,
        onSettingsPress: () => {
          // TODO: Implement settings handler
        },
      }),
    );
  }, [navigation, selectedToken, networkInfo]);

  const handleKeypadChange = useCallback(
    ({
      value,
      valueAsNumber,
    }: {
      value: string;
      valueAsNumber: number;
      pressedKey: string;
    }) => {
      setAmount(value || '0');
      setAmountAsNumber(valueAsNumber || 0);
    },
    [],
  );

  const handleQuickAmountPress = useCallback((quickAmount: number) => {
    setAmount(String(quickAmount));
    setAmountAsNumber(quickAmount);
  }, []);

  return (
    <ScreenLayout>
      <ScreenLayout.Body>
        <ScreenLayout.Content style={styles.content}>
          <View style={styles.centerGroup}>
            <View>
              <Text
                variant={TextVariant.HeadingLG}
                style={styles.mainAmount}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {formatCurrency(amountAsNumber, currency, {
                  currencyDisplay: 'narrowSymbol',
                  maximumFractionDigits: 0,
                })}
              </Text>
              <PaymentMethodPill
                label={strings('fiat_on_ramp.debit_card')}
                onPress={() => {
                  // TODO: Open payment method selector
                }}
              />
            </View>
          </View>

          <QuickAmounts onAmountPress={handleQuickAmountPress} />
          <Keypad value={amount} onChange={handleKeypadChange} />
        </ScreenLayout.Content>
      </ScreenLayout.Body>
    </ScreenLayout>
  );
}

export default AmountInput;
