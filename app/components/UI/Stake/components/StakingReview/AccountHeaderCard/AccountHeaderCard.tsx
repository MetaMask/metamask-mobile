import React from 'react';
import { View } from 'react-native';
import { useSelector } from 'react-redux';
import { strings } from '../../../../../../../locales/i18n';
import TagBase, {
  TagShape,
  TagSeverity,
} from '../../../../../../component-library/base-components/TagBase';
import KeyValueRow from '../../../../../../component-library/components-temp/KeyValueRow';
import Avatar, {
  AvatarVariant,
  AvatarSize,
  AvatarAccountType,
} from '../../../../../../component-library/components/Avatars/Avatar';
import Text from '../../../../../../component-library/components/Texts/Text';
import { RootState } from '../../../../../../reducers';
import { selectSelectedInternalAccount } from '../../../../../../selectors/accountsController';
import { useStyles } from '../../../../../hooks/useStyles';
import Card from '../../../../../../component-library/components/Cards/Card';
import styleSheet from './AccountHeaderCard.styles';
import images from '../../../../../../images/image-icons';
import { AccountHeaderCardProps } from './AccountHeaderCard.types';
import AccountTag from '../AccountTag/AccountTag';
import { selectNetworkName } from '../../../../../../selectors/networkInfos';

const AccountHeaderCard = ({ recipient }: AccountHeaderCardProps) => {
  const { styles } = useStyles(styleSheet, {});

  const account = useSelector(selectSelectedInternalAccount);

  const useBlockieIcon = useSelector(
    (state: RootState) => state.settings.useBlockieIcon,
  );

  const networkName = useSelector(selectNetworkName);

  return (
    <View>
      <Card style={styles.cardGroupTop} disabled>
        {account && (
          <KeyValueRow
            field={{ label: { text: strings('stake.staking_from') } }}
            value={{
              label: (
                <TagBase
                  startAccessory={
                    <Avatar
                      variant={AvatarVariant.Account}
                      size={AvatarSize.Xs}
                      accountAddress={account?.address}
                      type={
                        useBlockieIcon
                          ? AvatarAccountType.Blockies
                          : AvatarAccountType.JazzIcon
                      }
                    />
                  }
                  shape={TagShape.Pill}
                  severity={TagSeverity.Info}
                >
                  {account.metadata.name}
                </TagBase>
              ),
            }}
          />
        )}
        <KeyValueRow
          field={{
            label: { text: strings('stake.interacting_with') },
          }}
          value={{
            label: (
              <AccountTag
                address={recipient.address}
                name={recipient.name}
                useBlockieIcon={useBlockieIcon}
              />
            ),
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
