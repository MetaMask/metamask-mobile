// Third parties dependencies
import React, { useCallback } from 'react';
import { useSelector } from 'react-redux';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { AccountGroupId } from '@metamask/account-api';

// External dependencies
import {
  ButtonIcon,
  ButtonIconSize,
  IconName,
} from '@metamask/design-system-react-native';

import { strings } from '../../../../locales/i18n';
import { useStyles } from '../../../component-library/hooks';
import { WalletViewSelectorsIDs } from '../../Views/Wallet/WalletView.testIds';
import { selectSelectedAccountGroupId } from '../../../selectors/multichainAccounts/accountTreeController';
import { createAddressListNavigationDetails } from '../../Views/MultichainAccounts/AddressList';

// Internal dependencies
import styleSheet from './AddressCopy.styles';
import type { AddressCopyProps } from './AddressCopy.types';
import {
  endTrace,
  trace,
  TraceName,
  TraceOperation,
} from '../../../util/trace';

const AddressCopy = ({ iconColor, hitSlop }: AddressCopyProps) => {
  const { styles } = useStyles(styleSheet, {});
  const { navigate } = useNavigation();

  const selectedAccountGroupId = useSelector(selectSelectedAccountGroupId);

  const handleOnPress = useCallback(() => {
    // Start the trace before navigating to the address list to include the
    // navigation and render times in the trace.
    trace({
      name: TraceName.ShowAccountAddressList,
      op: TraceOperation.AccountUi,
      tags: {
        screen: 'navbar.copy_address',
      },
    });

    navigate(
      ...createAddressListNavigationDetails({
        groupId: selectedAccountGroupId as AccountGroupId,
        title: `${strings(
          'multichain_accounts.address_list.receiving_address',
        )}`,
        onLoad: () => {
          endTrace({ name: TraceName.ShowAccountAddressList });
        },
      }),
    );
  }, [navigate, selectedAccountGroupId]);

  return (
    <View style={styles.address}>
      <ButtonIcon
        iconName={IconName.Copy}
        size={ButtonIconSize.Lg}
        iconProps={iconColor && { color: iconColor }}
        onPress={handleOnPress}
        testID={WalletViewSelectorsIDs.ACCOUNT_COPY_BUTTON}
        hitSlop={hitSlop}
      />
    </View>
  );
};
export default AddressCopy;
