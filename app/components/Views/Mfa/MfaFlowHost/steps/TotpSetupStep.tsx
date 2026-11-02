import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Pressable } from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import QRCode from 'react-native-qrcode-svg';
import {
  BannerAlert,
  BannerAlertSeverity,
  BottomSheet,
  BottomSheetHeader,
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
  FontWeight,
  HeaderStandard,
  Icon,
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

/** How long the copied checkmark stays before the copy icon returns. */
const COPIED_ICON_DURATION_MS = 2000;

/**
 * Adds MetaMask to the user's authenticator app: copies the setup key or shows
 * the QR code from the header for another device (a phone cannot scan its own
 * screen). The secret and QR code are never stored.
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
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const [isQrOpen, setIsQrOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  useEffect(
    () => () => {
      clearTimeout(copiedTimer.current);
    },
    [],
  );

  const copyKey = () => {
    Clipboard.setString(step.secret);
    AccessibilityInfo.announceForAccessibility(
      strings('mfa.totp_setup.copied'),
    );
    setIsCopied(true);
    clearTimeout(copiedTimer.current);
    copiedTimer.current = setTimeout(
      () => setIsCopied(false),
      COPIED_ICON_DURATION_MS,
    );
  };

  return (
    <>
      <HeaderStandard
        onBack={() => onAction({ type: 'cancel' })}
        backButtonProps={{ testID: MfaFlowSelectorsIDs.BACK_BUTTON }}
        endButtonIconProps={[
          {
            iconName: IconName.QrCode,
            onPress: () => setIsQrOpen(true),
            accessibilityLabel: strings('mfa.totp_setup.show_qr'),
            testID: MfaFlowSelectorsIDs.TOTP_SHOW_QR,
          },
        ]}
        includesTopInset
      />
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
          <Pressable
            onPress={copyKey}
            accessibilityRole="button"
            accessibilityLabel={`${strings(
              'mfa.totp_setup.setup_key',
            )}, ${formatSetupKey(step.secret)}`}
            accessibilityHint={strings('mfa.totp_setup.copy')}
            style={({ pressed }) =>
              tw.style(
                'flex-row items-center gap-3 rounded-2xl p-4',
                pressed ? 'bg-muted-pressed' : 'bg-muted',
              )
            }
            testID={MfaFlowSelectorsIDs.TOTP_COPY_KEY}
          >
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
            <Icon
              name={isCopied ? IconName.CopySuccess : IconName.Copy}
              color={
                isCopied ? IconColor.SuccessDefault : IconColor.IconDefault
              }
            />
          </Pressable>
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
            {/* The QR code needs a light background to scan in dark mode. It
                encodes the setup link itself, as the server's image has a
                wide margin built in. */}
            <Box
              twClassName="mb-4 rounded-2xl p-4"
              style={tw.style({ backgroundColor: brandColors.white })}
            >
              <QRCode
                value={step.setupUri}
                size={200}
                quietZone={0}
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
