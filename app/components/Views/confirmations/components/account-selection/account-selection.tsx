import React, { useCallback, useMemo } from 'react';
import { View } from 'react-native';

import { strings } from '../../../../../../locales/i18n';
import {
  IconColor,
  IconName,
} from '../../../../../component-library/components/Icons/Icon';
import ButtonIcon, {
  ButtonIconSizes,
} from '../../../../../component-library/components/Buttons/ButtonIcon';
import EvmAccountSelectorList from '../../../../UI/EvmAccountSelectorList';
import Text, {
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { Account, EnsByAccountAddress } from '../../../../hooks/useAccounts';
import { useStyles } from '../../../../hooks/useStyles';
import styleSheet from './account-selection.styles';
import { Hex } from '@metamask/utils';
import Checkbox from '../../../../../component-library/components/Checkbox';

export const AccountSelection = ({
  accounts,
  ensByAccountAddress,
  onClose,
  selectedAddresses,
  setSelectedAddresses,
}: {
  accounts: Account[];
  ensByAccountAddress: EnsByAccountAddress;
  onClose: () => void;
  selectedAddresses: Hex[];
  setSelectedAddresses: (addresses: Hex[]) => void;
}) => {
  const { styles } = useStyles(styleSheet, {});

  const onSelectAccount = useCallback(
    (address: String) => {
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
        />
      </View>
      <EvmAccountSelectorList
        onSelectAccount={onSelectAccount}
        accounts={accountList}
        ensByAccountAddress={ensByAccountAddress}
        isMultiSelect
      />
    </View>
  );
};
