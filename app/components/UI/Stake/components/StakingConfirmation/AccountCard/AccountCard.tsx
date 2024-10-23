import React from 'react';
import { View } from 'react-native';
import { useSelector } from 'react-redux';
import { strings } from '../../../../../../../locales/i18n';
import KeyValueRow from '../../../../../../component-library/components-temp/KeyValueRow';
import Avatar, {
  AvatarVariant,
  AvatarSize,
} from '../../../../../../component-library/components/Avatars/Avatar';
import Text from '../../../../../../component-library/components/Texts/Text';
import { selectSelectedInternalAccount } from '../../../../../../selectors/accountsController';
import { useStyles } from '../../../../../hooks/useStyles';
import Card from '../../../../../../component-library/components/Cards/Card';
import styleSheet from './AccountCard.styles';
import images from '../../../../../../images/image-icons';
import AccountTag from '../AccountTag/AccountTag';
import { selectNetworkName } from '../../../../../../selectors/networkInfos';
import { AccountCardProps } from './AccountCard.types';
import ContractTag from '../ContractTag/ContractTag';

const AccountHeaderCard = ({
  contractName,
  primaryLabel,
  secondaryLabel,
}: AccountCardProps) => {
  const { styles } = useStyles(styleSheet, {});

  const account = useSelector(selectSelectedInternalAccount);

  const networkName = useSelector(selectNetworkName);

  return (
    <View>
      <Card style={styles.cardGroupTop} disabled>
        {account && (
          <KeyValueRow
            field={{ label: { text: primaryLabel } }}
            value={{
              label: (
                <AccountTag
                  accountAddress={account?.address}
                  accountName={account.metadata.name}
                />
              ),
            }}
          />
        )}
        <KeyValueRow
          field={{
            label: { text: secondaryLabel },
          }}
          value={{
            label: <ContractTag contractName={contractName} />,
          }}
        />
      </Card>
      <Card style={styles.cardGroupBottom} disabled>
        <KeyValueRow
          field={{ label: { text: strings('asset_details.network') } }}
          value={{
            label: (
              <View style={styles.networkKeyValueRow}>
                <Avatar
                  variant={AvatarVariant.Network}
                  imageSource={images.ETHEREUM}
                  size={AvatarSize.Xs}
                />
                <Text>{networkName}</Text>
              </View>
            ),
          }}
        />
      </Card>
    </View>
  );
};

export default AccountHeaderCard;
