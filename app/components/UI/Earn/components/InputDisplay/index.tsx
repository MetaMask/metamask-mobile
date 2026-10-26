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
import { AnimatedAmountDisplay } from '../../../../../component-library/components-temp/AnimatedAmountDisplay';
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
    isStablecoinLendingEnabled,
    shouldShowLendingMaxSafeWithdrawalMessage,
  });
  const ticker = asset.ticker ?? asset.symbol;

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
        <AnimatedAmountDisplay
          accessibilityLabel={`${isFiat ? amountFiatNumber : amountToken} ${
            isFiat ? currentCurrency.toUpperCase() : ticker
          }`}
          animated
          color={DesignTextColor.TextDefault}
          containerStyle={styles.amountRow}
          cursor={
            isStablecoinLendingEnabled
              ? { animated: true, testID: INPUT_DISPLAY_TEST_IDS.AMOUNT_CURSOR }
              : false
          }
          onPress={onPressAmount}
          style={styles.amountText}
          suffix={
            <DesignText
              color={DesignTextColor.TextMuted}
              fontFamily={FontFamily.Hero}
              style={styles.amountText}
              testID={INPUT_DISPLAY_TEST_IDS.AMOUNT_SUFFIX}
              variant={DesignTextVariant.DisplayMd}
            >
              {isFiat ? currentCurrency.toUpperCase() : ticker}
            </DesignText>
          }
          value={isFiat ? amountFiatNumber : amountToken}
          variant={DesignTextVariant.DisplayMd}
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
