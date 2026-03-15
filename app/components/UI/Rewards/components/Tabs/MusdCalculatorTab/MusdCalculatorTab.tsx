import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView } from 'react-native';
import {
  Box,
  Icon,
  IconName,
  IconSize,
  Text,
  TextVariant,
  Button,
  ButtonVariant,
  ButtonSize,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import TextField from '../../../../../../component-library/components/Form/TextField';
import { strings } from '../../../../../../../locales/i18n';
import { KeyValueRowStubs } from '../../../../../../component-library/components-temp/KeyValueRow';
import { handleDeeplink } from '../../../../../../core/DeeplinkManager';
import useFiatFormatter from '../../../../SimulationDetails/FiatDisplay/useFiatFormatter';
import { BigNumber } from 'bignumber.js';

const ANNUAL_BONUS_RATE = 0.03;
const BUY_MUSD_URL =
  'https://link.metamask.io/buy?address=0xaca92e438df0b2401ff60da7e4337b687a2435da&amount=100&chainid=1&sig_params=address%2Camount%2Cchainid%2Cutm_source&utm_source=rewards&sig=SdHOoh_QvT1bs8B6g-qCyLH5mUEczYzeOfAv9SNRm4CKjR6uBnUp4e1-Vcojb39fWWScBrui2GLftNlJKQlrAQ';
const SWAP_MUSD_URL =
  'https://link.metamask.io/swap?from=eip155%3A1%2Fslip44%3A60&sig_params=from%2Cto%2Cutm_source&to=eip155%3A1%2Ferc20%3A0xacA92E438df0B2401fF60dA7E4337B687a2435DA&utm_source=rewards&sig=mCsMuZB-omwEg9WvGOwA8nuc8NvXj7uFfC_Pn-6Nmwlce2GF356tbZbHIgzYHWhmLb4kvUKMTpj4eb0yUrle1Q';

const MusdCalculatorTab: React.FC = () => {
  const tw = useTailwind();
  const [musdAmount, setMusdAmount] = useState('1000');

  const musdCalculations = useMemo(() => {
    const amount = parseFloat(musdAmount) || 0;
    const annualizedBonus = amount * ANNUAL_BONUS_RATE;
    const dailyBonus = annualizedBonus / 365;
    return {
      initialAmount: amount,
      dailyBonus,
      annualizedBonus,
    };
  }, [musdAmount]);

  const formatFiat = useFiatFormatter({ currency: 'usd' });
  const formatCurrency = useCallback(
    (value: number) => formatFiat(new BigNumber(value)),
    [formatFiat],
  );

  const handleMusdAmountChange = useCallback((text: string) => {
    const sanitized = text.replace(/[^0-9.]/g, '');
    const parts = sanitized.split('.');
    if (parts.length > 2) {
      return;
    }
    setMusdAmount(sanitized);
  }, []);

  const handleBuyMusd = useCallback(() => {
    handleDeeplink({ uri: BUY_MUSD_URL });
  }, []);

  const handleSwapMusd = useCallback(() => {
    handleDeeplink({ uri: SWAP_MUSD_URL });
  }, []);

  return (
    <ScrollView
      style={tw.style('flex-1')}
      contentContainerStyle={tw.style('p-4 gap-4')}
    >
      {/* Title and Description */}
      <Box twClassName="gap-2">
        <Text variant={TextVariant.HeadingMd}>
          {strings('rewards.musd.title')}
        </Text>
        <Text variant={TextVariant.BodyMd}>
          {strings('rewards.musd.description')}
        </Text>
      </Box>

      {/* Amount Input */}
      <KeyValueRowStubs.Root>
        <Box twClassName="w-1/2 justify-center">
          <Text variant={TextVariant.BodyMd}>
            {strings('rewards.musd.amount_label')}
          </Text>
        </Box>
        <Box twClassName="w-1/2">
          <TextField
            testID="musd-amount-input"
            value={musdAmount}
            onChangeText={handleMusdAmountChange}
            keyboardType="decimal-pad"
            startAccessory={<Text variant={TextVariant.BodyMd}>$</Text>}
            placeholder="0"
          />
        </Box>
      </KeyValueRowStubs.Root>

      {/* Estimated Bonus Rate */}
      <Text variant={TextVariant.BodyMd}>
        {strings('rewards.musd.estimated_bonus')}
      </Text>

      {/* Results Card */}
      <Box twClassName="bg-muted rounded-lg p-4 gap-3">
        <Box twClassName="flex-row justify-between items-center">
          <Text variant={TextVariant.BodyMd}>
            {strings('rewards.musd.initial_amount')}
          </Text>
          <Text variant={TextVariant.BodyMd}>
            {formatCurrency(musdCalculations.initialAmount)}
          </Text>
        </Box>

        <Box twClassName="flex-row justify-between items-center">
          <Text variant={TextVariant.BodyMd}>
            {strings('rewards.musd.daily_bonus')}
          </Text>
          <Text variant={TextVariant.BodyMd}>
            {formatCurrency(musdCalculations.dailyBonus)}
          </Text>
        </Box>

        <Box twClassName="flex-row justify-between items-center">
          <Text variant={TextVariant.BodyMd}>
            {strings('rewards.musd.annualized_bonus')}
          </Text>
          <Text variant={TextVariant.BodyMd}>
            {formatCurrency(musdCalculations.annualizedBonus)}
          </Text>
        </Box>
      </Box>

      {/* Disclaimer */}
      <Box twClassName="flex-row gap-2 items-center">
        <Icon name={IconName.Info} size={IconSize.Sm} />
        <Text variant={TextVariant.BodySm} twClassName="flex-1">
          {strings('rewards.musd.disclaimer')}
        </Text>
      </Box>

      {/* Action Buttons */}
      <Box twClassName="gap-3">
        <Button
          variant={ButtonVariant.Primary}
          size={ButtonSize.Lg}
          onPress={handleBuyMusd}
          twClassName="w-full"
        >
          {strings('rewards.musd.buy_button')}
        </Button>
        <Button
          variant={ButtonVariant.Secondary}
          size={ButtonSize.Lg}
          onPress={handleSwapMusd}
          twClassName="w-full"
        >
          {strings('rewards.musd.swap_button')}
        </Button>
      </Box>
    </ScrollView>
  );
};

export default MusdCalculatorTab;
