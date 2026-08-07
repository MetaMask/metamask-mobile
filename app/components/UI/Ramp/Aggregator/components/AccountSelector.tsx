import React, { useCallback, useMemo } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import { navigateWithDetails } from '../../../../../util/navigation/navUtils';
import { useSelector } from 'react-redux';
import {
  AvatarAccount,
  AvatarAccountSize,
  SelectButton,
  SelectButtonSize,
  SelectButtonVariant,
} from '@metamask/design-system-react-native';

import { useAccountGroupName } from '../../../../hooks/multichainAccounts/useAccountGroupName';
import { selectSelectedInternalAccountFormattedAddress } from '../../../../../selectors/accountsController';
import { BuildQuoteSelectors } from '../Views/BuildQuote/BuildQuote.testIds';
import { createAccountSelectorNavDetails } from '../../../../Views/AccountSelector';
import { selectAvatarAccountType } from '../../../../../selectors/settings';
import {
  type AccountAvatarVariant,
  getAvatarAccountVariant,
} from '../../../../../component-library/components-temp/MultichainAccounts/avatarAccountVariant';

const LOADING_ACCOUNT_LABEL = 'Account is loading...';

/**
 * Ramp account picker control built on MMDS `SelectButton`.
 *
 * For new generic select triggers, use `SelectButton` from
 * `@metamask/design-system-react-native` directly instead of the deprecated
 * `SelectorButton` from `app/components/Base/SelectorButton`.
 */
const AccountSelector = ({ isEvmOnly }: { isEvmOnly?: boolean }) => {
  const navigation = useNavigation<AppNavigationProp>();
  const accountName = useAccountGroupName();
  const selectedAddress = useSelector(
    selectSelectedInternalAccountFormattedAddress,
  );
  const accountAvatarType = useSelector(selectAvatarAccountType);
  const accountAvatarVariant = useMemo(
    () => getAvatarAccountVariant(accountAvatarType as AccountAvatarVariant),
    [accountAvatarType],
  );

  const openAccountSelector = useCallback(() => {
    navigateWithDetails(
      navigation,
      createAccountSelectorNavDetails({
        isEvmOnly,
        disableAddAccountButton: true,
      }),
    );
  }, [isEvmOnly, navigation]);

  return (
    <SelectButton
      variant={SelectButtonVariant.Primary}
      size={SelectButtonSize.Sm}
      placeholder={LOADING_ACCOUNT_LABEL}
      value={selectedAddress ? accountName : null}
      onPress={openAccountSelector}
      testID={BuildQuoteSelectors.ACCOUNT_PICKER}
      accessibilityRole="button"
      twClassName="shrink min-w-0"
      textProps={{
        numberOfLines: 1,
        ellipsizeMode: 'middle',
      }}
      startAccessory={
        selectedAddress ? (
          <AvatarAccount
            address={selectedAddress}
            size={AvatarAccountSize.Xs}
            variant={accountAvatarVariant}
          />
        ) : undefined
      }
    />
  );
};

export default AccountSelector;
