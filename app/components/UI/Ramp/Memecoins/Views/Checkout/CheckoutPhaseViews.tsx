import React, { useMemo } from 'react';
import { ActivityIndicator, Image, StyleSheet } from 'react-native';
import {
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTheme } from '../../../../../../util/theme';
import type { Colors } from '../../../../../../util/theme/models';
import { strings } from '../../../../../../../locales/i18n';
import { MEMECOINS_TEST_IDS } from '../../Memecoins.testIds';

/* eslint-disable import-x/no-commonjs, @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports */
const foxImage = require('../../../../../../images/branding/fox.png');
/* eslint-enable import-x/no-commonjs, @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports */

interface PhaseViewProps {
  tokenName: string;
  tokenSymbol: string;
  amountUsd: string;
  imageUrl?: string;
  onDone: () => void;
  onRetry: () => void;
  errorMessage?: string | null;
}

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    foxLarge: {
      width: 112,
      height: 112,
    },
    foxSuccess: {
      width: 120,
      height: 120,
    },
    foxMuted: {
      width: 112,
      height: 112,
      opacity: 0.85,
    },
    tokenBadge: {
      position: 'absolute',
      right: -8,
      bottom: -4,
      width: 44,
      height: 44,
      borderRadius: 22,
      borderWidth: 3,
      borderColor: colors.background.default,
    },
    tokenBadgeSuccess: {
      position: 'absolute',
      left: -10,
      top: 8,
      width: 40,
      height: 40,
      borderRadius: 20,
    },
  });

export function CheckoutProcessingView({
  tokenName,
  tokenSymbol,
  amountUsd,
  imageUrl,
}: Pick<
  PhaseViewProps,
  'tokenName' | 'tokenSymbol' | 'amountUsd' | 'imageUrl'
>) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <Box
      twClassName="flex-1 items-center justify-center px-8 gap-5"
      testID={MEMECOINS_TEST_IDS.CHECKOUT_PROCESSING}
    >
      <Box twClassName="relative items-center justify-center">
        <Image source={foxImage} style={styles.foxLarge} resizeMode="contain" />
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.tokenBadge} />
        ) : null}
      </Box>
      <ActivityIndicator size="large" />
      <Text
        variant={TextVariant.HeadingMd}
        fontWeight={FontWeight.Bold}
        twClassName="text-center"
      >
        {strings('memecoins.processing_title', {
          token: tokenSymbol || tokenName,
        })}
      </Text>
      <Text
        variant={TextVariant.BodyMd}
        color={TextColor.TextAlternative}
        twClassName="text-center"
      >
        {strings('memecoins.processing_body', {
          amount: amountUsd,
        })}
      </Text>
    </Box>
  );
}

export function CheckoutSuccessView({
  tokenName,
  tokenSymbol,
  amountUsd,
  imageUrl,
  onDone,
}: Omit<PhaseViewProps, 'onRetry' | 'errorMessage'>) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <Box
      twClassName="flex-1 items-center justify-center px-8 gap-5"
      testID={MEMECOINS_TEST_IDS.CHECKOUT_SUCCESS}
    >
      <Box twClassName="relative items-center justify-center">
        <Image
          source={foxImage}
          style={styles.foxSuccess}
          resizeMode="contain"
        />
        <Box twClassName="absolute -right-1 -bottom-1 w-10 h-10 rounded-full bg-success-default items-center justify-center">
          <Icon
            name={IconName.Confirmation}
            size={IconSize.Md}
            color={IconColor.PrimaryInverse}
          />
        </Box>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.tokenBadgeSuccess} />
        ) : null}
      </Box>
      <Text
        variant={TextVariant.HeadingMd}
        fontWeight={FontWeight.Bold}
        twClassName="text-center"
      >
        {strings('memecoins.success_heading')}
      </Text>
      <Text
        variant={TextVariant.BodyMd}
        color={TextColor.TextAlternative}
        twClassName="text-center"
      >
        {strings('memecoins.success_body', {
          amount: amountUsd,
          token: tokenSymbol || tokenName,
        })}
      </Text>
      <Button
        variant={ButtonVariant.Primary}
        size={ButtonSize.Lg}
        isFullWidth
        onPress={onDone}
      >
        {strings('memecoins.done')}
      </Button>
    </Box>
  );
}

export function CheckoutFailureView({
  errorMessage,
  onRetry,
  onDone,
}: Pick<PhaseViewProps, 'errorMessage' | 'onRetry' | 'onDone'>) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <Box
      twClassName="flex-1 items-center justify-center px-8 gap-5"
      testID={MEMECOINS_TEST_IDS.CHECKOUT_ERROR}
    >
      <Box twClassName="relative items-center justify-center">
        <Image source={foxImage} style={styles.foxMuted} resizeMode="contain" />
        <Box twClassName="absolute -right-1 -bottom-1 w-10 h-10 rounded-full bg-error-default items-center justify-center">
          <Icon
            name={IconName.Close}
            size={IconSize.Md}
            color={IconColor.PrimaryInverse}
          />
        </Box>
      </Box>
      <Text
        variant={TextVariant.HeadingMd}
        fontWeight={FontWeight.Bold}
        twClassName="text-center"
      >
        {strings('memecoins.checkout_error_title')}
      </Text>
      <Text
        variant={TextVariant.BodyMd}
        color={TextColor.TextAlternative}
        twClassName="text-center"
      >
        {errorMessage || strings('memecoins.checkout_error_body')}
      </Text>
      <Box twClassName="w-full gap-3">
        <Button
          variant={ButtonVariant.Primary}
          size={ButtonSize.Lg}
          isFullWidth
          onPress={onRetry}
        >
          {strings('memecoins.try_again')}
        </Button>
        <Button
          variant={ButtonVariant.Secondary}
          size={ButtonSize.Lg}
          isFullWidth
          onPress={onDone}
        >
          {strings('memecoins.done')}
        </Button>
      </Box>
    </Box>
  );
}
