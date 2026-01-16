import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { Pressable } from 'react-native-gesture-handler';
import { useSelector } from 'react-redux';
import { strings } from '../../../../../../locales/i18n';
import { TooltipSizes } from '../../../../../component-library/components-temp/KeyValueRow';
import ButtonIcon from '../../../../../component-library/components/Buttons/ButtonIcon';
import {
  IconColor,
  IconName,
} from '../../../../../component-library/components/Icons/Icon';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import Routes from '../../../../../constants/navigation/Routes';
import { useTheme } from '../../../../../util/theme';
import type { Colors } from '../../../../../util/theme/models';
import { TokenI } from '../../../Tokens/types';
import { EARN_EXPERIENCES } from '../../constants/experiences';
import useEarnTokens from '../../hooks/useEarnTokens';
import { selectStablecoinLendingEnabledFlag } from '../../selectors/featureFlags';
import CurrencyToggle from '../CurrencySwitch';
import FadeInView from '../FadeInView';

export const INPUT_DISPLAY_TEST_IDS = {
  LENDING_MAX_SAFE_WITHDRAWAL_TOOLTIP_ICON:
    'LendingMaxSafeWithdrawalTooltipIcon',
};

export interface InputDisplayProps {
  isOverMaximum: {
    isOverMaximumEth: boolean;
    isOverMaximumToken: boolean;
  };
  balanceText: string;
  balanceValue: string;
  asset: TokenI;
  isFiat: boolean;
  amountToken: string;
  amountFiatNumber: string;
  currentCurrency: string;
  handleCurrencySwitch: () => void;
  currencyToggleValue: string;
  maxWithdrawalAmount?: string;
  error?: string;
  onPressAmount?: () => void;
}

const { View: AnimatedView } = Animated;

const createStyles = (
  colors: Colors,
  params: {
    isStablecoinLendingEnabled: boolean;
    shouldShowLendingMaxSafeWithdrawalMessage: boolean;
  },
) =>
  StyleSheet.create({
    inputContainer: {
      flex: 1,
      backgroundColor: colors.background.default,
      justifyContent: 'center',
      alignItems: 'center',
      gap: 16,
    },
    amountRow: {
      justifyContent: 'center',
      alignItems: 'center',
      flexDirection: 'row',
      gap: 4,
    },
    amountText: params?.isStablecoinLendingEnabled
      ? {
          fontSize: 40,
          lineHeight: 50,
          letterSpacing: 0,
          fontWeight: '500',
        }
      : {},
    amountCursor: {
      width: 1,
      height: 32,
      marginTop: 2,
      marginLeft: 5,
      marginRight: 5,
      opacity: 1,
      backgroundColor: colors.border.default,
    },
    maxWithdrawalContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      // Using opacity instead of conditional rendering prevents UI shifting
      opacity: params?.shouldShowLendingMaxSafeWithdrawalMessage ? 1 : 0,
      // When using opacity, the elements is still interactive even if it's invisible.
      // We want to prevent clicking when it's invisible
      pointerEvents: params?.shouldShowLendingMaxSafeWithdrawalMessage
        ? 'auto'
        : 'none',
    },
    warningAndErrorMessagesContainer: {
      alignItems: 'center',
    },
  });

const InputDisplay = ({
  isOverMaximum,
  balanceText,
  balanceValue,
  isFiat,
  asset,
  amountToken,
  amountFiatNumber,
  currentCurrency,
  handleCurrencySwitch,
  currencyToggleValue,
  maxWithdrawalAmount,
  error,
  onPressAmount,
}: InputDisplayProps) => {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const isStablecoinLendingEnabled = useSelector(
    selectStablecoinLendingEnabledFlag,
  );

  const { getOutputToken } = useEarnTokens();
  const outputToken = getOutputToken(asset);

  const shouldShowLendingMaxSafeWithdrawalMessage = useMemo(() => {
    if (
      outputToken?.experience?.type !== EARN_EXPERIENCES.STABLECOIN_LENDING ||
      !outputToken?.chainId ||
      !maxWithdrawalAmount
    ) {
      return false;
    }

    return true;
  }, [maxWithdrawalAmount, outputToken]);

  const styles = createStyles(colors, {
    isStablecoinLendingEnabled,
    shouldShowLendingMaxSafeWithdrawalMessage,
  });
  const cursorOpacity = useRef(new Animated.Value(0.6)).current;

  const ticker = asset.ticker ?? asset.symbol;

  useEffect(() => {
    const blinkAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(cursorOpacity, {
          toValue: 0,
          duration: 800,
          easing: () => Easing.bounce(1),
          useNativeDriver: true,
        }),
        Animated.timing(cursorOpacity, {
          toValue: 1,
          easing: () => Easing.bounce(1),
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    );

    blinkAnimation.start();
  }, [cursorOpacity]);

  const balanceInfo = useMemo(() => {
    if (error) return error;

    if (isOverMaximum.isOverMaximumToken) {
      return strings('stake.not_enough_token', { ticker });
    }
    if (isOverMaximum.isOverMaximumEth) {
      return strings('stake.not_enough_eth');
    }

    if (isStablecoinLendingEnabled) return '\u00A0';
    return `${balanceText}: ${balanceValue}`;
  }, [
    balanceText,
    balanceValue,
    error,
    isOverMaximum.isOverMaximumEth,
    isOverMaximum.isOverMaximumToken,
    isStablecoinLendingEnabled,
    ticker,
  ]);

  const onNavigateToLendingMaxWithdrawModal = () => {
    navigation.navigate(Routes.EARN.MODALS.ROOT, {
      screen: Routes.EARN.MODALS.LENDING_MAX_WITHDRAWAL,
    });
  };

  return (
    <View style={styles.inputContainer}>
      <View style={styles.warningAndErrorMessagesContainer}>
        <FadeInView key={maxWithdrawalAmount}>
          <View style={styles.maxWithdrawalContainer}>
            <Text
              variant={TextVariant.BodySMMedium}
              color={TextColor.Alternative}
            >
              {`${maxWithdrawalAmount || 0} ${ticker} ${strings(
                'earn.available_to_withdraw',
              )}`}
            </Text>
            <ButtonIcon
              size={TooltipSizes.Md}
              iconColor={IconColor.Alternative}
              iconName={IconName.Question}
              onPress={onNavigateToLendingMaxWithdrawModal}
              testID={
                INPUT_DISPLAY_TEST_IDS.LENDING_MAX_SAFE_WITHDRAWAL_TOOLTIP_ICON
              }
            />
          </View>
        </FadeInView>

        <Text
          variant={TextVariant.BodySM}
          color={
            isOverMaximum.isOverMaximumToken ||
            isOverMaximum.isOverMaximumEth ||
            error
              ? TextColor.Error
              : undefined
          }
        >
          {balanceInfo}
        </Text>
      </View>
      <View style={styles.amountRow}>
        <Pressable onPress={onPressAmount}>
          <View style={styles.amountRow}>
            <Text
              style={styles.amountText}
              color={TextColor.Default}
              variant={TextVariant.DisplayMD}
            >
              {isFiat ? amountFiatNumber : amountToken}
            </Text>
            {isStablecoinLendingEnabled ? (
              <AnimatedView
                style={[styles.amountCursor, { opacity: cursorOpacity }]}
              />
            ) : null}
            <Text
              style={styles.amountText}
              color={TextColor.Muted}
              variant={TextVariant.DisplayMD}
            >
              {isFiat ? currentCurrency.toUpperCase() : ticker}
            </Text>
          </View>
        </Pressable>
      </View>
      <View>
        <CurrencyToggle
          onPress={handleCurrencySwitch}
          value={currencyToggleValue}
        />
      </View>
    </View>
  );
};

export default InputDisplay;
