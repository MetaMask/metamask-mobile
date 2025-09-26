import React, { useMemo, useState } from 'react';
import { TouchableWithoutFeedback, View } from 'react-native';
import { FlatList } from 'react-native-gesture-handler';
import { useStyles } from '../../hooks/useStyles';
import styleSheet from './SRPListItem.styles';
import { SRPListItemProps } from './SRPListItem.type';
import Text, {
  TextColor,
  TextVariant,
} from '../../../component-library/components/Texts/Text';
import Icon, {
  IconName,
  IconColor,
} from '../../../component-library/components/Icons/Icon';
import { strings } from '../../../../locales/i18n';
import { getInternalAccountByAddress } from '../../../util/address';
import Button, {
  ButtonVariants,
} from '../../../component-library/components/Buttons/Button';
import { SRPListItemSelectorsIDs } from '../../../../e2e/selectors/MultiSRP/SRPListItem.selectors';
import Avatar, {
  AvatarSize,
  AvatarVariant,
} from '../../../component-library/components/Avatars/Avatar';
import { useSelector } from 'react-redux';
import { MetaMetricsEvents } from '../../../core/Analytics/MetaMetrics.events';
import useMetrics from '../../hooks/useMetrics/useMetrics';
import { selectAvatarAccountType } from '../../../selectors/settings';

const SRPListItem = ({
  name,
  keyring,
  onActionComplete,
  testID,
  showArrowName = '',
}: SRPListItemProps) => {
  const { styles } = useStyles(styleSheet, {});
  const { trackEvent, createEventBuilder } = useMetrics();
  const [showAccounts, setShowAccounts] = useState(false);
  const accountsToBeShown = useMemo(
    () =>
      keyring.accounts.map((accountAddress) =>
        getInternalAccountByAddress(accountAddress),
      ),
    [keyring],
  );
  const accountAvatarType = useSelector(selectAvatarAccountType);

  const handleSRPSelection = () => {
    trackEvent(
      createEventBuilder(
        MetaMetricsEvents.SECRET_RECOVERY_PHRASE_PICKER_CLICKED,
      )
        .addProperties({
          button_type: 'srp_select',
        })
        .build(),
    );
    onActionComplete(keyring.metadata.id);
  };

  return (
    <TouchableWithoutFeedback
      onPress={handleSRPSelection}
      testID={
        testID ??
        `${SRPListItemSelectorsIDs.SRP_LIST_ITEM}-${keyring.metadata.id}`
      }
    >
      <View style={styles.srpItem}>
        <View style={styles.srpItemContent}>
          <View>
            <View style={styles.srpItemIconContainer}>
              <Text
                variant={TextVariant.BodyMDMedium}
                color={TextColor.Default}
              >
                {name}
              </Text>
              <View style={styles.srpIconContainer}>
                {Boolean(showArrowName) && (
                  <Text
                    variant={TextVariant.BodyMDMedium}
                    color={TextColor.Alternative}
                  >
                    {showArrowName}
                  </Text>
                )}
                <Icon
                  name={IconName.ArrowRight}
                  style={styles.srpItemIcon}
                  color={IconColor.Alternative}
                />
              </View>
            </View>

            <Button
              testID={`${SRPListItemSelectorsIDs.SRP_LIST_ITEM_TOGGLE_SHOW}-${keyring.metadata.id}`}
              variant={ButtonVariants.Link}
              onPress={() => {
                trackEvent(
                  createEventBuilder(
                    MetaMetricsEvents.SECRET_RECOVERY_PHRASE_PICKER_CLICKED,
                  )
                    .addProperties({
                      button_type: 'details',
                    })
                    .build(),
                );
                setShowAccounts(!showAccounts);
              }}
              label={
                <Text
                  variant={TextVariant.BodySMMedium}
                  color={TextColor.Primary}
                >
                  {`${strings(
                    !showAccounts
                      ? 'accounts.show_accounts'
                      : 'accounts.hide_accounts',
                  )} ${keyring.accounts.length} ${strings(
                    'accounts.accounts',
                  )}`}
                </Text>
              }
            />
          </View>
          {showAccounts && (
            <>
              <View style={styles.horizontalLine} />
              <View style={styles.accountsList}>
                <FlatList
                  testID={`${SRPListItemSelectorsIDs.SRP_LIST_ITEM_ACCOUNTS_LIST}-${keyring.metadata.id}`}
                  contentContainerStyle={styles.accountsListContentContainer}
                  data={accountsToBeShown}
                  keyExtractor={(item) => `address-${item?.address}`}
                  renderItem={({ item }) => {
                    if (!item) {
                      return null;
                    }
                    return (
                      <View style={styles.accountItem}>
                        <Avatar
                          variant={AvatarVariant.Account}
                          type={accountAvatarType}
                          accountAddress={item.address}
                          size={AvatarSize.Sm}
                        />
                        <Text
                          variant={TextVariant.BodySM}
                          color={TextColor.Default}
                        >
                          {item.metadata.name}
                        </Text>
                      </View>
                    );
                  }}
                  removeClippedSubviews={false}
                  scrollEnabled
                  nestedScrollEnabled
                  alwaysBounceVertical
                />
              </View>
            </>
          )}
        </View>
      </View>
    </TouchableWithoutFeedback>
  );
};

export default SRPListItem;
