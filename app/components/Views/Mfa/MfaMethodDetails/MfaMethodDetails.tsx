import React, { useContext, useRef, useState } from 'react';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import {
  StackActions,
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import {
  AvatarIcon,
  BottomSheet,
  BottomSheetHeader,
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
  HeaderStandard,
  IconAlertSeverity,
  IconName,
  Text,
  TextColor,
  TextVariant,
  TitleAlert,
  type BottomSheetRef,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { ENROLLMENT_MAX_SESSION_AGE_MS } from '@metamask/profile-sync-controller/auth';
import { strings } from '../../../../../locales/i18n';
import Routes from '../../../../constants/navigation/Routes';
import type { RootStackParamList } from '../../../../core/NavigationService/types';
import { IconName as ToastIconName } from '../../../../component-library/components/Icons/Icon';
import {
  ToastContext,
  ToastVariants,
} from '../../../../component-library/components/Toast';
import { selectSeedlessOnboardingLoginFlow } from '../../../../selectors/seedlessOnboardingController';
import { useTheme } from '../../../../util/theme';
import { useMfa } from '../../../../util/identity/mfa';
import { mobileMfaControllerAdapter } from '../../../../util/identity/mfa/bindings';
import { MfaFlowError } from '../../../../util/identity/mfa/engine/errors';
import type { MfaMethod } from '../../../../util/identity/mfa/engine/types';
import { removeMfaCredential } from '../../../../util/identity/mfa/removeMfaCredential';
import { getActiveCredentials, getActivePasskeys } from '../credentials';
import {
  getAddedOn,
  getMethodLabel,
  getPasskeyName,
  maskEmail,
} from '../labels';
import { MfaMethodDetailsSelectorsIDs } from '../Mfa.testIds';
import { getMfaUsedFor } from './mfaUsedFor';

export interface MfaMethodDetailsParams {
  method: MfaMethod;
  /** The passkey's position among the active ones; 0 for other methods. */
  index: number;
}

const COPY: Record<
  MfaMethod,
  {
    title: string;
    icon: IconName;
    remove: string;
    removeDescription: string;
    confirm: string;
    lastTitle: string;
    lastDescription: string;
    removed: string;
    operation: string;
  }
> = {
  passkey: {
    title: 'mfa.settings.passkeys',
    icon: IconName.Key,
    remove: 'mfa.settings.remove_passkey',
    removeDescription: 'mfa.settings.remove_passkey_description',
    confirm: 'mfa.settings.remove_passkey',
    lastTitle: 'mfa.settings.last_passkey_title',
    lastDescription: 'mfa.settings.last_passkey_description',
    removed: 'mfa.settings.passkey_removed',
    operation: 'settings.removePasskey',
  },
  email_otp: {
    title: 'mfa.method_email',
    icon: IconName.Mail,
    remove: 'mfa.settings.remove_email',
    removeDescription: 'mfa.settings.remove_email_description',
    confirm: 'mfa.settings.remove',
    lastTitle: 'mfa.settings.last_email_title',
    lastDescription: 'mfa.settings.last_email_description',
    removed: 'mfa.settings.email_removed',
    operation: 'settings.removeEmail',
  },
  totp: {
    title: 'mfa.method_totp',
    icon: IconName.QrCode,
    remove: 'mfa.settings.remove_totp',
    removeDescription: 'mfa.settings.remove_totp_description',
    confirm: 'mfa.settings.remove',
    lastTitle: 'mfa.settings.last_totp_title',
    lastDescription: 'mfa.settings.last_totp_description',
    removed: 'mfa.settings.totp_removed',
    operation: 'settings.removeAuthenticatorApp',
  },
};

/**
 * One method: when it was added, what it protects, and its removal. Removing
 * the last method is refused; otherwise the user confirms, then proves it's
 * them with another method.
 */
const MfaMethodDetails = () => {
  const tw = useTailwind();
  const theme = useTheme();
  const navigation = useNavigation();
  const { method, index } =
    useRoute<RouteProp<RootStackParamList, 'MfaMethodDetails'>>().params;
  const { credentials, verifyOrEnroll } = useMfa();
  const isSocialLogin = useSelector(selectSeedlessOnboardingLoginFlow);
  const { toastRef } = useContext(ToastContext);
  const sheetRef = useRef<BottomSheetRef>(null);
  const [sheet, setSheet] = useState<'confirm' | 'lastMethod'>();
  const [isRemoving, setIsRemoving] = useState(false);

  const active = getActiveCredentials(credentials);
  const credential =
    method === 'passkey'
      ? getActivePasskeys(credentials)[index]
      : active.find(({ type }) => type === method);
  const others = active.filter((other) => other !== credential);
  const copy = COPY[method];

  if (!credential) {
    return null;
  }

  const addedOn = getAddedOn(credential);
  let name = getMethodLabel(method);
  if (credential.type === 'passkey') {
    name = getPasskeyName(credential, index);
  } else if (credential.type === 'email_otp' && credential.email) {
    name = maskEmail(credential.email);
  }

  const showToast = (label: string, isSuccess: boolean) =>
    toastRef?.current?.showToast({
      variant: ToastVariants.Icon,
      labelOptions: [{ label }],
      iconName: isSuccess ? ToastIconName.Confirmation : ToastIconName.Danger,
      iconColor: isSuccess
        ? theme.colors.success.default
        : theme.colors.error.default,
      hasNoTimeout: false,
    });

  const remove = async () => {
    const verifyWith = [...new Set(others.map(({ type }) => type))];
    setIsRemoving(true);
    try {
      const { token } = await verifyOrEnroll({
        methods: verifyWith,
        verifyWith,
        maxSessionAgeMs: ENROLLMENT_MAX_SESSION_AGE_MS,
        reason: { operation: copy.operation },
      });
      await removeMfaCredential(credential, token);
      await mobileMfaControllerAdapter
        .refreshEnrolledCredentials()
        .catch(() => undefined);
      showToast(strings(copy.removed), true);
      navigation.dispatch(StackActions.popTo(Routes.MFA.SETTINGS));
    } catch (error) {
      // The kit has already shown its own errors, or the user backed out.
      if (!(error instanceof MfaFlowError)) {
        showToast(strings('mfa.settings.remove_failed'), false);
      }
    } finally {
      setIsRemoving(false);
    }
  };

  const closeSheet = (then?: () => void) =>
    sheetRef.current?.onCloseBottomSheet(then);

  return (
    <SafeAreaView
      edges={{ bottom: 'additive' }}
      style={tw.style('flex-1 bg-default')}
      testID={MfaMethodDetailsSelectorsIDs.CONTAINER}
    >
      <HeaderStandard
        title={strings(copy.title)}
        onBack={() => navigation.goBack()}
        includesTopInset
      />
      <ScrollView contentContainerStyle={tw.style('p-4 gap-6')}>
        <Box twClassName="flex-row items-center gap-4 p-4 rounded-2xl border border-muted">
          <AvatarIcon iconName={copy.icon} />
          <Box twClassName="flex-1">
            <Text variant={TextVariant.BodyMd}>{name}</Text>
            {addedOn ? (
              <Text
                variant={TextVariant.BodySm}
                color={TextColor.TextAlternative}
              >
                {addedOn}
              </Text>
            ) : null}
          </Box>
        </Box>
        <Box twClassName="gap-4">
          <Text variant={TextVariant.HeadingSm}>
            {strings('mfa.settings.used_for')}
          </Text>
          {getMfaUsedFor(method, { isSocialLogin }).map(
            ({ key, icon, label }) => (
              <Box key={key} twClassName="flex-row items-center gap-4">
                <AvatarIcon iconName={icon} />
                <Text variant={TextVariant.BodyMd}>{strings(label)}</Text>
              </Box>
            ),
          )}
        </Box>
      </ScrollView>
      <Box twClassName="p-4">
        <Button
          variant={ButtonVariant.Secondary}
          size={ButtonSize.Lg}
          isDanger
          isFullWidth
          isLoading={isRemoving}
          onPress={() => setSheet(others.length ? 'confirm' : 'lastMethod')}
          testID={MfaMethodDetailsSelectorsIDs.REMOVE_BUTTON}
        >
          {strings(copy.remove)}
        </Button>
      </Box>
      {sheet ? (
        <BottomSheet
          ref={sheetRef}
          onClose={() => setSheet(undefined)}
          testID={
            sheet === 'confirm'
              ? MfaMethodDetailsSelectorsIDs.CONFIRM_SHEET
              : MfaMethodDetailsSelectorsIDs.LAST_METHOD_SHEET
          }
        >
          <BottomSheetHeader onClose={() => closeSheet()} />
          <Box twClassName="px-4 pb-4 gap-4">
            <TitleAlert
              severity={IconAlertSeverity.Danger}
              title={strings(
                sheet === 'confirm' ? copy.remove : copy.lastTitle,
              )}
            />
            <Text
              variant={TextVariant.BodyMd}
              color={TextColor.TextAlternative}
            >
              {strings(
                sheet === 'confirm'
                  ? copy.removeDescription
                  : copy.lastDescription,
              )}
            </Text>
            {sheet === 'confirm' ? (
              <Button
                variant={ButtonVariant.Primary}
                size={ButtonSize.Lg}
                isDanger
                isFullWidth
                onPress={() => closeSheet(remove)}
                testID={MfaMethodDetailsSelectorsIDs.CONFIRM_BUTTON}
              >
                {strings(copy.confirm)}
              </Button>
            ) : null}
            <Button
              variant={
                sheet === 'confirm'
                  ? ButtonVariant.Secondary
                  : ButtonVariant.Primary
              }
              size={ButtonSize.Lg}
              isFullWidth
              onPress={() => closeSheet()}
            >
              {strings(
                sheet === 'confirm'
                  ? 'navigation.cancel'
                  : 'mfa.settings.got_it',
              )}
            </Button>
          </Box>
        </BottomSheet>
      ) : null}
    </SafeAreaView>
  );
};

export default MfaMethodDetails;
