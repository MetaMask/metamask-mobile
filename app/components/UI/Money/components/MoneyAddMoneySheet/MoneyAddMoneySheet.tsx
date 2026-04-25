import React, { useCallback, useRef } from 'react';
import { TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  Icon,
  IconName,
  IconSize,
  IconColor,
} from '@metamask/design-system-react-native';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../component-library/components/BottomSheets/BottomSheet';
import BottomSheetHeader from '../../../../../component-library/components/BottomSheets/BottomSheetHeader';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../component-library/components/Texts/Text';
import Tag from '../../../../../component-library/components/Tags/Tag';
import Routes from '../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../locales/i18n';
import { useStyles } from '../../../../../component-library/hooks';
import { useMusdBalance } from '../../../Earn/hooks/useMusdBalance';
import { useMusdConversionFlowData } from '../../../Earn/hooks/useMusdConversionFlowData';
import {
  MUSD_CONVERSION_DEFAULT_CHAIN_ID,
  MUSD_TOKEN_ASSET_ID_BY_CHAIN,
} from '../../../Earn/constants/musd';
import { useRampNavigation } from '../../../Ramp/hooks/useRampNavigation';
import styleSheet from './MoneyAddMoneySheet.styles';
import { MoneyAddMoneySheetTestIds } from './MoneyAddMoneySheet.testIds';

interface Option {
  label: string;
  icon: IconName;
  onPress: () => void;
  testID: string;
}

const MoneyAddMoneySheet: React.FC = () => {
  const sheetRef = useRef<BottomSheetRef>(null);
  const navigation = useNavigation();
  const { styles } = useStyles(styleSheet, {});

  const { fiatBalanceAggregatedFormatted } = useMusdBalance();
  const { getChainIdForBuyFlow } = useMusdConversionFlowData();
  const { goToBuy } = useRampNavigation();

  const closeAndNavigate = useCallback((navigateFn: () => void) => {
    sheetRef.current?.onCloseBottomSheet(navigateFn);
  }, []);

  // TODO(MUSD-478/MUSD-516): point to the MM Pay "Add money" amount-entry
  // screen (Figma 2547:8887). Interim: existing mUSD quick-convert token list.
  const handleConvertCrypto = useCallback(() => {
    closeAndNavigate(() => {
      navigation.navigate(Routes.EARN.MUSD.QUICK_CONVERT as never);
    });
  }, [closeAndNavigate, navigation]);

  // TODO(MUSD-479): point to the Ramps "Add funds" amount-entry screen
  // (Figma 2547:8780). Interim: unified smart-routed Buy flow with mUSD
  // pre-selected so the destination matches the Money Hub experience.
  const handleDepositFunds = useCallback(() => {
    const chainId = getChainIdForBuyFlow
      ? getChainIdForBuyFlow()
      : MUSD_CONVERSION_DEFAULT_CHAIN_ID;
    closeAndNavigate(() => {
      goToBuy({ assetId: MUSD_TOKEN_ASSET_ID_BY_CHAIN[chainId] });
    });
  }, [closeAndNavigate, getChainIdForBuyFlow, goToBuy]);

  // TODO: wire to the "move external mUSD → Money Account" flow once the
  // dedicated ticket lands. Interim: close sheet.
  const handleMoveMusd = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet();
  }, []);

  const options: Option[] = [
    {
      label: strings('money.add_money_sheet.convert_crypto'),
      icon: IconName.Refresh,
      onPress: handleConvertCrypto,
      testID: MoneyAddMoneySheetTestIds.CONVERT_CRYPTO_OPTION,
    },
    {
      label: strings('money.add_money_sheet.deposit_funds'),
      icon: IconName.AttachMoney,
      onPress: handleDepositFunds,
      testID: MoneyAddMoneySheetTestIds.DEPOSIT_FUNDS_OPTION,
    },
    {
      label: fiatBalanceAggregatedFormatted
        ? strings('money.add_money_sheet.move_musd', {
            amount: fiatBalanceAggregatedFormatted,
          })
        : strings('money.add_money_sheet.move_musd_no_amount'),
      icon: IconName.Add,
      onPress: handleMoveMusd,
      testID: MoneyAddMoneySheetTestIds.MOVE_MUSD_OPTION,
    },
  ];

  return (
    <BottomSheet
      ref={sheetRef}
      shouldNavigateBack
      testID={MoneyAddMoneySheetTestIds.CONTAINER}
      keyboardAvoidingViewEnabled={false}
    >
      <BottomSheetHeader onClose={() => sheetRef.current?.onCloseBottomSheet()}>
        <Text variant={TextVariant.HeadingSM}>
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
            <Text variant={TextVariant.BodyMDMedium}>{item.label}</Text>
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
              variant={TextVariant.BodyMDMedium}
              color={TextColor.Alternative}
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
