import React, { useRef, useState } from 'react';
import { Image, Linking } from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import {
  BannerAlert,
  BannerAlertSeverity,
  BottomSheet,
  BottomSheetHeader,
  Box,
  Button,
  ButtonIcon,
  ButtonSize,
  ButtonVariant,
  FontWeight,
  HelpText,
  HelpTextSeverity,
  IconColor,
  IconName,
  Text,
  TextColor,
  TextVariant,
  type BottomSheetRef,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../locales/i18n';
import { useTheme } from '../../../../../util/theme';
import { MfaFlowSelectorsIDs } from '../../Mfa.testIds';
import StepLayout, { type StepProps } from './StepLayout';

/**
 * Shows the setup key in groups of four, as authenticator apps print it.
 *
 * @param secret - The base32 secret.
 * @returns The grouped key.
 */
const formatSetupKey = (secret: string) =>
  secret.match(/.{1,4}/g)?.join(' ') ?? secret;

/**
 * Adds MetaMask to the user's authenticator app: opens the app on this phone,
 * or copies the setup key, or shows the QR code for another device (a phone
 * cannot scan its own screen). The secret and QR code are never stored.
 *
 * @param props - The step's props.
 * @param props.step - The setup step, with the secret, QR code and link.
 * @param props.state - The flow state.
 * @param props.onAction - Continues to the code.
 */
const TotpSetupStep = ({ step, state, onAction }: StepProps<'totpSetup'>) => {
  const tw = useTailwind();
  const { brandColors } = useTheme();
  const sheetRef = useRef<BottomSheetRef>(null);
  const [isQrOpen, setIsQrOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [noApp, setNoApp] = useState(false);

  const openApp = () => {
    setNoApp(false);
    Linking.openURL(step.setupUri).catch(() => setNoApp(true));
  };

  const copyKey = () => {
    Clipboard.setString(step.secret);
    setIsCopied(true);
  };

  return (
    <>
      <StepLayout
        title={strings('mfa.totp_setup.title')}
        description={strings('mfa.totp_setup.description')}
        error={state.error}
        footer={
          <Button
            variant={ButtonVariant.Primary}
            size={ButtonSize.Lg}
            isFullWidth
            isLoading={state.busy}
            onPress={() => onAction({ type: 'continue' })}
            testID={MfaFlowSelectorsIDs.PRIMARY_BUTTON}
          >
            {strings('mfa.totp_setup.continue')}
          </Button>
        }
      >
        <Box twClassName="gap-4 pt-2">
          {step.isRestart ? (
            <BannerAlert
              severity={BannerAlertSeverity.Warning}
              description={strings('mfa.totp_setup.restarted')}
            />
          ) : null}
          <Button
            variant={ButtonVariant.Secondary}
            size={ButtonSize.Lg}
            isFullWidth
            startIconName={IconName.Export}
            onPress={openApp}
            testID={MfaFlowSelectorsIDs.TOTP_OPEN_APP}
          >
            {strings('mfa.totp_setup.open_app')}
          </Button>
          {noApp ? (
            <HelpText severity={HelpTextSeverity.Danger}>
              {strings('mfa.totp_setup.no_app')}
            </HelpText>
          ) : null}
          <Box twClassName="flex-row items-center gap-3 rounded-2xl bg-muted p-4">
            <Box twClassName="flex-1 gap-1">
              <Text
                variant={TextVariant.BodySm}
                color={TextColor.TextAlternative}
              >
                {strings('mfa.totp_setup.setup_key')}
              </Text>
              <Text
                variant={TextVariant.BodyMd}
                fontWeight={FontWeight.Medium}
                testID={MfaFlowSelectorsIDs.TOTP_SETUP_KEY}
              >
                {formatSetupKey(step.secret)}
              </Text>
            </Box>
            <ButtonIcon
              iconName={isCopied ? IconName.CopySuccess : IconName.Copy}
              iconProps={
                isCopied ? { color: IconColor.SuccessDefault } : undefined
              }
              onPress={copyKey}
              accessibilityLabel={strings('mfa.totp_setup.copy')}
              testID={MfaFlowSelectorsIDs.TOTP_COPY_KEY}
            />
          </Box>
          <Button
            variant={ButtonVariant.Tertiary}
            startIconName={IconName.QrCode}
            onPress={() => setIsQrOpen(true)}
            testID={MfaFlowSelectorsIDs.TOTP_OTHER_DEVICE}
          >
            {strings('mfa.totp_setup.other_device')}
          </Button>
        </Box>
      </StepLayout>
      {isQrOpen ? (
        <BottomSheet
          ref={sheetRef}
          onClose={() => setIsQrOpen(false)}
          testID={MfaFlowSelectorsIDs.TOTP_QR_SHEET}
        >
          <BottomSheetHeader
            onClose={() => sheetRef.current?.onCloseBottomSheet()}
          >
            {strings('mfa.totp_setup.qr_title')}
          </BottomSheetHeader>
          <Box twClassName="items-center gap-4 px-4 pb-6">
            <Text
              variant={TextVariant.BodyMd}
              color={TextColor.TextAlternative}
            >
              {strings('mfa.totp_setup.qr_description')}
            </Text>
            {/* The QR code needs a light background to scan in dark mode. */}
            <Box
              twClassName="rounded-2xl p-3"
              style={tw.style({ backgroundColor: brandColors.white })}
            >
              <Image
                source={{ uri: step.qrCode }}
                style={tw.style('w-50 h-50')}
                testID={MfaFlowSelectorsIDs.TOTP_QR_IMAGE}
              />
            </Box>
            <Button
              variant={ButtonVariant.Primary}
              size={ButtonSize.Lg}
              isFullWidth
              onPress={() =>
                sheetRef.current?.onCloseBottomSheet(() =>
                  onAction({ type: 'continue' }),
                )
              }
              testID={MfaFlowSelectorsIDs.TOTP_QR_CONTINUE}
            >
              {strings('mfa.totp_setup.continue')}
            </Button>
          </Box>
        </BottomSheet>
      ) : null}
    </>
  );
};

export default TotpSetupStep;
