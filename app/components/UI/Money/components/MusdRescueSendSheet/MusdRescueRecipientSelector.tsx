import React, { useCallback, useMemo, useState } from 'react';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  AvatarAccount,
  AvatarAccountSize,
  AvatarAccountVariant,
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  FontWeight,
  HeaderStandard,
  ListItemSelect,
  SensitiveText,
  SensitiveTextLength,
  Text,
  TextColor,
  TextVariant,
  TextFieldSearch,
} from '@metamask/design-system-react-native';
import { FlashList } from '@shopify/flash-list';
import { useSelector } from 'react-redux';
import { formatWithThreshold } from '../../../../../util/assets';
import I18n, { strings } from '../../../../../../locales/i18n';
import type { AppStackNavigationProp } from '../../../../../core/NavigationService/types';
import { MoneyNavigationParamList } from '../../types/navigation';
import useMusdRescueRecipients from '../../hooks/useMusdRescueRecipients';
import { selectAvatarAccountType } from '../../../../../selectors/settings';
import { getAvatarAccountVariant } from '../../../../../component-library/components-temp/MultichainAccounts/avatarAccountVariant';
import { selectBalanceByAccountGroup } from '../../../../../selectors/assets/balances';
import { selectPrivacyMode } from '../../../../../selectors/preferencesController';
import { MusdRescueRecipientTestIds } from './testIds';
import Routes from '../../../../../constants/navigation/Routes';

/**
 * Account rows can appear under multiple groups; balance lookups are keyed by
 * group id so each row memoizes its own selector instance.
 */
const RecipientRow = ({
  id,
  address,
  name,
  groupName,
  groupId,
  isSelected,
  avatarVariant,
  privacyMode,
  onPress,
}: {
  id: string;
  address: string;
  name: string;
  groupName: string;
  groupId: string;
  isSelected: boolean;
  avatarVariant: AvatarAccountVariant;
  privacyMode: boolean;
  onPress: (id: string) => void;
}) => {
  const selectBalance = useMemo(
    () => selectBalanceByAccountGroup(groupId),
    [groupId],
  );
  const groupBalance = useSelector(selectBalance);
  const totalBalance = groupBalance?.totalBalanceInUserCurrency;
  const userCurrency = groupBalance?.userCurrency;

  const displayBalance = useMemo(() => {
    if (totalBalance == null || !userCurrency) {
      return undefined;
    }
    return formatWithThreshold(totalBalance, 0.01, I18n.locale, {
      style: 'currency',
      currency: userCurrency.toUpperCase(),
    });
  }, [totalBalance, userCurrency]);

  return (
    <ListItemSelect
      isSelected={isSelected}
      showSelectedIcon
      onPress={() => onPress(id)}
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected }}
      testID={`${MusdRescueRecipientTestIds.ACCOUNT_OPTION}-${id}`}
      avatar={
        <AvatarAccount
          address={address}
          size={AvatarAccountSize.Md}
          variant={avatarVariant}
        />
      }
      title={
        <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
          {groupName || name || address}
        </Text>
      }
      description={undefined}
      value={
        totalBalance ? (
          <SensitiveText
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Medium}
            color={TextColor.TextDefault}
            isHidden={privacyMode}
            length={SensitiveTextLength.Long}
          >
            {displayBalance}
          </SensitiveText>
        ) : undefined
      }
    />
  );
};

/**
 * Full-screen account picker for the rescue send. Lists only the eligible
 * same-SRP EVM accounts — there is no arbitrary-address entry, so the rescue
 * withdrawal can never leave the seed phrase.
 */
const MusdRescueRecipientScreen = () => {
  const navigation = useNavigation<AppStackNavigationProp>();
  const insets = useSafeAreaInsets();
  const { params } =
    useRoute<RouteProp<MoneyNavigationParamList, 'MoneyMusdRescueRecipient'>>();
  const { recipients } = useMusdRescueRecipients();

  const avatarAccountType = useSelector(selectAvatarAccountType);
  const privacyMode = useSelector(selectPrivacyMode);
  const avatarVariant = useMemo(
    () => getAvatarAccountVariant(avatarAccountType),
    [avatarAccountType],
  );

  const [searchQuery, setSearchQuery] = useState('');

  const filteredRecipients = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return recipients;
    }
    return recipients.filter(
      (recipient) =>
        recipient.name.toLowerCase().includes(query) ||
        recipient.address.toLowerCase().includes(query),
    );
  }, [recipients, searchQuery]);

  const handleBack = useCallback(() => {
    // Cancel: the review screen keeps whatever selection it had.
    navigation.goBack();
  }, [navigation]);

  const handleSelect = useCallback(
    (recipientId: string) => {
      // Return to the existing review screen instead of pushing a new one.
      navigation.popTo(
        Routes.MONEY.MUSD_RESCUE_SEND,
        { recipientId },
        { merge: true },
      );
    },
    [navigation],
  );

  return (
    <Box
      twClassName="flex-1 bg-default"
      style={{ paddingTop: insets.top }}
      testID={MusdRescueRecipientTestIds.CONTAINER}
    >
      <HeaderStandard
        title={strings('money.musd_rescue_send.recipient_label')}
        onBack={handleBack}
        backButtonProps={{ testID: MusdRescueRecipientTestIds.BACK_BUTTON }}
      />

      <Box twClassName="px-4 pb-3 pt-1">
        <TextFieldSearch
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder={strings('money.musd_rescue_send.recipient_placeholder')}
          onPressClearButton={() => setSearchQuery('')}
          testID={MusdRescueRecipientTestIds.SEARCH_FIELD}
          accessibilityLabel={strings('money.musd_rescue_send.recipient_label')}
        />
      </Box>

      <Box twClassName="flex-1">
        <FlashList
          data={filteredRecipients}
          keyExtractor={(recipient) => recipient.id}
          renderItem={({ item }) => (
            <RecipientRow
              id={item.id}
              address={item.address}
              name={item.name}
              groupName={item.groupName}
              groupId={item.groupId}
              isSelected={item.id === params?.selectedRecipientId}
              avatarVariant={avatarVariant}
              privacyMode={privacyMode}
              onPress={handleSelect}
            />
          )}
          ListEmptyComponent={
            <Box twClassName="items-center px-4 py-8">
              <Text
                variant={TextVariant.BodyMd}
                color={TextColor.TextAlternative}
                testID={MusdRescueRecipientTestIds.EMPTY_STATE}
              >
                {strings('money.musd_rescue_send.recipient_empty')}
              </Text>
            </Box>
          }
          showsVerticalScrollIndicator={false}
        />
      </Box>
    </Box>
  );
};

export default MusdRescueRecipientScreen;
