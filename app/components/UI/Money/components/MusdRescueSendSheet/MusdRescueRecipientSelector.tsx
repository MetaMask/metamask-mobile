import React, { useCallback, useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet } from 'react-native';
import {
  ActionListItem,
  AvatarAccount,
  AvatarAccountSize,
  AvatarAccountVariant,
  BottomSheetDialog,
  BottomSheetHeader,
  Box,
  Icon,
  IconColor,
  IconName,
  IconSize,
  SelectButton,
  SelectButtonSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { strings } from '../../../../../../locales/i18n';
import { useTheme } from '../../../../../util/theme';
import { selectAvatarAccountType } from '../../../../../selectors/settings';
import { getAvatarAccountVariant } from '../../../../../component-library/components-temp/MultichainAccounts/avatarAccountVariant';
import type { MusdRescueRecipient } from '../../hooks/useMusdRescueRecipients';
import { MusdRescueSendSheetTestIds } from '../MoneyTransferSheet/MoneyTransferSheet.testIds';

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
  },
});

interface MusdRescueRecipientSelectorProps {
  /** Same-SRP EVM accounts the rescue send may target. */
  recipients: MusdRescueRecipient[];
  /** Currently selected recipient address, if any. */
  selectedAddress?: string;
  /** Called with the chosen recipient's address. */
  onSelect: (address: string) => void;
  /** Disables the trigger while a submission is in flight. */
  isDisabled?: boolean;
}

/**
 * Recipient control for the mUSD rescue send.
 *
 * Renders a `SelectButton` that opens a single-select bottom sheet listing only
 * the user's own EVM accounts on the Money Account's SRP — there is no free-text
 * address entry, so the rescue send can never leave the seed phrase.
 */
const MusdRescueRecipientSelector = ({
  recipients,
  selectedAddress,
  onSelect,
  isDisabled = false,
}: MusdRescueRecipientSelectorProps) => {
  const { colors } = useTheme();
  const avatarAccountType = useSelector(selectAvatarAccountType);
  const avatarVariant = useMemo(
    () => getAvatarAccountVariant(avatarAccountType),
    [avatarAccountType],
  );

  const [isOpen, setIsOpen] = useState(false);

  const selectedRecipient = useMemo(
    () =>
      recipients.find(
        (recipient) =>
          recipient.address.toLowerCase() === selectedAddress?.toLowerCase(),
      ),
    [recipients, selectedAddress],
  );

  const handleOpen = useCallback(() => setIsOpen(true), []);
  const handleClose = useCallback(() => setIsOpen(false), []);

  const handleSelect = useCallback(
    (recipient: MusdRescueRecipient) => {
      onSelect(recipient.address);
      setIsOpen(false);
    },
    [onSelect],
  );

  return (
    <>
      <SelectButton
        isFullWidth
        size={SelectButtonSize.Lg}
        placeholder={strings('money.musd_rescue_send.recipient_placeholder')}
        value={selectedRecipient?.address ?? null}
        onPress={handleOpen}
        isDisabled={isDisabled}
        testID={MusdRescueSendSheetTestIds.RECIPIENT_SELECT}
        textProps={{ numberOfLines: 1, ellipsizeMode: 'middle' }}
        startAccessory={
          selectedRecipient ? (
            <AvatarAccount
              address={selectedRecipient.address}
              size={AvatarAccountSize.Sm}
              variant={avatarVariant}
            />
          ) : undefined
        }
      />

      {isOpen ? (
        <Modal
          visible
          transparent
          animationType="none"
          statusBarTranslucent
          onRequestClose={handleClose}
        >
          {/*
            On Android a Modal is its own window, so the root SafeAreaProvider
            reports a stale bottom inset and the last option can hide behind the
            navigation bar. A nested provider measures this window instead.
          */}
          <SafeAreaProvider>
            <GestureHandlerRootView style={styles.modalRoot}>
              <Box twClassName="absolute inset-0">
                <Pressable
                  style={[
                    StyleSheet.absoluteFill,
                    { backgroundColor: colors.overlay.default },
                  ]}
                  onPress={handleClose}
                  accessibilityRole="button"
                  testID={MusdRescueSendSheetTestIds.RECIPIENT_SHEET_BACKDROP}
                />

                <BottomSheetDialog
                  onClose={handleClose}
                  testID={MusdRescueSendSheetTestIds.RECIPIENT_SHEET}
                >
                  <BottomSheetHeader
                    onClose={handleClose}
                    closeButtonProps={{
                      testID: MusdRescueSendSheetTestIds.RECIPIENT_SHEET_CLOSE,
                    }}
                  >
                    {strings('money.musd_rescue_send.recipient_sheet_title')}
                  </BottomSheetHeader>
                  <Box twClassName="pb-4">
                    {recipients.map((recipient) => {
                      const isSelected =
                        recipient.address.toLowerCase() ===
                        selectedAddress?.toLowerCase();

                      return (
                        <ActionListItem
                          key={recipient.id}
                          label={
                            <Text variant={TextVariant.BodyMd}>
                              {recipient.name || recipient.address}
                            </Text>
                          }
                          description={
                            recipient.name ? (
                              <Text
                                variant={TextVariant.BodySm}
                                color={TextColor.TextAlternative}
                                numberOfLines={1}
                                ellipsizeMode="middle"
                              >
                                {recipient.address}
                              </Text>
                            ) : undefined
                          }
                          startAccessory={
                            <Box twClassName="self-center">
                              <AvatarAccount
                                address={recipient.address}
                                size={AvatarAccountSize.Md}
                                variant={avatarVariant}
                              />
                            </Box>
                          }
                          endAccessory={
                            isSelected ? (
                              <Icon
                                name={IconName.Check}
                                size={IconSize.Md}
                                color={IconColor.IconDefault}
                              />
                            ) : undefined
                          }
                          onPress={() => handleSelect(recipient)}
                          accessibilityState={{ selected: isSelected }}
                          testID={`${MusdRescueSendSheetTestIds.RECIPIENT_OPTION}-${recipient.address}`}
                        />
                      );
                    })}
                  </Box>
                </BottomSheetDialog>
              </Box>
            </GestureHandlerRootView>
          </SafeAreaProvider>
        </Modal>
      ) : null}
    </>
  );
};

export default MusdRescueRecipientSelector;
