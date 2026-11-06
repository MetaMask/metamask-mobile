import React, { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { ButtonBase } from '@metamask/design-system-react-native';
import { strings } from '../../../../../locales/i18n';
import CapsuleGlass from '../../../../component-library/components-temp/CapsuleGlass';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import { navigateWithDetails } from '../../../../util/navigation/navUtils';
import { createProfileDrawerNavDetails } from '../../../Views/SocialProfile/ProfileDrawer';
import WalletHeaderProfileAvatar, {
  SOCIAL_HEADER_PROFILE_AVATAR_DIAMETER,
} from '../../../Views/Wallet/components/WalletHeader/WalletHeaderProfileAvatar';
import { WalletViewSelectorsIDs } from '../../../Views/Wallet/WalletView.testIds';

/**
 * Profile avatar from the home header. Opens the left profile drawer.
 */
const HubProfileButton = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const openDrawer = useCallback(() => {
    navigateWithDetails(navigation, createProfileDrawerNavDetails({}));
  }, [navigation]);

  return (
    <CapsuleGlass twClassName="h-10 w-10 shrink-0 justify-center">
      <ButtonBase
        onPress={openDrawer}
        testID={WalletViewSelectorsIDs.PROFILE_BUTTON}
        accessibilityRole="button"
        accessibilityLabel={strings(
          'social_leaderboard.my_profile.open_profile',
        )}
        twClassName="h-10 w-10 items-center justify-center rounded-full bg-transparent p-0"
      >
        <WalletHeaderProfileAvatar
          diameter={SOCIAL_HEADER_PROFILE_AVATAR_DIAMETER}
        />
      </ButtonBase>
    </CapsuleGlass>
  );
};

export default HubProfileButton;
