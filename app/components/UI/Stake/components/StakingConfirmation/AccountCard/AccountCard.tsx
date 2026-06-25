import React from 'react';
import { View } from 'react-native';
import { useSelector } from 'react-redux';
import { KeyValueRow, Text } from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../locales/i18n';
import Avatar, {
  AvatarVariant,
  AvatarSize,
} from '../../../../../../component-library/components/Avatars/Avatar';
import { selectSelectedInternalAccountByScope } from '../../../../../../selectors/multichainAccounts/accounts';
import { useStyles } from '../../../../../hooks/useStyles';
import Card from '../../../../../../component-library/components/Cards/Card';
import styleSheet from './AccountCard.styles';
import images from '../../../../../../images/image-icons';
import AccountTag from '../AccountTag/AccountTag';
import { selectNetworkName } from '../../../../../../selectors/networkInfos';
import { AccountCardProps } from './AccountCard.types';
import ContractTag from '../ContractTag/ContractTag';
import useVaultMetadata from '../../../hooks/useVaultMetadata';
import { EVM_SCOPE } from '../../../../Earn/constants/networks';
import { selectAvatarAccountType } from '../../../../../../selectors/settings';

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
      <Card testID="account-card" style={styles.cardGroupTop} disabled>
        {selectedAccount && (
          <KeyValueRow
            keyLabel={primaryLabel}
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
          keyLabel={secondaryLabel}
          value={
            <ContractTag
              contractAddress={vaultMetadata?.vaultAddress ?? contractName}
              contractName={contractName}
              avatarAccountType={avatarAccountType}
            />
          }
        />
      </Card>
      <Card style={styles.cardGroupBottom} disabled>
        <KeyValueRow
          keyLabel={strings('asset_details.network')}
          value={
            <View style={styles.networkKeyValueRow}>
              <Avatar
                variant={AvatarVariant.Network}
                imageSource={images.ETHEREUM}
                size={AvatarSize.Xs}
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
