import React, { useCallback } from 'react';
import { Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  Box,
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../locales/i18n';
import Routes from '../../../../constants/navigation/Routes';
import { ButtonIconSizes } from '../../../../component-library/components/Buttons/ButtonIcon';
import { IconColor as LegacyIconColor } from '../../../../component-library/components/Icons/Icon';
import type { Status } from '../../../../util/activity-adapters';
import { ActivityDetailsStatus } from '../components/ActivityDetailsStatus';
import { ActivityDetailsTransactionId } from '../components/ActivityDetailsTransactionId';
// eslint-disable-next-line import-x/no-restricted-paths -- reuse shared copy button (clipboard + CopySuccess feedback)
import CopyButton from '../../confirmations/components/UI/copy-button/copy-button';
import { formatShortRampOrderId } from './rampDetailsUtils';

/**
 * Truncated order id in a muted pill with copy feedback (Copy → CopySuccess),
 * matching ActivityDetailsTransactionId.
 */
export function RampOrderIdValue({
  orderId,
}: Readonly<{ orderId: string | undefined }>) {
  if (!orderId) {
    return <Text>{strings('transactions.tx_details_not_available')}</Text>;
  }

  return (
    <Box twClassName="flex-row items-center gap-1 rounded-lg bg-muted py-1 pl-3 pr-1">
      <Text variant={TextVariant.BodyMd}>
        {formatShortRampOrderId(orderId)}
      </Text>
      <CopyButton
        copyText={orderId}
        size={ButtonIconSizes.Sm}
        iconColor={LegacyIconColor.Alternative}
        testID="ramp-order-id-copy"
      />
    </Box>
  );
}

/**
 * Transaction hash copy pill, or "Not available" when missing.
 */
export function RampTransactionIdValue({ hash }: Readonly<{ hash?: string }>) {
  if (!hash) {
    return <Text>{strings('transactions.tx_details_not_available')}</Text>;
  }

  return <ActivityDetailsTransactionId hash={hash} />;
}

/**
 * Status label with optional "View on {provider}" link (OrderContent).
 */
export function RampStatusWithProviderLink({
  status,
  providerName,
  providerOrderLink,
}: Readonly<{
  status: Status;
  providerName?: string;
  providerOrderLink?: string;
}>) {
  const navigation = useNavigation();

  const handleProviderLinkPress = useCallback(() => {
    if (!providerOrderLink) {
      return;
    }
    navigation.navigate(Routes.WEBVIEW.MAIN, {
      screen: Routes.WEBVIEW.SIMPLE,
      params: { url: providerOrderLink },
    });
  }, [navigation, providerOrderLink]);

  const showProviderLink = Boolean(providerOrderLink);
  const providerLinkLabel = providerName
    ? strings('ramps_order_details.view_on_provider', {
        provider: providerName,
      })
    : strings('ramps_order_details.view_order');

  return (
    <Box twClassName="items-end gap-1">
      <ActivityDetailsStatus status={status} />
      {showProviderLink ? (
        <Pressable
          onPress={handleProviderLinkPress}
          testID="ramp-provider-order-link"
          accessibilityRole="link"
        >
          <Box twClassName="flex-row items-center gap-1">
            <Text
              variant={TextVariant.BodySm}
              fontWeight={FontWeight.Medium}
              color={TextColor.PrimaryDefault}
            >
              {providerLinkLabel}
            </Text>
            <Icon
              name={IconName.Export}
              size={IconSize.Sm}
              color={IconColor.PrimaryDefault}
            />
          </Box>
        </Pressable>
      ) : null}
    </Box>
  );
}

/**
 * Full-width centered status description (Aggregator Stage / OrderContent copy).
 * Placed below the metadata section (after Transaction ID) with equal spacing
 * to the following SectionDivider (`marginVertical={3}` → 12px).
 */
export function RampStatusDescription({
  description,
}: Readonly<{ description?: string }>) {
  if (!description) {
    return null;
  }

  return (
    <Box twClassName="w-full mt-3" testID="ramp-status-description">
      <Text
        variant={TextVariant.BodySm}
        color={TextColor.TextAlternative}
        twClassName="text-center"
      >
        {description}
      </Text>
    </Box>
  );
}
