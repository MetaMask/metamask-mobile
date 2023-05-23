// Third party dependencies.
import React, { useCallback, useRef, useState } from 'react';
import { InteractionManager, Platform, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

// External dependencies.
import AccountSelectorList from '../../UI/AccountSelectorList';
import SheetBottom, {
  SheetBottomRef,
} from '../../../component-library/components/Sheet/SheetBottom';
import SheetHeader from '../../../component-library/components/Sheet/SheetHeader';
import UntypedEngine from '../../../core/Engine';
import AnalyticsV2 from '../../../util/analyticsV2';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { strings } from '../../../../locales/i18n';
import { useAccounts } from '../../hooks/useAccounts';
import generateTestId from '../../../../wdio/utils/generateTestId';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../component-library/components/Buttons/Button';
import Routes from '../../../constants/navigation/Routes';

// Internal dependencies.
import { ACCOUNT_LIST_ID } from './AccountSelector.constants';
import { AccountSelectorProps } from './AccountSelector.types';
import styles from './AccountSelector.styles';

const AccountSelector = ({ route }: AccountSelectorProps) => {
  const { onSelectAccount, checkBalanceError } = route.params || {};
  const Engine = UntypedEngine as any;
  const [isLoading, setIsLoading] = useState(false);
  const sheetRef = useRef<SheetBottomRef>(null);
  const navigation = useNavigation();
  const { accounts, ensByAccountAddress } = useAccounts({
    checkBalanceError,
    isLoading,
  });

  const _onSelectAccount = (address: string) => {
    const { PreferencesController } = Engine.context;
    PreferencesController.setSelectedAddress(address);
    sheetRef.current?.hide();
    onSelectAccount?.(address);
    InteractionManager.runAfterInteractions(() => {
      // Track Event: "Switched Account"
      AnalyticsV2.trackEvent(MetaMetricsEvents.SWITCHED_ACCOUNT, {
        source: 'Wallet Tab',
        number_of_accounts: accounts?.length,
      });
    });
  };

  const onRemoveImportedAccount = useCallback(
    ({ nextActiveAddress }: { nextActiveAddress: string }) => {
      const { PreferencesController } = Engine.context;
      nextActiveAddress &&
        PreferencesController.setSelectedAddress(nextActiveAddress);
    },
    [Engine.context],
  );

  const navigateToAddAccountActions = () => {
    navigation.navigate(Routes.SHEET.ADD_ACCOUNT_ACTIONS, {
      setIsLoading,
      isLoading,
    });
  };

  return (
    <SheetBottom ref={sheetRef}>
      <SheetHeader title={strings('accounts.accounts_title')} />
      <AccountSelectorList
        onSelectAccount={_onSelectAccount}
        onRemoveImportedAccount={onRemoveImportedAccount}
        accounts={accounts}
        ensByAccountAddress={ensByAccountAddress}
        isLoading={isLoading}
        isRemoveAccountEnabled
        {...generateTestId(Platform, ACCOUNT_LIST_ID)}
      />
      <View style={styles.sheet}>
        <Button
          variant={ButtonVariants.Secondary}
          label={strings('account_actions.add_account_or_hardware_wallet')}
          width={ButtonWidthTypes.Full}
          size={ButtonSize.Lg}
          onPress={navigateToAddAccountActions}
        />
      </View>
    </SheetBottom>
  );
};

export default AccountSelector;
