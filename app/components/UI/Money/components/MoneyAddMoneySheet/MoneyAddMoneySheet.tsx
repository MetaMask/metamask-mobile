import React, { useCallback, useMemo, useRef } from 'react';
import { TouchableOpacity, View } from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import BigNumber from 'bignumber.js';
import { TransactionType } from '@metamask/transaction-controller';
import {
  BottomSheet,
  BottomSheetHeader,
  type BottomSheetRef,
  FontWeight,
  Icon,
  IconName,
  IconSize,
  IconColor,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import Tag from '../../../../../component-library/components/Tags/Tag';
import { strings } from '../../../../../../locales/i18n';
import { useStyles } from '../../../../../component-library/hooks';
import { useMusdBalance } from '../../../Earn/hooks/useMusdBalance';
import {
  MUSD_CONVERSION_DEFAULT_CHAIN_ID,
  MUSD_TOKEN_ADDRESS_BY_CHAIN,
} from '../../../Earn/constants/musd';
import { Hex } from '@metamask/utils';
import { useMoneyAccountDeposit } from '../../hooks/useMoneyAccount';
import { useMMPayFiatConfig } from '../../../../Views/confirmations/hooks/pay/useMMPayFiatConfig';
import { useElevatedSurface } from '../../../../../util/theme/themeUtils';
import { selectHasAnyNonZeroTokenBalance } from '../../../../../selectors/tokenBalancesController';
import {
  getRampRoutingDecision,
  UnifiedRampRoutingType,
} from '../../../../../reducers/fiatOrders';
import styleSheet from './MoneyAddMoneySheet.styles';
import { MoneyAddMoneySheetTestIds } from './MoneyAddMoneySheet.testIds';

interface Option {
  label: string;
  description?: string;
  descriptionTestID?: string;
  icon: IconName;
  onPress: () => void;
  testID: string;
  disabled?: boolean;
}

const MoneyAddMoneySheet: React.FC = () => {
  const sheetRef = useRef<BottomSheetRef>(null);
  const navigation = useNavigation();
  const { styles } = useStyles(styleSheet, {});
  const surfaceClass = useElevatedSurface();

  const {
    fiatBalanceAggregated,
    fiatBalanceAggregatedFormatted,
    hasMusdBalanceOnAnyChain,
    tokenBalanceAggregated,
    tokenBalanceByChain,
  } = useMusdBalance();
  const { initiateDeposit } = useMoneyAccountDeposit();
  const { enabledTransactionTypes } = useMMPayFiatConfig();
  const hasAnyCryptoBalance = useSelector(selectHasAnyNonZeroTokenBalance);
  const rampRoutingDecision = useSelector(getRampRoutingDecision);
  const isFiatDepositEnabled = useMemo(
    () => enabledTransactionTypes.includes(TransactionType.moneyAccountDeposit),
    [enabledTransactionTypes],
  );

  const closeAndNavigate = useCallback((navigateFn: () => void) => {
    sheetRef.current?.onCloseBottomSheet(navigateFn);
  }, []);

  const handleGoBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleConvertCrypto = useCallback(() => {
    closeAndNavigate(() => {
      initiateDeposit().catch(() => undefined);
    });
  }, [closeAndNavigate, initiateDeposit]);

  const handleDepositFunds = useCallback(() => {
    closeAndNavigate(() => {
      initiateDeposit({ autoSelectFiatPayment: true }).catch(() => undefined);
    });
  }, [closeAndNavigate, initiateDeposit]);

  const handleMoveMusd = useCallback(() => {
    let sourceChainId: Hex = MUSD_CONVERSION_DEFAULT_CHAIN_ID;
    let bestBalance = new BigNumber(0);
    for (const [chainId, balance] of Object.entries(
      tokenBalanceByChain ?? {},
    )) {
      const candidate = new BigNumber(balance ?? 0);
      if (candidate.isGreaterThan(bestBalance)) {
        sourceChainId = chainId as Hex;
        bestBalance = candidate;
      }
    }

    closeAndNavigate(() => {
      initiateDeposit({
        intent: 'addMusd',
        preferredPaymentToken: {
          address: MUSD_TOKEN_ADDRESS_BY_CHAIN[sourceChainId],
          chainId: sourceChainId,
        },
      }).catch(() => undefined);
    });
  }, [closeAndNavigate, initiateDeposit, tokenBalanceByChain]);

  const parsedMusdFiat = Number(fiatBalanceAggregated);
  const hasParsedFiatBalance =
    Number.isFinite(parsedMusdFiat) && parsedMusdFiat > 0;
  const hasMusdBalance = hasMusdBalanceOnAnyChain || hasParsedFiatBalance;

  const moveMusdAmount = hasParsedFiatBalance
    ? fiatBalanceAggregatedFormatted
    : new BigNumber(tokenBalanceAggregated).toFixed(2);
  const moveMusdLabel = hasMusdBalance
    ? strings('money.add_money_sheet.move_musd', { amount: moveMusdAmount })
    : strings('money.add_money_sheet.add_musd');

  const baseOptions: Option[] = [
    {
      label: strings('money.add_money_sheet.convert_crypto'),
      description: strings('money.add_money_sheet.convert_crypto_description'),
      descriptionTestID: MoneyAddMoneySheetTestIds.CONVERT_CRYPTO_DESCRIPTION,
      icon: IconName.Refresh,
      onPress: handleConvertCrypto,
      testID: MoneyAddMoneySheetTestIds.CONVERT_CRYPTO_OPTION,
      disabled: !hasAnyCryptoBalance,
    },
    ...(isFiatDepositEnabled &&
    rampRoutingDecision !== UnifiedRampRoutingType.UNSUPPORTED
      ? [
          {
            label: strings('money.add_money_sheet.deposit_funds'),
            description: strings(
              'money.add_money_sheet.deposit_funds_description',
            ),
            descriptionTestID:
              MoneyAddMoneySheetTestIds.DEPOSIT_FUNDS_DESCRIPTION,
            icon: IconName.AttachMoney,
            onPress: handleDepositFunds,
            testID: MoneyAddMoneySheetTestIds.DEPOSIT_FUNDS_OPTION,
          },
        ]
      : []),
  ];

  const options: Option[] = [
    ...baseOptions,
    {
      label: moveMusdLabel,
      description: strings('money.add_money_sheet.move_musd_description'),
      descriptionTestID: MoneyAddMoneySheetTestIds.MOVE_MUSD_DESCRIPTION,
      icon: IconName.Add,
      onPress: handleMoveMusd,
      testID: MoneyAddMoneySheetTestIds.MOVE_MUSD_OPTION,
      disabled: !hasMusdBalance,
    },
  ];

  return (
    <BottomSheet
      ref={sheetRef}
      goBack={handleGoBack}
      testID={MoneyAddMoneySheetTestIds.CONTAINER}
      keyboardAvoidingViewEnabled={false}
      twClassName={surfaceClass}
    >
      <BottomSheetHeader onClose={() => sheetRef.current?.onCloseBottomSheet()}>
        <Text variant={TextVariant.HeadingSm}>
          {strings('money.add_money_sheet.title')}
        </Text>
      </BottomSheetHeader>
      <View style={styles.list}>
        {options.map((item) => (
          <TouchableOpacity
            key={item.testID}
            disabled={item.disabled}
            onPress={item.disabled ? undefined : item.onPress}
            style={styles.row}
            testID={item.testID}
          >
            <Icon
              name={item.icon}
              size={IconSize.Lg}
              color={
                item.disabled ? IconColor.IconMuted : IconColor.IconDefault
              }
            />
            <View style={styles.rowLabelContainer}>
              <Text
                variant={TextVariant.BodyMd}
                fontWeight={FontWeight.Medium}
                color={item.disabled ? TextColor.TextAlternative : undefined}
              >
                {item.label}
              </Text>
              {item.description ? (
                <Text
                  variant={TextVariant.BodySm}
                  color={TextColor.TextAlternative}
                  testID={item.descriptionTestID}
                >
                  {item.description}
                </Text>
              ) : null}
            </View>
          </TouchableOpacity>
        ))}
        <View
          style={styles.row}
          testID={MoneyAddMoneySheetTestIds.RECEIVE_EXTERNAL_ROW}
        >
          <Icon
            name={IconName.Arrow2Down}
            size={IconSize.Lg}
            color={IconColor.IconMuted}
          />
          <View style={styles.disabledRowContent}>
            <Text
              variant={TextVariant.BodyMd}
              fontWeight={FontWeight.Medium}
              color={TextColor.TextAlternative}
            >
              {strings('money.add_money_sheet.receive_external')}
            </Text>
            <Tag
              label={strings('money.add_money_sheet.coming_soon')}
              style={styles.comingSoonTag}
            />
          </View>
        </View>
      </View>
    </BottomSheet>
  );
};

export default MoneyAddMoneySheet;
