import React, { useCallback, useMemo } from 'react';
import { Hex } from '@metamask/utils';
import { View } from 'react-native';

import { strings } from '../../../../../../locales/i18n';
import Checkbox from '../../../../../component-library/components/Checkbox';
import ButtonIcon, {
  ButtonIconSizes,
} from '../../../../../component-library/components/Buttons/ButtonIcon';
import EvmAccountSelectorList from '../../../../UI/EvmAccountSelectorList';
import {
  IconColor,
  IconName,
} from '../../../../../component-library/components/Icons/Icon';
import Text, {
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { Account, EnsByAccountAddress } from '../../../../hooks/useAccounts';
import { useStyles } from '../../../../hooks/useStyles';
import styleSheet from './account-selection.styles';
import Button, {
  ButtonSize,
  ButtonVariants,
} from '../../../../../component-library/components/Buttons/Button';

export const AccountSelection = ({
  accounts,
  ensByAccountAddress,
  onClose,
  selectedAddresses,
  setSelectedAddresses,
  onUpdate,
}: {
  accounts: Account[];
  ensByAccountAddress: EnsByAccountAddress;
  onClose: () => void;
  selectedAddresses: Hex[];
  setSelectedAddresses: (addresses: Hex[]) => void;
  onUpdate: () => void;
}) => {
  const { styles } = useStyles(styleSheet, {});

  const onSelectAccount = useCallback(
    (address: string) => {
      if (selectedAddresses.includes(address as Hex)) {
        setSelectedAddresses(
          selectedAddresses.filter((add) => add !== address),
        );
      } else {
        setSelectedAddresses([...selectedAddresses, address as Hex]);
      }
    },
    [selectedAddresses, setSelectedAddresses],
  );

  const handleSelectAllChange = useCallback(() => {
    if (selectedAddresses.length === accounts.length) {
      setSelectedAddresses([]);
    } else {
      setSelectedAddresses(accounts.map(({ address }) => address as Hex));
    }
  }, [accounts, selectedAddresses, setSelectedAddresses]);

  const accountList = useMemo(
    () =>
      (accounts ?? []).map((acc) => ({
        ...acc,
        isSelected: selectedAddresses.includes(acc.address as Hex),
      })),
    [accounts, selectedAddresses],
  );

  return (
    <View style={styles.wrapper}>
      <Text style={styles.title} variant={TextVariant.HeadingLG}>
        {strings('confirm.7702_functionality.editAccounts')}
      </Text>
      <ButtonIcon
        iconColor={IconColor.Default}
        iconName={IconName.ArrowLeft}
        onPress={onClose}
        size={ButtonIconSizes.Md}
        style={styles.edit}
        testID="account_selection_close"
      />
      <View style={styles.selectAllWrapper}>
        <Checkbox
          label={strings('confirm.7702_functionality.selectAll')}
          isChecked={selectedAddresses.length === accounts.length}
          isIndeterminate={
            selectedAddresses.length > 0 &&
            selectedAddresses.length !== accounts.length
          }
          onPress={handleSelectAllChange}
          testID="account_selection_select_all"
        />
      </View>
      <EvmAccountSelectorList
        onSelectAccount={onSelectAccount}
        accounts={accountList}
        ensByAccountAddress={ensByAccountAddress}
        isMultiSelect
      />
      <Button
        variant={ButtonVariants.Primary}
        size={ButtonSize.Lg}
        style={styles.button}
        label={strings('confirm.7702_functionality.useSmartAccount')}
        onPress={onUpdate}
      />
    </View>
  );
};
