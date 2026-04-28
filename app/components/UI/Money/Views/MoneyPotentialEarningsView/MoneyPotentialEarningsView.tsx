import React, { useCallback, useMemo } from 'react';
import { ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { BigNumber } from 'bignumber.js';
import {
  Box,
  ButtonIcon,
  ButtonIconSize,
  FontWeight,
  IconName,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { useStyles } from '../../../../../component-library/hooks';
import {
  useMusdConversionTokens,
  STABLECOIN_SYMBOLS,
  tokenFiatValue,
} from '../../../Earn/hooks/useMusdConversionTokens';
import useMoneyAccountBalance from '../../hooks/useMoneyAccountBalance';
import useFiatFormatter from '../../../SimulationDetails/FiatDisplay/useFiatFormatter';
import MoneyGradientText from '../../components/MoneyPotentialEarnings/MoneyGradientText';
import PotentialEarningsTokenRow from '../../components/MoneyPotentialEarnings/PotentialEarningsTokenRow';
import { isPositiveNumber } from '../../utils/number';
import { PROJECTION_YEARS } from '../../utils/projections';
import styleSheet from './MoneyPotentialEarningsView.styles';
import { MoneyPotentialEarningsViewTestIds } from './MoneyPotentialEarningsView.testIds';

const MoneyPotentialEarningsView = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { styles } = useStyles(styleSheet, {});
  const formatFiat = useFiatFormatter();

  const { tokens } = useMusdConversionTokens();
  const { apyPercent } = useMoneyAccountBalance();

  // TODO: It likely makes more sense to use the apyDecimal from useMoneyAccountBalance instead of apyPercent in this calculation.
  const projectedMultiplier = useMemo(
    () => ((apyPercent ?? 0) / 100) * PROJECTION_YEARS,
    [apyPercent],
  );

  const eligibleTokens = useMemo(
    () => (tokens ?? []).filter((token) => tokenFiatValue(token) > 0),
    [tokens],
  );

  const projectedAmount = useMemo(
    () =>
      eligibleTokens.reduce(
        (sum, token) => sum + tokenFiatValue(token) * projectedMultiplier,
        0,
      ),
    [eligibleTokens, projectedMultiplier],
  );

  const handleBackPress = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleTokenPress = useCallback(() => {
    // TODO: Wire to initiateCustomConversion once Phase 4 lands
  }, []);

  return (
    <Box
      style={[styles.safeArea, { paddingTop: insets.top }]}
      testID={MoneyPotentialEarningsViewTestIds.CONTAINER}
    >
      <Box twClassName="flex-row items-center px-4 py-2">
        <ButtonIcon
          iconName={IconName.ArrowLeft}
          size={ButtonIconSize.Md}
          onPress={handleBackPress}
        />
      </Box>
      <ScrollView
        testID={MoneyPotentialEarningsViewTestIds.SCROLL_VIEW}
        showsVerticalScrollIndicator={false}
      >
        <Box twClassName="px-4 py-3 gap-3">
          <Text variant={TextVariant.HeadingMd}>
            {strings('money.potential_earnings.title')}
          </Text>

          {isPositiveNumber(projectedAmount) && (
            <MoneyGradientText
              value={`+${formatFiat(new BigNumber(projectedAmount))}`}
            />
          )}

          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Regular}
            color={TextColor.TextAlternative}
          >
            {strings('money.potential_earnings.description')}
          </Text>
        </Box>

        {eligibleTokens.map((token) => (
          <PotentialEarningsTokenRow
            key={`${token.address}-${token.chainId}`}
            token={token}
            hasSubsidizedFee={STABLECOIN_SYMBOLS.has(token.symbol)}
            projectedMultiplier={projectedMultiplier}
            onPress={handleTokenPress}
          />
        ))}
      </ScrollView>
    </Box>
  );
};

export default MoneyPotentialEarningsView;
