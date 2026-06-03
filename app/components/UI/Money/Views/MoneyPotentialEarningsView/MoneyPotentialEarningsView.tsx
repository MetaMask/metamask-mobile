import React, { useCallback } from 'react';
import { ScrollView } from 'react-native';
import { useSelector } from 'react-redux';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
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
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { useStyles } from '../../../../../component-library/hooks';
import { useMoneyDepositTokens } from '../../hooks/useMoneyDepositTokens';
import useMoneyAccountBalance from '../../hooks/useMoneyAccountBalance';
import { useProjectedEarnings } from '../../hooks/useProjectedEarnings';
import { selectCurrentCurrency } from '../../../../../selectors/currencyRateController';
import { moneyFormatFiat } from '../../utils/moneyFormatFiat';
import Logger from '../../../../../util/Logger';
import Routes from '../../../../../constants/navigation/Routes';
import { AssetType } from '../../../../Views/confirmations/types/token';
import { Hex } from '@metamask/utils';
import PotentialEarningsTokenRow from '../../components/MoneyPotentialEarnings/PotentialEarningsTokenRow';
import { isPositiveNumber } from '../../utils/number';
import styleSheet from './MoneyPotentialEarningsView.styles';
import { MoneyPotentialEarningsViewTestIds } from './MoneyPotentialEarningsView.testIds';
import { useMoneyAccountDeposit } from '../../hooks/useMoneyAccount';

const MoneyPotentialEarningsView = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { styles } = useStyles(styleSheet, {});
  const currentCurrency = useSelector(selectCurrentCurrency);

  const { tokens: depositTokens, isNoFeeToken } = useMoneyDepositTokens();
  const { initiateDeposit } = useMoneyAccountDeposit();
  const { apyPercent } = useMoneyAccountBalance();
  const apyPercentForProjection = apyPercent ?? 0;

  const { eligibleTokens, totalAssetsFiat, projectedAmount } =
    useProjectedEarnings(depositTokens, apyPercent);

  const handleBackPress = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleInfoPress = useCallback(() => {
    navigation.navigate(Routes.MONEY.MODALS.ROOT, {
      screen: Routes.MONEY.MODALS.EARN_CRYPTO_INFO_SHEET,
    });
  }, [navigation]);

  const handleConvertPress = useCallback(async () => {
    const defaultToken = eligibleTokens[0];

    if (!defaultToken) {
      return;
    }
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
  }, [eligibleTokens, initiateDeposit]);

  const handleTokenPress = useCallback(
    (token: AssetType) => async () => {
      try {
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
    [initiateDeposit],
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
                {
                  total: moneyFormatFiat(
                    new BigNumber(totalAssetsFiat),
                    currentCurrency,
                  ),
                },
              )} `}
              <Text
                variant={TextVariant.BodyMd}
                fontWeight={FontWeight.Medium}
                color={TextColor.SuccessDefault}
              >
                {`+${moneyFormatFiat(new BigNumber(projectedAmount), currentCurrency)}`}
              </Text>
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
            apyPercent={apyPercentForProjection}
            onPress={handleTokenPress(token)}
            testID={MoneyPotentialEarningsViewTestIds.TOKEN_ROW(index)}
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
