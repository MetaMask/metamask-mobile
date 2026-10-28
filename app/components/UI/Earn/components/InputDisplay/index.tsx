import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSelector } from 'react-redux';
import {
  FontFamily,
  Text as DesignText,
  TextColor as DesignTextColor,
  TextVariant as DesignTextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import {
  AnimatedAmountDisplay,
  getFontSizeForInputLength,
} from '../../../../../component-library/components-temp/AnimatedAmountDisplay';
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
import { INPUT_DISPLAY_TEST_IDS } from './InputDisplay.testIds';

const INPUT_SIDE_MARGIN_CHARACTER_RESERVE = 2;

export interface InputDisplayProps {
  asset: TokenI;
  isFiat: boolean;
  amountToken: string;
  amountFiatNumber: string;
  currentCurrency: string;
  handleCurrencySwitch: () => void;
  currencyToggleValue: string;
  maxWithdrawalAmount?: string;
  onPressAmount?: () => void;
}

const createStyles = (
  colors: Colors,
  params: {
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
  isFiat,
  asset,
  amountToken,
  amountFiatNumber,
  currentCurrency,
  handleCurrencySwitch,
  currencyToggleValue,
  maxWithdrawalAmount,
  onPressAmount,
}: InputDisplayProps) => {
  const { colors } = useTheme();
  const navigation = useNavigation<AppNavigationProp>();
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
    shouldShowLendingMaxSafeWithdrawalMessage,
  });
  const ticker = asset.ticker ?? asset.symbol;
  const amountValue = isFiat ? amountFiatNumber : amountToken;
  const amountSuffix = isFiat ? currentCurrency.toUpperCase() : ticker;
  const amountFontSize = getFontSizeForInputLength(
    amountValue.length +
      amountSuffix.length +
      INPUT_SIDE_MARGIN_CHARACTER_RESERVE,
  );
  const amountTextStyle = {
    fontSize: amountFontSize,
    lineHeight: amountFontSize,
  };

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
              size={TooltipSizes.Xs}
              iconColor={IconColor.Alternative}
              iconName={IconName.Question}
              onPress={onNavigateToLendingMaxWithdrawModal}
              testID={
                INPUT_DISPLAY_TEST_IDS.LENDING_MAX_SAFE_WITHDRAWAL_TOOLTIP_ICON
              }
            />
          </View>
        </FadeInView>
      </View>
      <View style={styles.amountRow}>
        <AnimatedAmountDisplay
          accessibilityLabel={`${amountValue} ${amountSuffix}`}
          animated
          color={DesignTextColor.TextDefault}
          containerStyle={styles.amountRow}
          cursor={
            isStablecoinLendingEnabled
              ? {
                  animated: true,
                  style: {
                    width: 1,
                    height: Math.round(amountFontSize * 0.95),
                    backgroundColor: colors.text.muted,
                    transform: [
                      { translateY: Math.round(amountFontSize * -0.04) },
                    ],
                  },
                  testID: INPUT_DISPLAY_TEST_IDS.AMOUNT_CURSOR,
                }
              : false
          }
          onPress={onPressAmount}
          style={amountTextStyle}
          suffix={
            <DesignText
              color={DesignTextColor.TextMuted}
              fontFamily={FontFamily.Hero}
              style={amountTextStyle}
              testID={INPUT_DISPLAY_TEST_IDS.AMOUNT_SUFFIX}
              variant={DesignTextVariant.DisplayLg}
            >
              {amountSuffix}
            </DesignText>
          }
          value={amountValue}
        />
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
