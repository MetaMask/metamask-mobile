import React, { useCallback, useState } from 'react';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import {
  Box,
  FontWeight,
  HeaderStandard,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';

import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import { strings } from '../../../../../locales/i18n';
import { CommonSelectorsIDs } from '../../../../util/Common.testIds';
import { selectProfileWalletSections } from '../../../../selectors/multichainAccounts/wallets';
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
  // to be linked. Each SRP is its own category.
  const walletSections = useSelector(selectProfileWalletSections);
  const selectedAccountGroupId = useSelector(selectSelectedAccountGroupId);
  const avatarAccountType = useSelector(selectAvatarAccountType);
  const avatarVariant = getAvatarAccountVariant(avatarAccountType);

  // TODO: lift to the real profile source; selecting currently only moves the
  // radio on this screen. Defaults to the active account group when it is
  // eligible, otherwise nothing is selected.
  const [linkedAccountGroupId, setLinkedAccountGroupId] = useState<
    string | undefined
  >(() =>
    walletSections.some((wallet) =>
      wallet.groups.some((group) => group.id === selectedAccountGroupId),
    )
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
        title={strings('manage_profile.linked_social_account')}
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
        {walletSections.length > 0 ? (
          <Box
            gap={6}
            paddingHorizontal={4}
            paddingTop={4}
            accessibilityRole="radiogroup"
          >
            {walletSections.map((wallet) => (
              <Box
                key={wallet.id}
                testID={LinkedSocialAccountSelectorsIDs.walletSection(
                  wallet.id,
                )}
              >
                <Text
                  variant={TextVariant.BodyMd}
                  color={TextColor.TextAlternative}
                  fontWeight={FontWeight.Medium}
                  twClassName="mb-2"
                  accessibilityRole="header"
                >
                  {wallet.name}
                </Text>
                <Box twClassName="overflow-hidden rounded-2xl bg-muted">
                  {wallet.groups.map((accountGroup, index) => (
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
              </Box>
            ))}
          </Box>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
};

export default LinkedSocialAccount;
