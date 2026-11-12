import React, { useEffect, useRef } from 'react';
import {
  BottomSheet,
  BottomSheetHeader,
  Box,
  Icon,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
  ActionListItem,
  type BottomSheetRef,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import CollectiblesSheetModal from '../CollectiblesSheetModal/CollectiblesSheetModal';

export type CardAction = 'transfer' | 'redeem' | 'marketplace';

/** Replit's overflow actions; sharing stays in the card header. */
export default function CardActionSheet({
  owned,
  canTransfer = false,
  canOpenPartner = true,
  onSelect,
  onClose,
}: {
  owned: boolean;
  canTransfer?: boolean;
  canOpenPartner?: boolean;
  onSelect: (action: CardAction) => void;
  onClose: () => void;
}) {
  const sheet = useRef<BottomSheetRef>(null);
  const pendingAction = useRef<CardAction | undefined>(undefined);
  useEffect(() => {
    sheet.current?.onOpenBottomSheet();
  }, []);
  const close = () => sheet.current?.onCloseBottomSheet();
  const actions = [
    {
      id: 'transfer',
      icon: IconName.Send,
      label: strings('collectibles_discovery.transfer'),
      description: strings(
        canTransfer
          ? 'collectibles_discovery.transfer_description'
          : 'collectibles_discovery.transfer_unavailable',
      ),
      enabled: owned && canTransfer,
    },
    {
      id: 'redeem',
      icon: IconName.Gift,
      label: strings('collectibles_discovery.redeem'),
      description: strings('collectibles_discovery.redeem_description'),
      enabled: owned && canOpenPartner,
    },
    {
      id: 'marketplace',
      icon: IconName.Tag,
      label: strings('collectibles.card.marketplace'),
      description: strings('collectibles_discovery.marketplace_description'),
      enabled: owned && canOpenPartner,
    },
  ] as const;
  return (
    <CollectiblesSheetModal onRequestClose={close}>
      <BottomSheet
        ref={sheet}
        goBack={() => {
          const action = pendingAction.current;
          onClose();
          if (action) onSelect(action);
        }}
        testID="collectibles-card-actions"
      >
        <BottomSheetHeader onClose={close}>
          {strings('collectibles_discovery.card_actions')}
        </BottomSheetHeader>
        <Box paddingHorizontal={4} paddingBottom={6}>
          {!owned && (
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.TextAlternative}
              twClassName="px-2 pb-2"
            >
              {strings('collectibles_discovery.actions_owned_only')}
            </Text>
          )}
          {actions.map((action) => (
            <ActionListItem
              key={action.id}
              label={action.label}
              description={action.description}
              isDisabled={!action.enabled}
              pressableProps={{
                accessibilityState: { disabled: !action.enabled },
                accessibilityLabel: action.label,
                testID: `collectibles-card-action-${action.id}`,
              }}
              onPress={() => {
                pendingAction.current = action.id;
                close();
              }}
              startAccessory={
                <Box twClassName="h-10 w-10 items-center justify-center rounded-full bg-muted">
                  <Icon name={action.icon} size={IconSize.Md} />
                </Box>
              }
              endAccessory={
                action.enabled ? (
                  <Icon name={IconName.ArrowRight} size={IconSize.Sm} />
                ) : undefined
              }
              twClassName="px-2 py-3"
            />
          ))}
        </Box>
      </BottomSheet>
    </CollectiblesSheetModal>
  );
}
