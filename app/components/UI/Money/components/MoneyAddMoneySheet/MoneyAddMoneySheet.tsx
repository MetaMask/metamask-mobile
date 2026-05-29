import React, { useCallback, useRef } from 'react';
import { TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import BigNumber from 'bignumber.js';
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
import { useMoneyAccountAddRouting } from '../../hooks/useMoneyAccountAddRouting';
import { useElevatedSurface } from '../../../../../util/theme/themeUtils';
import styleSheet from './MoneyAddMoneySheet.styles';
import { MoneyAddMoneySheetTestIds } from './MoneyAddMoneySheet.testIds';

interface Option {
  label: string;
  description?: string;
  descriptionTestID?: string;
  icon: IconName;
  onPress: () => void;
  testID: string;
}

const MoneyAddMoneySheet: React.FC = () => {
  const sheetRef = useRef<BottomSheetRef>(null);
  const navigation = useNavigation();
  const { styles } = useStyles(styleSheet, {});
  const surfaceClass = useElevatedSurface();

  const {
    fiatBalanceAggregated,
    fiatBalanceAggregatedFormatted,
    tokenBalanceAggregated,
  } = useMusdBalance();
  const { hasMusdBalance, convertCrypto, depositFunds, moveMusd } =
    useMoneyAccountAddRouting();

  const closeAndNavigate = useCallback((navigateFn: () => void) => {
    sheetRef.current?.onCloseBottomSheet(navigateFn);
  }, []);

  const handleGoBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleConvertCrypto = useCallback(() => {
    closeAndNavigate(() => {
      convertCrypto();
    });
  }, [closeAndNavigate, convertCrypto]);

  const handleDepositFunds = useCallback(() => {
    closeAndNavigate(() => {
      depositFunds();
    });
  }, [closeAndNavigate, depositFunds]);

  const handleMoveMusd = useCallback(() => {
    closeAndNavigate(() => {
      moveMusd();
    });
  }, [closeAndNavigate, moveMusd]);

  const parsedMusdFiat = Number(fiatBalanceAggregated);
  const hasParsedFiatBalance =
    Number.isFinite(parsedMusdFiat) && parsedMusdFiat > 0;

  const moveMusdAmount = hasParsedFiatBalance
    ? fiatBalanceAggregatedFormatted
    : new BigNumber(tokenBalanceAggregated).toFixed(2);
  const moveMusdLabel = hasMusdBalance
    ? strings('money.add_money_sheet.move_musd', { amount: moveMusdAmount })
    : '';

  const baseOptions: Option[] = [
    {
      label: strings('money.add_money_sheet.convert_crypto'),
      description: strings('money.add_money_sheet.convert_crypto_description'),
      descriptionTestID: MoneyAddMoneySheetTestIds.CONVERT_CRYPTO_DESCRIPTION,
      icon: IconName.Refresh,
      onPress: handleConvertCrypto,
      testID: MoneyAddMoneySheetTestIds.CONVERT_CRYPTO_OPTION,
    },
    {
      label: strings('money.add_money_sheet.deposit_funds'),
      description: strings('money.add_money_sheet.deposit_funds_description'),
      descriptionTestID: MoneyAddMoneySheetTestIds.DEPOSIT_FUNDS_DESCRIPTION,
      icon: IconName.AttachMoney,
      onPress: handleDepositFunds,
      testID: MoneyAddMoneySheetTestIds.DEPOSIT_FUNDS_OPTION,
    },
  ];

  const options: Option[] = hasMusdBalance
    ? [
        ...baseOptions,
        {
          label: moveMusdLabel,
          description: strings('money.add_money_sheet.move_musd_description'),
          descriptionTestID: MoneyAddMoneySheetTestIds.MOVE_MUSD_DESCRIPTION,
          icon: IconName.Add,
          onPress: handleMoveMusd,
          testID: MoneyAddMoneySheetTestIds.MOVE_MUSD_OPTION,
        },
      ]
    : baseOptions;

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
            onPress={item.onPress}
            style={styles.row}
            testID={item.testID}
          >
            <Icon
              name={item.icon}
              size={IconSize.Lg}
              color={IconColor.IconDefault}
            />
            <View style={styles.rowLabelContainer}>
              <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
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
