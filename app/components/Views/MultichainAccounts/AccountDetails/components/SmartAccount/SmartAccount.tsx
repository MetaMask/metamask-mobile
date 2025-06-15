import React from 'react';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../../component-library/components/Texts/Text';
import { Box } from '../../../../../UI/Box/Box';
import { strings } from '../../../../../../../locales/i18n';
import {
  EIP7702NetworkConfiguration,
  useEIP7702Networks,
} from '../../../../confirmations/hooks/7702/useEIP7702Networks';
import { InternalAccount } from '@metamask/keyring-internal-api';
import AccountNetworkRow from '../../../../confirmations/components/modals/switch-account-type-modal/account-network-row';
import { isEvmAccountType } from '@metamask/keyring-api';
import { Hex } from '@metamask/utils';
import { AlignItems, FlexDirection } from '../../../../../UI/Box/box.types';
import styleSheet from './SmartAccount.styles';
import { useStyles } from '../../../../../hooks/useStyles';
import { useNavigation } from '@react-navigation/native';
import { FlatList } from 'react-native';
import AppConstants from '../../../../../../core/AppConstants';

interface SmartAccountDetailsProps {
  account: InternalAccount;
}

export const SmartAccountDetails = ({ account }: SmartAccountDetailsProps) => {
  const { styles } = useStyles(styleSheet, {});
  const {
    network7702List,
  }: { network7702List: EIP7702NetworkConfiguration[] } = useEIP7702Networks(
    account.address,
  );
  const navigation = useNavigation();

  const handleLearnMore = () => {
    navigation.navigate('Webview', {
      screen: 'SimpleWebview',
      params: {
        url: AppConstants.URLS.SMART_ACCOUNTS,
        title: 'Smart Accounts',
      },
    });
  };

  if (!isEvmAccountType(account.type)) {
    return null;
  }

  return (
    <Box
      style={styles.container}
      flexDirection={FlexDirection.Column}
      alignItems={AlignItems.flexStart}
    >
      <Text variant={TextVariant.BodyMDMedium}>
        {strings('multichain_accounts.smart_account.title')}
      </Text>
      <Box
        style={styles.description}
        flexDirection={FlexDirection.Row}
        alignItems={AlignItems.flexStart}
      >
        <Text>
          {strings('multichain_accounts.smart_account.description')}{' '}
          <Text color={TextColor.Info} onPress={handleLearnMore}>
            {strings('multichain_accounts.smart_account.learn_more')}
          </Text>
        </Text>
      </Box>
      <FlatList
        style={styles.networkList}
        data={network7702List}
        keyExtractor={(item) => item.chainId}
        renderItem={({ item }) => (
          <AccountNetworkRow network={item} address={account.address as Hex} />
        )}
      />
    </Box>
  );
};
