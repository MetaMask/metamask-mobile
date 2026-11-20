import React, { useContext, useState } from 'react';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import {
  AvatarIcon,
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
  Icon,
  IconColor,
  IconName,
  IconSize,
  ListItem,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../locales/i18n';
import { IconName as ToastIconName } from '../../../../component-library/components/Icons/Icon';
import {
  ToastContext,
  ToastVariants,
} from '../../../../component-library/components/Toast';
import Routes from '../../../../constants/navigation/Routes';
import { isMfaDevBuild, useMfa } from '../../../../util/identity/mfa';
import { verifyOrEnroll } from '../../../../util/identity/mfa/useMfa';
import type { MfaReason } from '../../../../util/identity/mfa/engine/types';
import Logger from '../../../../util/Logger';
import { useTheme } from '../../../../util/theme';
import { getActivePasskeys } from '../credentials';
import { getAddedOn, getPasskeyName } from '../labels';
import { MfaPasskeysSelectorsIDs } from '../Mfa.testIds';
import { useSelector } from 'react-redux';
import HeaderStandardGlass from '../../../../component-library/components-temp/HeaderStandardGlass';
import { selectGlassHeadersEnabled } from '../../../../selectors/featureFlagController/glassHeaders';
import SocialLinkEmailBottomSheet from '../../shared/SocialLinkEmailBottomSheet';
import { syncRecoveryAfterEnroll } from '../../../../core/MfaRecovery/syncRecoveryAfterEnroll';

const ADD_PASSKEY_REASON: MfaReason = { operation: 'settings.addPasskey' };

/**
 * The profile's passkeys: each opens its details, and the footer adds
 * another.
 */
const MfaPasskeys = () => {
  const isGlassHeader = useSelector(selectGlassHeadersEnabled) === true;
  const tw = useTailwind();
  const theme = useTheme();
  const navigation = useNavigation();
  const { toastRef } = useContext(ToastContext);
  const { credentials, enroll } = useMfa();
  const passkeys = getActivePasskeys(credentials);

  const [socialLinkPrompt, setSocialLinkPrompt] = useState<{
    resolve: (email?: string) => void;
  }>();

  const closeSocialLinkPrompt = (email?: string) => {
    socialLinkPrompt?.resolve(email);
    setSocialLinkPrompt(undefined);
  };

  const addPasskey = async () => {
    try {
      await enroll({ method: 'passkey', reason: ADD_PASSKEY_REASON });
    } catch {
      return;
    }

    try {
      await syncRecoveryAfterEnroll('passkey', {
        verifyMfa: () =>
          verifyOrEnroll({
            methods: ['passkey'],
            verifyWith: ['passkey'],
            reason: ADD_PASSKEY_REASON,
          }).then(() => undefined),
        getSocialLinkEmail: isMfaDevBuild()
          ? () =>
              new Promise<string | undefined>((resolve) =>
                setSocialLinkPrompt({ resolve }),
              )
          : undefined,
      });
    } catch (error) {
      Logger.error(
        error instanceof Error ? error : new Error('Recovery sync failed'),
        { tags: { feature: 'mfa', operation: ADD_PASSKEY_REASON.operation } },
      );
    }

    toastRef?.current?.showToast({
      variant: ToastVariants.Icon,
      labelOptions: [{ label: strings('mfa.settings.passkey_added') }],
      iconName: ToastIconName.Confirmation,
      iconColor: theme.colors.success.default,
      hasNoTimeout: false,
    });
  };

  return (
    <SafeAreaView
      edges={{ bottom: 'additive' }}
      style={tw.style('flex-1 bg-default')}
      testID={MfaPasskeysSelectorsIDs.CONTAINER}
    >
      <HeaderStandardGlass
        isGlass={isGlassHeader}
        isFloating={false}
        title={strings('mfa.settings.passkeys')}
        onBack={() => navigation.goBack()}
        includesTopInset
      />
      <ScrollView>
        {passkeys.map((passkey, index) => (
          <ListItem
            key={index}
            isInteractive
            avatar={<AvatarIcon iconName={IconName.Key} />}
            title={getPasskeyName(passkey, index)}
            description={getAddedOn(passkey)}
            endAccessory={
              <Icon
                name={IconName.ArrowRight}
                size={IconSize.Sm}
                color={IconColor.IconAlternative}
              />
            }
            onPress={() =>
              navigation.navigate(Routes.MFA.METHOD_DETAILS, {
                method: 'passkey',
                index,
              })
            }
            testID={`${MfaPasskeysSelectorsIDs.ROW}-${index}`}
          />
        ))}
      </ScrollView>
      <Box twClassName="p-4">
        <Button
          variant={ButtonVariant.Primary}
          size={ButtonSize.Lg}
          isFullWidth
          onPress={addPasskey}
          testID={MfaPasskeysSelectorsIDs.ADD_BUTTON}
        >
          {strings('mfa.settings.add_passkey')}
        </Button>
      </Box>
      {socialLinkPrompt ? (
        <SocialLinkEmailBottomSheet
          onSubmit={closeSocialLinkPrompt}
          onClose={() => closeSocialLinkPrompt(undefined)}
        />
      ) : null}
    </SafeAreaView>
  );
};

export default MfaPasskeys;
