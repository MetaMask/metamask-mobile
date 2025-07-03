import React from 'react';
import { View } from 'react-native';

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
import { useAccounts } from '../../../../hooks/useAccounts';
import { useStyles } from '../../../../hooks/useStyles';
import styleSheet from './account-selection.styles';

export const AccountSelection = ({ onClose }: { onClose: () => void }) => {
  const { styles } = useStyles(styleSheet, {});
  const { ensByAccountAddress, evmAccounts: accounts } = useAccounts();

  return (
    <View style={styles.wrapper}>
      <Text variant={TextVariant.HeadingMD}>Edit Accounts</Text>
      <ButtonIcon
        iconColor={IconColor.Default}
        iconName={IconName.ArrowLeft}
        onPress={onClose}
        size={ButtonIconSizes.Md}
        style={styles.edit}
      />
      <EvmAccountSelectorList
        onSelectAccount={() => {}}
        accounts={accounts}
        ensByAccountAddress={ensByAccountAddress}
        isMultiSelect
      />
    </View>
  );
};
