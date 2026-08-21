import React from 'react';
import { View } from 'react-native';
import { useSelector } from 'react-redux';
import {
  AvatarNetwork,
  AvatarNetworkSize,
  Card,
  KeyValueRow,
  Text,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../locales/i18n';
import { selectSelectedInternalAccountByScope } from '../../../../../../selectors/multichainAccounts/accounts';
import { useStyles } from '../../../../../hooks/useStyles';
import styleSheet from './AccountCard.styles';
import images from '../../../../../../images/image-icons';
import AccountTag from '../AccountTag/AccountTag';
import { selectNetworkName } from '../../../../../../selectors/networkInfos';
import { AccountCardProps } from './AccountCard.types';
import ContractTag from '../ContractTag/ContractTag';
import useVaultMetadata from '../../../hooks/useVaultMetadata';
import { EVM_SCOPE } from '../../../../Earn/constants/networks';
import { selectAvatarAccountType } from '../../../../../../selectors/settings';
import {
  KEY_VALUE_ROW_CLASSNAME,
  KEY_VALUE_ROW_KEY_TEXT_PROPS,
} from '../keyValueRow';

const AccountCard = ({
  contractName,
  primaryLabel,
  secondaryLabel,
  chainId,
}: AccountCardProps) => {
  const { styles } = useStyles(styleSheet, {});

  const selectedAccount = useSelector(selectSelectedInternalAccountByScope)(
    EVM_SCOPE,
  );

  const networkName = useSelector(selectNetworkName);

  const avatarAccountType = useSelector(selectAvatarAccountType);

  const { vaultMetadata } = useVaultMetadata(chainId);

  return (
    <View>
      <Card accessible testID="account-card" style={styles.cardGroupTop}>
        {selectedAccount && (
          <KeyValueRow
            twClassName={KEY_VALUE_ROW_CLASSNAME}
            keyLabel={primaryLabel}
            keyTextProps={KEY_VALUE_ROW_KEY_TEXT_PROPS}
            value={
              <AccountTag
                accountAddress={selectedAccount?.address}
                accountName={selectedAccount.metadata.name}
                avatarAccountType={avatarAccountType}
              />
            }
          />
        )}
        <KeyValueRow
          twClassName={KEY_VALUE_ROW_CLASSNAME}
          keyLabel={secondaryLabel}
          keyTextProps={KEY_VALUE_ROW_KEY_TEXT_PROPS}
          value={
            <ContractTag
              contractAddress={vaultMetadata?.vaultAddress ?? contractName}
              contractName={contractName}
              avatarAccountType={avatarAccountType}
            />
          }
        />
      </Card>
      <Card accessible style={styles.cardGroupBottom}>
        <KeyValueRow
          twClassName={KEY_VALUE_ROW_CLASSNAME}
          keyLabel={strings('asset_details.network')}
          keyTextProps={KEY_VALUE_ROW_KEY_TEXT_PROPS}
          value={
            <View style={styles.networkKeyValueRow}>
              <AvatarNetwork
                twClassName="rounded bg-default"
                src={
                  images.ETHEREUM as React.ComponentProps<
                    typeof AvatarNetwork
                  >['src']
                }
                size={AvatarNetworkSize.Xs}
              />
              <Text>{networkName}</Text>
            </View>
          }
        />
      </Card>
    </View>
  );
};

export default AccountCard;
