import React, { Fragment, useMemo, useState } from 'react';
import { FlatList, TouchableWithoutFeedback, View } from 'react-native';
import { useStyles } from '../../hooks/useStyles';
import styleSheet from './SRPListItem.styles';
import { SRPListItemProps } from './SRPListItem.type';
import Text, {
  TextColor,
  TextVariant,
} from '../../../component-library/components/Texts/Text';
import Icon, {
  IconName,
} from '../../../component-library/components/Icons/Icon';
import { strings } from '../../../../locales/i18n';
import { getInternalAccountByAddress } from '../../../util/address';
import Jazzicon from 'react-native-jazzicon';
import Button, {
  ButtonVariants,
} from '../../../component-library/components/Buttons/Button';
import { SRPListItemSelectorsIDs } from '../../../../e2e/selectors/MultiSRP/SRPListItem.selectors';

const SRPListItem = ({ name, keyring, onActionComplete }: SRPListItemProps) => {
  const { styles } = useStyles(styleSheet, {});
  const [showAccounts, setShowAccounts] = useState(false);
  const accountsToBeShown = useMemo(
    () =>
      keyring.accounts.map((accountAddress) =>
        getInternalAccountByAddress(accountAddress),
      ),
    [keyring],
  );

  return (
    <TouchableWithoutFeedback
      onPress={() => onActionComplete(keyring.metadata.id)}
      testID={`${SRPListItemSelectorsIDs.SRP_LIST_ITEM}${keyring.metadata.id}`}
    >
      <View style={styles.srpItem}>
        <View style={styles.srpItemContent}>
          <Text variant={TextVariant.BodyMDMedium}>{name}</Text>
          <Button
            testID={`${SRPListItemSelectorsIDs.SRP_LIST_ITEM_TOGGLE_SHOW}${keyring.metadata.id}`}
            variant={ButtonVariants.Link}
            label={`${strings(
              !showAccounts
                ? 'accounts.show_accounts'
                : 'accounts.hide_accounts',
            )} ${keyring.accounts.length} ${strings('accounts.accounts')}`}
            onPress={() => setShowAccounts(!showAccounts)}
          />
          {showAccounts && (
            <>
              {/* <View style={styles.horizontalLine} /> */}
              <View style={styles.accountsList}>
                <FlatList
                  contentContainerStyle={styles.accountsListContentContainer}
                  data={accountsToBeShown}
                  keyExtractor={(item) => `address-${item?.address}`}
                  renderItem={({ item }) => {
                    if (!item) {
                      return null;
                    }
                    return (
                      <View style={styles.accountItem}>
                        <Jazzicon size={20} seed={parseInt(item.address, 16)} />
                        <Text color={TextColor.Muted}>
                          {item.metadata.name}
                        </Text>
                      </View>
                    );
                  }}
                  removeClippedSubviews={false}
                  // scrollEnabled
                  // nestedScrollEnabled
                  // alwaysBounceVertical
                />
              </View>
            </>
          )}
        </View>
        <Icon name={IconName.ArrowRight} style={styles.srpItemIcon} />
      </View>
    </TouchableWithoutFeedback>
  );
};

export default SRPListItem;
