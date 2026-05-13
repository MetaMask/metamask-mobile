import React, { useCallback, useMemo } from 'react';
import { ScrollView } from 'react-native';
import { useSelector } from 'react-redux';
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
import { useMusdConversion } from '../../../Earn/hooks/useMusdConversion';
import useMoneyAccountBalance from '../../hooks/useMoneyAccountBalance';
import { selectCurrentCurrency } from '../../../../../selectors/currencyRateController';
import { moneyFormatFiat } from '../../utils/moneyFormatFiat';
import Logger from '../../../../../util/Logger';
import Routes from '../../../../../constants/navigation/Routes';
import { AssetType } from '../../../../Views/confirmations/types/token';
import { Hex } from '@metamask/utils';
import MoneyGradientText from '../../components/MoneyPotentialEarnings/MoneyGradientText';
import PotentialEarningsTokenRow from '../../components/MoneyPotentialEarnings/PotentialEarningsTokenRow';
import { isPositiveNumber } from '../../utils/number';
import {
  calculateProjectedEarnings,
  PROJECTION_YEARS,
} from '../../utils/projections';
import styleSheet from './MoneyPotentialEarningsView.styles';
import { MoneyPotentialEarningsViewTestIds } from './MoneyPotentialEarningsView.testIds';

const MoneyPotentialEarningsView = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { styles } = useStyles(styleSheet, {});
  const currentCurrency = useSelector(selectCurrentCurrency);

  const { tokens } = useMusdConversionTokens();
  const { initiateCustomConversion } = useMusdConversion();
  const { apyPercent } = useMoneyAccountBalance();
  const apyPercentForProjection = apyPercent ?? 0;

  const eligibleTokens = useMemo(
    () => (tokens ?? []).filter((token) => tokenFiatValue(token) > 0),
    [tokens],
  );

  const projectedAmount = useMemo(
    () =>
      eligibleTokens.reduce(
        (sum, token) =>
          sum +
          calculateProjectedEarnings(
            tokenFiatValue(token),
            apyPercentForProjection,
            PROJECTION_YEARS,
          ),
        0,
      ),
    [eligibleTokens, apyPercentForProjection],
  );

  const handleBackPress = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleTokenPress = useCallback(
    (token: AssetType) => async () => {
      try {
        await initiateCustomConversion({
          preferredPaymentToken: {
            address: token.address as Hex,
            chainId: token.chainId as Hex,
          },
          navigationStack: Routes.MONEY.ROOT,
        });
      } catch (error) {
        Logger.error(error as Error, {
          message: '[MoneyPotentialEarningsView] Failed to initiate conversion',
        });
      }
    },
    [initiateCustomConversion],
  );

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
              value={`+${moneyFormatFiat(new BigNumber(projectedAmount), currentCurrency)}`}
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
            apyPercent={apyPercentForProjection}
            onPress={handleTokenPress(token)}
          />
        ))}
      </ScrollView>
    </Box>
  );
};

export default MoneyPotentialEarningsView;
