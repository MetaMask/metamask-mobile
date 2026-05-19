import React, { memo } from 'react';
import { ActivityIndicator } from 'react-native';
import {
  Box,
  BoxAlignItems,
  BoxBackgroundColor,
  BoxFlexDirection,
  BoxJustifyContent,
  FontWeight,
  Icon,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTheme } from '../../../../../util/theme';
import type { QrScanRequest } from '@metamask/eth-qr-keyring';
import AnimatedQRCode from '../../../QRHardware/AnimatedQRCode';
import {
  HardwareWalletsSwapsStep,
  HardwareWalletsSwapsStepStatus,
} from './HardwareWalletsSwaps.state';
import { HardwareWalletsSwapsSelectorsIDs } from './HardwareWalletsSwaps.testIds';
import { getStepIcon, getStepTitle, getStepDescription } from './step-helpers';
import { StepConnectorLine } from './StepConnectorLine';

const INLINE_QR_CODE_SIZE = 240;

interface StepRowProps {
  step: HardwareWalletsSwapsStep;
  index: number;
  isLast: boolean;
  amount?: string;
  tokenSymbol?: string;
  isQrWallet?: boolean;
  pendingScanRequest?: QrScanRequest;
}

export const StepRow = memo(
  ({
    step,
    index,
    isLast,
    amount,
    tokenSymbol,
    isQrWallet,
    pendingScanRequest,
  }: StepRowProps) => {
    const icon = getStepIcon(step, index);
    const titleColor =
      step.status === HardwareWalletsSwapsStepStatus.Rejected
        ? TextColor.ErrorDefault
        : TextColor.TextDefault;
    const { colors } = useTheme();

    const showQrCode =
      step.status === HardwareWalletsSwapsStepStatus.Signing &&
      isQrWallet &&
      pendingScanRequest?.request;

    const description = getStepDescription(step);

    return (
      <Box
        testID={`${HardwareWalletsSwapsSelectorsIDs.STEP_ROW}-${index}`}
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Start}
        twClassName="w-full"
      >
        <Box
          alignItems={BoxAlignItems.Center}
          flexDirection={BoxFlexDirection.Column}
          twClassName="w-8 self-stretch"
        >
          <Box
            alignItems={BoxAlignItems.Center}
            justifyContent={BoxJustifyContent.Center}
            backgroundColor={BoxBackgroundColor.BackgroundMuted}
            twClassName="h-8 w-8 rounded-full"
          >
            {icon.isSigning ? (
              <ActivityIndicator
                testID={`${HardwareWalletsSwapsSelectorsIDs.SIGNING_SPINNER}-${index}`}
                size="small"
                color={colors.primary.default}
              />
            ) : icon.name ? (
              <Icon name={icon.name} color={icon.color} size={IconSize.Md} />
            ) : (
              <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
                {icon.label}
              </Text>
            )}
          </Box>
          {!isLast ? (
            <StepConnectorLine
              testID={`${HardwareWalletsSwapsSelectorsIDs.STEP_CONNECTOR}-${index}`}
            />
          ) : null}
        </Box>
        <Box flex={1} gap={4} marginLeft={3} twClassName="pt-1.5">
          <Text
            variant={TextVariant.BodyMd}
            color={titleColor}
            fontWeight={FontWeight.Medium}
          >
            {getStepTitle(step, { amount, tokenSymbol })}
          </Text>
          {description ? (
            <Text
              variant={TextVariant.BodyMd}
              color={TextColor.TextAlternative}
            >
              {description}
            </Text>
          ) : null}
          {showQrCode && pendingScanRequest.request ? (
            <Box
              testID={`${HardwareWalletsSwapsSelectorsIDs.INLINE_QR_CODE}-${index}`}
              alignItems={BoxAlignItems.Start}
            >
              <AnimatedQRCode
                cbor={pendingScanRequest.request.payload.cbor}
                type={pendingScanRequest.request.payload.type}
                shouldPause={false}
                size={INLINE_QR_CODE_SIZE}
              />
            </Box>
          ) : null}
        </Box>
      </Box>
    );
  },
);
