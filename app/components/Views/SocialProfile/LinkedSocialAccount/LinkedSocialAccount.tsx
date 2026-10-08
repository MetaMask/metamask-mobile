import React, { useCallback, useState } from 'react';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { Box, HeaderStandard } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';

import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import { strings } from '../../../../../locales/i18n';
import { CommonSelectorsIDs } from '../../../../util/Common.testIds';
import { selectProfileAccountGroups } from '../../../../selectors/multichainAccounts/wallets';
import { selectSelectedAccountGroupId } from '../../../../selectors/multichainAccounts/accountTreeController';
import { selectAvatarAccountType } from '../../../../selectors/settings';
import { getAvatarAccountVariant } from '../../../../component-library/components-temp/MultichainAccounts/avatarAccountVariant';
import { LinkedSocialAccountSelectorsIDs } from './LinkedSocialAccount.testIds';
import AccountSelectRow from './AccountSelectRow';

const LinkedSocialAccount = () => {
  const tw = useTailwind();
  const navigation = useNavigation<AppNavigationProp>();

  // Scoped to the profile's SRPs (primary and paired): accounts from other
  // SRPs, imported or hardware wallets, and hidden accounts are not eligible
  // to be linked.
  const accountGroups = useSelector(selectProfileAccountGroups);
  const selectedAccountGroupId = useSelector(selectSelectedAccountGroupId);
  const avatarAccountType = useSelector(selectAvatarAccountType);
  const avatarVariant = getAvatarAccountVariant(avatarAccountType);

  // TODO: lift to the real profile source; selecting currently only moves the
  // radio on this screen. Defaults to the active account group when it is
  // eligible, otherwise nothing is selected.
  const [linkedAccountGroupId, setLinkedAccountGroupId] = useState<
    string | undefined
  >(() =>
    accountGroups.some((group) => group.id === selectedAccountGroupId)
      ? (selectedAccountGroupId ?? undefined)
      : undefined,
  );

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  return (
    <SafeAreaView
      edges={{ bottom: 'additive' }}
      style={tw.style('flex-1 bg-default')}
      testID={LinkedSocialAccountSelectorsIDs.SAFE_AREA}
    >
      <HeaderStandard
        title={strings('app_settings.manage_profile.linked_social_account')}
        onBack={handleBack}
        includesTopInset
        testID={LinkedSocialAccountSelectorsIDs.HEADER}
        backButtonProps={{
          testID: CommonSelectorsIDs.BACK_ARROW_BUTTON,
        }}
      />
      <ScrollView
        contentContainerStyle={tw.style('pb-8')}
        showsVerticalScrollIndicator={false}
        testID={LinkedSocialAccountSelectorsIDs.CONTENT}
      >
        {accountGroups.length > 0 ? (
          <Box
            twClassName="mx-4 mt-2 overflow-hidden rounded-2xl bg-muted"
            accessibilityRole="radiogroup"
          >
            {accountGroups.map((accountGroup, index) => (
              <AccountSelectRow
                key={accountGroup.id}
                accountGroup={accountGroup}
                avatarVariant={avatarVariant}
                isSelected={accountGroup.id === linkedAccountGroupId}
                showDivider={index > 0}
                onSelect={setLinkedAccountGroupId}
              />
            ))}
          </Box>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
};

export default LinkedSocialAccount;
