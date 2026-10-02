import React, { useCallback, useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import {
  Box,
  Button,
  ButtonVariant,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import {
  PERPS_CONSTANTS,
  type PerpsProviderType,
} from '@metamask/perps-controller';
import { strings } from '../../../../../../locales/i18n';
import Logger from '../../../../../util/Logger';
import { ensureError } from '../../../../../util/errorUtils';
import { PROVIDER_DISPLAY_INFO } from '../PerpsProviderSelector/PerpsProviderSelector.constants';
import { usePerpsNetwork } from '../../hooks/usePerpsNetwork';
import { usePerpsScaleOrderGroups } from '../../hooks/usePerpsScaleOrderGroups';
import { usePerpsStream } from '../../providers/PerpsStreamManager';
import { translatePerpsError } from '../../utils/translatePerpsError';
import { PerpsScaleOrderGroupsSelectorsIDs as IDS } from '../../Perps.testIds';

interface PerpsScaleOrderGroupsProps {
  symbol: string;
  providerId?: PerpsProviderType;
}

/**
 * Show durable Scale receipts with explicit venue review and handle-scoped cancellation.
 *
 * @param props - Displayed market route.
 * @returns Owned group controls, including partial and unresolved placements.
 */
const PerpsScaleOrderGroups = ({
  symbol,
  providerId,
}: PerpsScaleOrderGroupsProps) => {
  const stream = usePerpsStream();
  const network = usePerpsNetwork();
  const refreshOrders = useCallback(() => {
    try {
      stream.retryOrderStreams();
    } catch (error) {
      Logger.error(ensureError(error, 'PerpsScaleOrderGroups.refreshOrders'), {
        tags: {
          feature: PERPS_CONSTANTS.FeatureName,
          component: 'PerpsScaleOrderGroups',
          provider: providerId,
          network,
          action: 'refreshOrders',
        },
        context: {
          name: 'PerpsScaleOrderGroups.refreshOrders',
          data: { providerId, network },
        },
      });
    }
  }, [stream, providerId, network]);
  const activity = usePerpsScaleOrderGroups({ onOrdersChanged: refreshOrders });
  const navigation = useNavigation();
  useEffect(
    () => navigation.addListener('focus', activity.reload),
    [navigation, activity.reload],
  );
  const groups = activity.groups.filter(
    (group) =>
      group.symbol === symbol &&
      (providerId === undefined || group.providerId === providerId),
  );
  if (!groups.length && !activity.error) return null;
  return (
    <Box padding={4} gap={3} testID={IDS.PANEL}>
      <Text variant={TextVariant.HeadingSm}>
        {strings('perps.pro_order_form.scale.groups.title')}
      </Text>
      {activity.error && (
        <Text variant={TextVariant.BodySm} testID={IDS.ERROR}>
          {translatePerpsError(activity.error.message)}
        </Text>
      )}
      {groups.map((group) => (
        <Box
          key={`${group.providerId}:${group.groupId}`}
          gap={2}
          testID={IDS.row(group.providerId, group.groupId)}
        >
          <Text variant={TextVariant.BodyMd}>
            {strings('perps.pro_order_form.scale.groups.market_provider', {
              assetSymbol: group.symbol,
              providerName: PROVIDER_DISPLAY_INFO[group.providerId].name,
            })}
          </Text>
          <Text
            variant={TextVariant.BodySm}
            testID={IDS.state(group.providerId, group.groupId)}
          >
            {strings(`perps.pro_order_form.scale.groups.state.${group.state}`)}
          </Text>
          <Text
            variant={TextVariant.BodySm}
            testID={IDS.accepted(group.providerId, group.groupId)}
          >
            {strings('perps.pro_order_form.scale.groups.accepted', {
              count:
                group.acceptedChildren?.length ??
                PERPS_CONSTANTS.FallbackDataDisplay,
              size: group.acceptedSize ?? PERPS_CONSTANTS.FallbackDataDisplay,
              assetSymbol: group.symbol,
            })}
          </Text>
          <Text
            variant={TextVariant.BodySm}
            testID={IDS.filled(group.providerId, group.groupId)}
          >
            {strings('perps.pro_order_form.scale.groups.filled', {
              size: group.filledSize ?? PERPS_CONSTANTS.FallbackDataDisplay,
              assetSymbol: group.symbol,
            })}
          </Text>
          {group.acceptedChildren?.map((child, index) => (
            <Text
              key={child.orderId ?? `${child.state}:${index}`}
              testID={IDS.child(group.providerId, group.groupId, index)}
              variant={TextVariant.BodySm}
            >
              {strings(
                `perps.pro_order_form.scale.groups.child.${child.state}`,
                { orderId: child.orderId },
              )}
            </Text>
          ))}
          <Button
            variant={ButtonVariant.Secondary}
            testID={IDS.review(group.providerId, group.groupId)}
            isDisabled={activity.isPending}
            onPress={() => activity.review(group)}
          >
            {strings('perps.pro_order_form.scale.groups.review')}
          </Button>
          {group.state !== 'terminal' && (
            <Button
              variant={ButtonVariant.Secondary}
              testID={IDS.cancel(group.providerId, group.groupId)}
              isDisabled={activity.isPending || group.orderId !== group.groupId}
              onPress={() => activity.cancel(group)}
            >
              {strings('perps.pro_order_form.scale.groups.cancel')}
            </Button>
          )}
        </Box>
      ))}
    </Box>
  );
};

export default PerpsScaleOrderGroups;
