import React, { useCallback, useEffect, useState } from 'react';
import { Hex } from '@metamask/utils';
import { View } from 'react-native';
import { useSelector } from 'react-redux';

import { strings } from '../../../../../../locales/i18n';
import Engine from '../../../../../core/Engine';
import ButtonIcon, {
  ButtonIconSizes,
} from '../../../../../component-library/components/Buttons/ButtonIcon';
import Button, {
  ButtonSize,
  ButtonVariants,
} from '../../../../../component-library/components/Buttons/Button';
import BottomSheet from '../../../../../component-library/components/BottomSheets/BottomSheet';
import {
  IconColor,
  IconName,
} from '../../../../../component-library/components/Icons/Icon';
import { selectSmartAccountOptInForAccounts } from '../../../../../selectors/preferencesController';
import { useAccounts } from '../../../../hooks/useAccounts';
import { useStyles } from '../../../../hooks/useStyles';
import { AccountSelection } from '../account-selection';
import { SmartAccountUpdateContent } from '../smart-account-update-content';
import styleSheet from './smart-account-update-modal.styles';
import { SmartAccountUpdateSuccess } from './smart-account-update-success';

export const SmartAccountUpdateModal = () => {
  const { PreferencesController } = Engine.context;
  const [acknowledged, setAcknowledged] = useState(false);
  const [isAccountSelectionVisible, setShowAccountSelection] = useState(false);
  const { ensByAccountAddress, evmAccounts: accounts } = useAccounts();
  const smartAccountOptInForAccounts = useSelector(
    selectSmartAccountOptInForAccounts,
  );
  const [selectedAddresses, setSelectedAddresses] = useState<Hex[]>(
    smartAccountOptInForAccounts,
  );
  const { styles } = useStyles(styleSheet, {});

  useEffect(() => {
    if (selectedAddresses?.length === 0 && accounts?.length) {
      setSelectedAddresses(accounts.map(({ address }) => address as Hex));
    }
  }, [accounts, selectedAddresses, setSelectedAddresses]);

  const onUpdate = useCallback(() => {
    PreferencesController.setSmartAccountOptInForAccounts(selectedAddresses);
    setAcknowledged(true);
    setShowAccountSelection(false);
  }, [selectedAddresses, setAcknowledged, smartAccountOptInForAccounts]); // eslint-disable-line react-hooks/exhaustive-deps

  const showAccountSelection = useCallback(() => {
    setShowAccountSelection(true);
  }, [setShowAccountSelection]);

  const hideAccountSelection = useCallback(() => {
    setShowAccountSelection(false);
  }, [setShowAccountSelection]);

  return (
    <BottomSheet style={styles.bottomSheet}>
      {acknowledged && <SmartAccountUpdateSuccess />}
      {isAccountSelectionVisible && (
        <AccountSelection
          accounts={accounts}
          ensByAccountAddress={ensByAccountAddress}
          onClose={hideAccountSelection}
          selectedAddresses={selectedAddresses}
          setSelectedAddresses={setSelectedAddresses}
          onUpdate={onUpdate}
        />
      )}
      {!acknowledged && !isAccountSelectionVisible && (
        <View style={styles.wrapper}>
          <ButtonIcon
            iconColor={IconColor.Default}
            iconName={IconName.Edit}
            onPress={showAccountSelection}
            size={ButtonIconSizes.Md}
            style={styles.edit}
            testID="open_account_selection"
          />
          <SmartAccountUpdateContent selectedAddresses={selectedAddresses} />
          <Button
            variant={ButtonVariants.Primary}
            size={ButtonSize.Lg}
            style={styles.button}
            label={strings('confirm.7702_functionality.useSmartAccount')}
            onPress={onUpdate}
          />
        </View>
      )}
    </BottomSheet>
  );
};
