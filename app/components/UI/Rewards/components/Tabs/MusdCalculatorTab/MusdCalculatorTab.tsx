import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView } from 'react-native';
import {
  Box,
  Text,
  TextColor,
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
import { EthScope } from '@metamask/keyring-api';
import Routes from '../../../../../../constants/navigation/Routes';
import {
  SwapBridgeNavigationLocation,
  useSwapBridgeNavigation,
} from '../../../../Bridge/hooks/useSwapBridgeNavigation';
import { BridgeToken } from '../../../../Bridge/types';
import {
  MUSD_TOKEN,
  MUSD_TOKEN_ADDRESS,
} from '../../../../Earn/constants/musd';
import { getNativeSourceToken } from '../../../../Bridge/utils/tokenUtils';
import { useAnalytics } from '../../../../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../../../../core/Analytics';
import { RewardsMetricsButtons } from '../../../utils';

const ANNUAL_BONUS_RATE = 0.03;
const BUY_MUSD_URL =
  'https://link.metamask.io/buy?address=0xaca92e438df0b2401ff60da7e4337b687a2435da&amount=100&chainid=1&sig_params=address%2Camount%2Cchainid%2Cutm_source&utm_source=rewards&sig=SdHOoh_QvT1bs8B6g-qCyLH5mUEczYzeOfAv9SNRm4CKjR6uBnUp4e1-Vcojb39fWWScBrui2GLftNlJKQlrAQ';

const MUSD_DEST_TOKEN: BridgeToken = {
  address: MUSD_TOKEN_ADDRESS,
  symbol: MUSD_TOKEN.symbol,
  name: MUSD_TOKEN.name,
  decimals: MUSD_TOKEN.decimals,
  chainId: '0x1',
};

const MusdCalculatorTab: React.FC = () => {
  const tw = useTailwind();
  const { trackEvent, createEventBuilder } = useAnalytics();
  const [musdAmount, setMusdAmount] = useState('1000');

  const ethSourceToken = useMemo(
    () => getNativeSourceToken(EthScope.Mainnet),
    [],
  );

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
    trackEvent(
      createEventBuilder(MetaMetricsEvents.REWARDS_PAGE_BUTTON_CLICKED)
        .addProperties({ button_type: RewardsMetricsButtons.BUY_MUSD })
        .build(),
    );
    handleDeeplink({ uri: BUY_MUSD_URL });
  }, [trackEvent, createEventBuilder]);

  const { goToSwaps } = useSwapBridgeNavigation({
    location: SwapBridgeNavigationLocation.Rewards,
    sourcePage: Routes.REWARDS_DASHBOARD,
    sourceToken: ethSourceToken,
    destToken: MUSD_DEST_TOKEN,
  });

  const handleSwapMusd = useCallback(() => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.REWARDS_PAGE_BUTTON_CLICKED)
        .addProperties({ button_type: RewardsMetricsButtons.SWAP_TO_MUSD })
        .build(),
    );
    goToSwaps();
  }, [goToSwaps, trackEvent, createEventBuilder]);

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

      {/* Disclaimer */}
      <Text
        variant={TextVariant.BodyXs}
        color={TextColor.TextAlternative}
        twClassName="text-center"
      >
        {strings('rewards.musd.disclaimer_brief')}
      </Text>
    </ScrollView>
  );
};

export default MusdCalculatorTab;
