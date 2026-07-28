import React, { useCallback } from 'react';
import { ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { BigNumber } from 'bignumber.js';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Button,
  ButtonIcon,
  ButtonIconSize,
  ButtonSize,
  ButtonVariant,
  FontWeight,
  IconName,
  SensitiveText,
  SensitiveTextLength,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { useStyles } from '../../../../../component-library/hooks';
import { useMoneyDepositTokens } from '../../hooks/useMoneyDepositTokens';
import useMoneyAccountBalance from '../../hooks/useMoneyAccountBalance';
import { useProjectedEarnings } from '../../hooks/useProjectedEarnings';
import { moneyFormatFiat } from '../../utils/moneyFormatFiat';
import { selectPrivacyMode } from '../../../../../selectors/preferencesController';
import Logger from '../../../../../util/Logger';
import Routes from '../../../../../constants/navigation/Routes';
import { AssetType } from '../../../../Views/confirmations/types/token';
import { Hex } from '@metamask/utils';
import PotentialEarningsTokenRow from '../../components/MoneyPotentialEarnings/PotentialEarningsTokenRow';
import { isPositiveNumber } from '../../utils/number';
import styleSheet from './MoneyPotentialEarningsView.styles';
import { MoneyPotentialEarningsViewTestIds } from './MoneyPotentialEarningsView.testIds';
import { useMoneyAccountDeposit } from '../../hooks/useMoneyAccount';
import { useMoneyAnalytics } from '../../hooks/useMoneyAnalytics';
import useMountEffect from '../../hooks/useMountEffect';
import {
  COMPONENT_NAMES,
  MONEY_BUTTON_INTENTS,
  MONEY_BUTTON_TYPES,
  MONEY_TOOLTIP_NAMES,
  MONEY_TOOLTIP_TYPES,
  SCREEN_NAMES,
} from '../../constants/moneyEvents';

const MoneyPotentialEarningsView = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { styles } = useStyles(styleSheet, {});
  const privacyMode = useSelector(selectPrivacyMode);

  const { tokens: depositTokens, isNoFeeToken } = useMoneyDepositTokens({
    overrideToUsd: true,
  });

  const { initiateDeposit } = useMoneyAccountDeposit();
  const { apyDecimal } = useMoneyAccountBalance();
  const apyDecimalForProjection = apyDecimal ?? 0;

  const { eligibleTokens, totalAssetsFiat, projectedAmount, currency } =
    useProjectedEarnings(depositTokens, apyDecimal);

  const {
    trackScreenViewed,
    trackTokenButtonClicked,
    trackTokenSurfaceClicked,
    trackTooltipClicked,
  } = useMoneyAnalytics({
    screen_name: SCREEN_NAMES.MONEY_POTENTIAL_EARNINGS,
  });

  useMountEffect(trackScreenViewed);

  const handleBackPress = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleInfoPress = useCallback(() => {
    trackTooltipClicked({
      tooltip_name: MONEY_TOOLTIP_NAMES.EARN_ON_YOUR_CRYPTO,
      tooltip_type: MONEY_TOOLTIP_TYPES.INFO,
    });
    navigation.navigate(Routes.MONEY.MODALS.ROOT, {
      screen: Routes.MONEY.MODALS.EARN_CRYPTO_INFO_SHEET,
    });
  }, [navigation, trackTooltipClicked]);

  const handleConvertPress = useCallback(async () => {
    const tokenIndex = 0;
    const defaultToken = eligibleTokens[tokenIndex];

    if (!defaultToken) {
      return;
    }

    trackTokenButtonClicked({
      button_type: MONEY_BUTTON_TYPES.TEXT,
      button_intent: MONEY_BUTTON_INTENTS.ADD_MONEY,
      label_key: 'money.potential_earnings.convert_cta',
      redirect_target: SCREEN_NAMES.MONEY_DEPOSIT,
      component_name: COMPONENT_NAMES.MONEY_CONVERT_CRYPTO_BUTTON,
      token_symbol: defaultToken.symbol,
      token_position_in_list: tokenIndex + 1,
      token_chain_id: defaultToken.chainId ?? '',
      tokens_in_list: eligibleTokens.length,
    });

    try {
      await initiateDeposit({
        preferredPaymentToken: {
          address: defaultToken.address as Hex,
          chainId: defaultToken.chainId as Hex,
        },
      });
    } catch (error) {
      Logger.error(error as Error, {
        message:
          '[MoneyPotentialEarningsView] Failed to initiate deposit from CTA',
      });
    }
  }, [eligibleTokens, initiateDeposit, trackTokenButtonClicked]);

  const handleTokenButtonPress = useCallback(
    (token: AssetType, tokenIndex: number) => async () => {
      try {
        trackTokenButtonClicked({
          button_type: MONEY_BUTTON_TYPES.TEXT,
          button_intent: MONEY_BUTTON_INTENTS.ADD_MONEY,
          component_name: COMPONENT_NAMES.MONEY_POTENTIAL_EARNINGS_TOKEN_ROW,
          label_key: 'money.potential_earnings.add',
          redirect_target: SCREEN_NAMES.MONEY_DEPOSIT,
          token_symbol: token.symbol,
          token_position_in_list: tokenIndex + 1,
          token_chain_id: token.chainId ?? '',
          tokens_in_list: eligibleTokens.length,
        });

        await initiateDeposit({
          preferredPaymentToken: {
            address: token.address as Hex,
            chainId: token.chainId as Hex,
          },
        });
      } catch (error) {
        Logger.error(error as Error, {
          message: '[MoneyPotentialEarningsView] Failed to initiate deposit',
        });
      }
    },
    [eligibleTokens.length, initiateDeposit, trackTokenButtonClicked],
  );

  const handleTokenCardPress = useCallback(
    (token: AssetType, tokenIndex: number) => async () => {
      try {
        trackTokenSurfaceClicked({
          component_name: COMPONENT_NAMES.MONEY_POTENTIAL_EARNINGS_TOKEN_ROW,
          redirect_target: SCREEN_NAMES.MONEY_DEPOSIT,
          token_symbol: token.symbol,
          token_position_in_list: tokenIndex + 1,
          token_chain_id: token.chainId ?? '',
          tokens_in_list: eligibleTokens.length,
        });

        await initiateDeposit({
          preferredPaymentToken: {
            address: token.address as Hex,
            chainId: token.chainId as Hex,
          },
        });
      } catch (error) {
        Logger.error(error as Error, {
          message: '[MoneyPotentialEarningsView] Failed to initiate deposit',
        });
      }
    },
    [eligibleTokens.length, initiateDeposit, trackTokenSurfaceClicked],
  );

  return (
    <Box
      style={[styles.safeArea, { paddingTop: insets.top }]}
      testID={MoneyPotentialEarningsViewTestIds.CONTAINER}
    >
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Between}
        twClassName="px-4 py-2"
      >
        <ButtonIcon
          iconName={IconName.ArrowLeft}
          size={ButtonIconSize.Md}
          onPress={handleBackPress}
          testID={MoneyPotentialEarningsViewTestIds.BACK_BUTTON}
        />
        <ButtonIcon
          iconName={IconName.Info}
          size={ButtonIconSize.Md}
          onPress={handleInfoPress}
          accessibilityLabel={strings('money.earn_crypto_info_sheet.title')}
          testID={MoneyPotentialEarningsViewTestIds.INFO_BUTTON}
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

          {isPositiveNumber(projectedAmount) &&
          isPositiveNumber(totalAssetsFiat) ? (
            <Text
              variant={TextVariant.BodyMd}
              fontWeight={FontWeight.Regular}
              color={TextColor.TextAlternative}
              testID={MoneyPotentialEarningsViewTestIds.DESCRIPTION}
            >
              {`${strings(
                'money.potential_earnings.description_with_amounts_prefix',
              )} `}
              <SensitiveText
                variant={TextVariant.BodyMd}
                fontWeight={FontWeight.Regular}
                color={TextColor.TextAlternative}
                isHidden={privacyMode}
                length={SensitiveTextLength.Medium}
                testID={MoneyPotentialEarningsViewTestIds.TOTAL}
              >
                {moneyFormatFiat(new BigNumber(totalAssetsFiat), currency)}
              </SensitiveText>
              {` ${strings(
                'money.potential_earnings.description_with_amounts_middle',
              )} `}
              <SensitiveText
                variant={TextVariant.BodyMd}
                fontWeight={FontWeight.Medium}
                color={TextColor.SuccessDefault}
                isHidden={privacyMode}
                length={SensitiveTextLength.Short}
                testID={MoneyPotentialEarningsViewTestIds.PROJECTED}
              >
                {`+${moneyFormatFiat(new BigNumber(projectedAmount), currency)}`}
              </SensitiveText>
              {` ${strings(
                'money.potential_earnings.description_with_amounts_suffix',
              )}`}
            </Text>
          ) : (
            <Text
              variant={TextVariant.BodyMd}
              fontWeight={FontWeight.Regular}
              color={TextColor.TextAlternative}
              testID={MoneyPotentialEarningsViewTestIds.DESCRIPTION}
            >
              {strings('money.potential_earnings.description')}
            </Text>
          )}
        </Box>

        {eligibleTokens.map((token, index) => (
          <PotentialEarningsTokenRow
            key={`${token.address}-${token.chainId}`}
            token={token}
            hasSubsidizedFee={isNoFeeToken(token)}
            apyDecimal={apyDecimalForProjection}
            onCardPress={handleTokenCardPress(token, index)}
            onButtonPress={handleTokenButtonPress(token, index)}
            testID={MoneyPotentialEarningsViewTestIds.TOKEN_ROW(index)}
            privacyMode={privacyMode}
          />
        ))}
      </ScrollView>
      <Box
        twClassName="px-4 pt-3"
        style={{ paddingBottom: insets.bottom + 12 }}
      >
        <Button
          variant={ButtonVariant.Primary}
          size={ButtonSize.Lg}
          isFullWidth
          onPress={handleConvertPress}
          isDisabled={eligibleTokens.length === 0}
          testID={MoneyPotentialEarningsViewTestIds.CTA_BUTTON}
        >
          {strings('money.potential_earnings.convert_cta')}
        </Button>
      </Box>
    </Box>
  );
};

export default MoneyPotentialEarningsView;
