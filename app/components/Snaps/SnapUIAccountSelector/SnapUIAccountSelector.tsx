import React, { FunctionComponent, useMemo } from 'react';
import { shallowEqual, useSelector } from 'react-redux';
import { CaipChainId } from '@metamask/utils';

import { AccountSelectorState, State } from '@metamask/snaps-sdk';
import { createAccountList, createChainIdList } from '@metamask/snaps-utils';
import { SnapUISelector } from '../SnapUISelector/SnapUISelector';
import { useSnapInterfaceContext } from '../SnapInterfaceContext';
import { Account, useAccounts } from '../../hooks/useAccounts';
import { RootState } from '../../../reducers';
import Avatar, {
  AvatarAccountType,
  AvatarVariant,
} from '../../../component-library/components/Avatars/Avatar';
import { selectPrivacyMode } from '../../../selectors/preferencesController';
import Engine from '../../../core/Engine';
import { Box } from '../../UI/Box/Box';
import { AlignItems, FlexDirection } from '../../UI/Box/box.types';
import Text, {
  TextColor,
  TextVariant,
} from '../../../component-library/components/Texts/Text';
import { isDefaultAccountName } from '../../../util/ENSUtils';
import { formatAddress } from '../../../util/address';
import SensitiveText, {
  SensitiveTextLength,
} from '../../../component-library/components/Texts/SensitiveText';
import AccountNetworkIndicator from '../../UI/AccountNetworkIndicator';

export interface SnapUIAccountSelectorElementProps {
  account: Account;
  ensName?: string;
  privacyMode: boolean;
  avatarType: AvatarAccountType;
}

/**
 * The SnapUIAccountSelectorElement component.
 * @param props - The component props.
 * @param props.account - The account to display.
 * @param props.ensName - The ENS name of the account.
 * @param props.privacyMode - Whether the client is in privacy mode.
 * @param props.avatarType - The type of avatar to display.
 * @returns The AccountSelector element.
 */
export const SnapUIAccountSelectorElement: FunctionComponent<
  SnapUIAccountSelectorElementProps
> = ({ account, ensName, privacyMode, avatarType }) => {
  const { name, address, assets, scopes } = account;

  const accountName = isDefaultAccountName(name) && ensName ? ensName : name;
  const shortAddress = formatAddress(address, 'short');

  const fiatBalance = assets?.fiatBalance.split('\n')[0] || '';

  return (
    <Box
      flexDirection={FlexDirection.Row}
      alignItems={AlignItems.center}
      gap={16}
      style={{
        flex: 1,
      }}
    >
      <Avatar
        variant={AvatarVariant.Account}
        type={avatarType}
        accountAddress={address}
      />
      <Box flexDirection={FlexDirection.Column}>
        <Text variant={TextVariant.BodyMDMedium} numberOfLines={1}>
          {accountName}
        </Text>
        <Text
          variant={TextVariant.BodySM}
          color={TextColor.Alternative}
          numberOfLines={1}
        >
          {shortAddress}
        </Text>
      </Box>
      <Box
        flexDirection={FlexDirection.Column}
        alignItems={AlignItems.flexEnd}
        style={{ marginLeft: 'auto' }}
      >
        <SensitiveText
          length={SensitiveTextLength.Long}
          isHidden={privacyMode}
          variant={TextVariant.BodySMMedium}
        >
          {fiatBalance}
        </SensitiveText>
        <AccountNetworkIndicator partialAccount={{ address, scopes }} />
      </Box>
    </Box>
  );
};

export interface SnapUIAccountSelectorProps {
  name: string;
  label?: string;
  form?: string;
  hideExternalAccounts?: boolean;
  chainIds?: CaipChainId[];
  switchGlobalAccount?: boolean;
  error?: string;
  disabled?: boolean;
}

/**
 * The SnapUIAccountSelector component.
 *
 * @param props - The component props.
 * @param props.name - The name of the selector.
 * @param props.label - The label of the selector.
 * @param props.form - The form the selector belongs to.
 * @param props.hideExternalAccounts - Whether to hide external accounts.
 * @param props.chainIds - The chainIds to filter the accounts by.
 * @param props.switchGlobalAccount - Whether to switch the global account.
 * @param props.error - The error message to display.
 * @param props.disabled - Whether the selector is disabled.
 * @returns The AccountSelector component.
 */
export const SnapUIAccountSelector: FunctionComponent<
  SnapUIAccountSelectorProps
> = ({
  chainIds,
  switchGlobalAccount,
  hideExternalAccounts,
  disabled,
  ...props
}) => {
  const { snapId } = useSnapInterfaceContext();
  const { accounts: internalAccounts, ensByAccountAddress } = useAccounts();
  const accountAvatarType = useSelector(
    (state: RootState) =>
      state.settings.useBlockieIcon
        ? AvatarAccountType.Blockies
        : AvatarAccountType.JazzIcon,
    shallowEqual,
  );

  const privacyMode = useSelector(selectPrivacyMode);

  const accounts = useMemo(() => {
    // Filter out the accounts that are not owned by the snap
    const ownedAccounts = internalAccounts.filter(
      (account) => account.snapId === snapId,
    );

    // Select which accounts to show and filter them by chainId
    const filteredAccounts = (
      hideExternalAccounts ? ownedAccounts : internalAccounts
    ).filter((account) => {
      const filteredChainIds = createChainIdList(account.scopes, chainIds);

      return filteredChainIds.length > 0;
    });

    return filteredAccounts;
  }, [internalAccounts, chainIds, hideExternalAccounts, snapId]);

  const options = accounts.map((account) => ({
    key: 'accountId',
    value: {
      accountId: account.id,
      addresses: createAccountList(
        account.address,
        createChainIdList(account.scopes, chainIds),
      ),
    },
    disabled: false,
  }));

  const optionComponents = accounts.map((account, index) => (
    <SnapUIAccountSelectorElement
      key={index}
      account={account}
      ensName={ensByAccountAddress[account.address]}
      privacyMode={privacyMode}
      avatarType={accountAvatarType}
    />
  ));

  const handleSelect = (value: State) => {
    if (switchGlobalAccount) {
      Engine.context.AccountsController.setSelectedAccount(
        (value as AccountSelectorState).accountId,
      );
    }
  };

  const selectorStyle = {
    maxHeight: 89,
  };

  const selectorItemStyle = {
    maxHeight: 89,
  };

  return (
    <SnapUISelector
      title={'Select account'}
      options={options}
      {...props}
      optionComponents={optionComponents}
      onSelect={handleSelect}
      disabled={disabled || accounts.length === 0}
      style={selectorStyle}
      itemStyle={selectorItemStyle}
    />
  );
};
