import React, { useMemo, useState } from 'react';
import { TouchableWithoutFeedback } from 'react-native';
import { FlatList } from 'react-native-gesture-handler';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  BoxFlexDirection,
  BoxAlignItems,
  BoxJustifyContent,
} from '@metamask/design-system-react-native';
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
import Button, {
  ButtonVariants,
} from '../../../component-library/components/Buttons/Button';
import { SRPListItemSelectorsIDs } from './SRPListItem.testIds';
import Avatar, {
  AvatarSize,
  AvatarVariant,
} from '../../../component-library/components/Avatars/Avatar';
import { useSelector } from 'react-redux';
import { MetaMetricsEvents } from '../../../core/Analytics/MetaMetrics.events';
import { useAnalytics } from '../../hooks/useAnalytics/useAnalytics';
import { selectAvatarAccountType } from '../../../selectors/settings';
import { selectAccountGroupsByKeyringId } from '../../../selectors/multisrp';
import { RootState } from '../../../reducers';
import { selectIconSeedAddressByAccountGroupId } from '../../../selectors/multichainAccounts/accounts';
import { AccountGroupWithInternalAccounts } from '../../../selectors/multichainAccounts/accounts.type';

const AccountGroupItem = ({
  accountGroup,
  accountAvatarType,
}: {
  accountGroup: AccountGroupWithInternalAccounts;
  accountAvatarType: ReturnType<typeof selectAvatarAccountType>;
}) => {
  const selectSeedAddress = useMemo(
    () => selectIconSeedAddressByAccountGroupId(accountGroup.id),
    [accountGroup.id],
  );
  const seedAddress = useSelector(selectSeedAddress);

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      twClassName="gap-2 mb-1"
    >
      <Avatar
        variant={AvatarVariant.Account}
        type={accountAvatarType}
        accountAddress={seedAddress}
        size={AvatarSize.Sm}
      />
      <Text variant={TextVariant.BodySM} color={TextColor.Default}>
        {accountGroup.metadata.name}
      </Text>
    </Box>
  );
};

const SRPListItem = ({
  name,
  keyring,
  onActionComplete,
  testID,
  showArrowName = '',
}: SRPListItemProps) => {
  const tw = useTailwind();
  const { trackEvent, createEventBuilder } = useAnalytics();
  const [showAccounts, setShowAccounts] = useState(false);
  const accountAvatarType = useSelector(selectAvatarAccountType);

  const accountGroups = useSelector((state: RootState) =>
    selectAccountGroupsByKeyringId(state, keyring.metadata.id),
  );

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
      <Box
        flexDirection={BoxFlexDirection.Row}
        justifyContent={BoxJustifyContent.Between}
        alignItems={BoxAlignItems.Center}
        twClassName="w-full p-4 rounded-lg bg-alternative"
      >
        <Box
          flexDirection={BoxFlexDirection.Column}
          justifyContent={BoxJustifyContent.Center}
          alignItems={BoxAlignItems.FlexStart}
          twClassName="shrink w-full"
        >
          <Box>
            <Box
              flexDirection={BoxFlexDirection.Row}
              justifyContent={BoxJustifyContent.Between}
              alignItems={BoxAlignItems.Center}
              twClassName="w-full"
            >
              <Text
                variant={TextVariant.BodyMDMedium}
                color={TextColor.Default}
              >
                {name}
              </Text>
              <Box
                flexDirection={BoxFlexDirection.Row}
                alignItems={BoxAlignItems.Center}
                twClassName="gap-1"
              >
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
                  style={tw.style('flex-col justify-center')}
                  color={IconColor.Alternative}
                />
              </Box>
            </Box>

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
                  )} ${accountGroups.length} ${strings('accounts.accounts')}`}
                </Text>
              }
            />
          </Box>
          {showAccounts && (
            <>
              <Box twClassName="h-px w-full border-b border-muted my-4" />
              <Box twClassName="w-full shrink max-h-[200px]">
                <FlatList
                  testID={`${SRPListItemSelectorsIDs.SRP_LIST_ITEM_ACCOUNTS_LIST}-${keyring.metadata.id}`}
                  contentContainerStyle={tw.style('py-1')}
                  data={accountGroups}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }) => (
                    <AccountGroupItem
                      accountGroup={item}
                      accountAvatarType={accountAvatarType}
                    />
                  )}
                  removeClippedSubviews={false}
                  scrollEnabled
                  nestedScrollEnabled
                  alwaysBounceVertical
                />
              </Box>
            </>
          )}
        </Box>
      </Box>
    </TouchableWithoutFeedback>
  );
};

export default SRPListItem;
