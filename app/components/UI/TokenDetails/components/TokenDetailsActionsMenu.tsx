import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import {
  ActionListItem,
  BottomSheet,
  BottomSheetHeader,
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextVariant,
  type BottomSheetRef,
} from '@metamask/design-system-react-native';
import { useTheme } from '../../../../util/theme';
import { IconName as ActionIconName } from '../../../../component-library/components/Icons/Icon';
import { strings } from '../../../../../locales/i18n';
import {
  SPRINGBOARD_FADE_OUT,
  SPRINGBOARD_SPRING,
} from '../../../Views/TradeWalletActions/TradeWalletActions.animations';

export const TOKEN_DETAILS_ACTIONS_MENU_BUTTON_TEST_ID =
  'token-details-actions-menu-button';

export const TOKEN_DETAILS_ACTIONS_SHEET_TEST_ID =
  'token-details-actions-bottom-sheet';

/**
 * The anchored dropdown is kept so it can be turned back on without rewriting
 * it. The bottom sheet is the current presentation.
 */
const ACTIONS_MENU_PRESENTATION: 'bottom-sheet' | 'dropdown' = 'bottom-sheet';

const MENU_GAP = 8;
const TRIGGER_SIZE = 48;
const MENU_CLOSED_SCALE = 0.85;
const MENU_CLOSED_OFFSET_Y = 8;

const styles = StyleSheet.create({
  trigger: {
    width: TRIGGER_SIZE,
    paddingLeft: 0,
    paddingRight: 0,
  },
  sheetHost: {
    flex: 1,
  },
  modal: {
    flex: 1,
  },
  menu: {
    position: 'absolute',
    minWidth: 200,
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 8,
    elevation: 8,
    transformOrigin: 'right bottom',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  rowPressed: {
    opacity: 0.6,
  },
  rowDisabled: {
    opacity: 0.4,
  },
  triggerIcon: {
    width: 24,
    height: 24,
  },
  triggerIconLayer: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

const ICON_SWAP_SPRING = {
  mass: 0.6,
  stiffness: 320,
  damping: 22,
};

/** Crossfades the grid into the close icon, rotating around the button center. */
const TriggerIcon = ({ isOpen }: { isOpen: boolean }) => {
  const progress = useSharedValue(isOpen ? 1 : 0);

  useEffect(() => {
    progress.value = withSpring(isOpen ? 1 : 0, ICON_SWAP_SPRING);
  }, [isOpen, progress]);

  const gridStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [1, 0]),
    transform: [
      { rotate: `${interpolate(progress.value, [0, 1], [0, 90])}deg` },
      { scale: interpolate(progress.value, [0, 1], [1, 0.6]) },
    ],
  }));

  const closeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0, 1]),
    transform: [
      { rotate: `${interpolate(progress.value, [0, 1], [-90, 0])}deg` },
      { scale: interpolate(progress.value, [0, 1], [0.6, 1]) },
    ],
  }));

  return (
    <View style={styles.triggerIcon}>
      <Animated.View style={[styles.triggerIconLayer, gridStyle]}>
        <Icon
          name={IconName.Category}
          size={IconSize.Lg}
          color={IconColor.IconDefault}
        />
      </Animated.View>
      <Animated.View style={[styles.triggerIconLayer, closeStyle]}>
        <Icon
          name={IconName.Close}
          size={IconSize.Lg}
          color={IconColor.IconDefault}
        />
      </Animated.View>
    </View>
  );
};

export interface TokenDetailsActionItem {
  key: string;
  iconName: ActionIconName | IconName;
  label: string;
  description?: string;
  onPress: () => void;
  isDisabled?: boolean;
  testID: string;
}

export interface TokenDetailsActionsMenuProps {
  actions: TokenDetailsActionItem[];
  isLoading?: boolean;
  onOpen?: () => void;
}

interface MenuAnchor {
  x: number;
  y: number;
  width: number;
  isMeasured: boolean;
}

const MenuTrigger = ({
  isOpen,
  isLoading,
  onPress,
}: {
  isOpen: boolean;
  isLoading: boolean;
  onPress: () => void;
}) => (
  <Button
    variant={ButtonVariant.Secondary}
    size={ButtonSize.Lg}
    startAccessory={<TriggerIcon isOpen={isOpen} />}
    isDisabled={isLoading}
    onPress={onPress}
    accessibilityLabel={strings('asset_overview.more_button')}
    testID={TOKEN_DETAILS_ACTIONS_MENU_BUTTON_TEST_ID}
    style={styles.trigger}
  />
);

/**
 * Dropdown presentation, kept for a later iteration. Not mounted while
 * `ACTIONS_MENU_PRESENTATION` is `'bottom-sheet'`.
 */
export const TokenDetailsActionsDropdown = ({
  actions,
  isLoading = false,
  onOpen,
}: TokenDetailsActionsMenuProps) => {
  const triggerRef = useRef<View>(null);
  const pendingActionRef = useRef<(() => void) | null>(null);
  const { colors } = useTheme();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const [anchor, setAnchor] = useState<MenuAnchor | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const progress = useSharedValue(0);

  const menuAnimatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [
      {
        translateY: interpolate(
          progress.value,
          [0, 1],
          [MENU_CLOSED_OFFSET_Y, 0],
        ),
      },
      { scale: interpolate(progress.value, [0, 1], [MENU_CLOSED_SCALE, 1]) },
    ],
  }));

  useEffect(() => {
    if (isOpen && anchor?.isMeasured) {
      progress.value = withSpring(1, SPRINGBOARD_SPRING);
    }
  }, [anchor?.isMeasured, isOpen, progress]);

  const openMenu = () => {
    progress.value = 0;
    setIsOpen(true);
    // The menu stays hidden until the trigger has been measured.
    setAnchor({ x: 0, y: 0, width: TRIGGER_SIZE, isMeasured: false });
    triggerRef.current?.measureInWindow((x, y, width) => {
      setAnchor({ x, y, width, isMeasured: true });
    });
    onOpen?.();
  };

  const finishClose = useCallback(() => {
    setAnchor(null);
    const pendingAction = pendingActionRef.current;
    pendingActionRef.current = null;
    pendingAction?.();
  }, []);

  const closeMenu = (thenRun?: () => void) => {
    if (!isOpen) return;
    pendingActionRef.current = thenRun ?? null;
    setIsOpen(false);
    progress.value = withTiming(0, SPRINGBOARD_FADE_OUT, (finished) => {
      if (finished) {
        scheduleOnRN(finishClose);
      }
    });
  };

  return (
    <>
      <View ref={triggerRef} collapsable={false}>
        <MenuTrigger isOpen={isOpen} isLoading={isLoading} onPress={openMenu} />
      </View>
      <Modal
        visible={anchor !== null}
        transparent
        animationType="none"
        onRequestClose={() => closeMenu()}
      >
        <View style={styles.modal}>
          <Pressable
            accessibilityLabel={strings('asset_overview.more_button')}
            style={StyleSheet.absoluteFill}
            onPress={() => closeMenu()}
          />
          {anchor && (
            <Animated.View
              pointerEvents={isOpen ? 'auto' : 'none'}
              style={[
                styles.menu,
                {
                  backgroundColor: colors.background.default,
                  borderColor: colors.border.muted,
                  right: windowWidth - (anchor.x + anchor.width),
                  bottom: windowHeight - anchor.y + MENU_GAP,
                },
                menuAnimatedStyle,
              ]}
            >
              {actions.map((action) => (
                <Pressable
                  key={action.key}
                  testID={action.testID}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: action.isDisabled }}
                  disabled={action.isDisabled}
                  onPress={() => closeMenu(action.onPress)}
                  style={({ pressed }) => [
                    styles.row,
                    action.isDisabled && styles.rowDisabled,
                    pressed && !action.isDisabled && styles.rowPressed,
                  ]}
                >
                  <Icon
                    name={action.iconName as IconName}
                    size={IconSize.Md}
                    color={IconColor.IconDefault}
                  />
                  <Text variant={TextVariant.BodyMd} twClassName="shrink">
                    {action.label}
                  </Text>
                </Pressable>
              ))}
            </Animated.View>
          )}
        </View>
      </Modal>
    </>
  );
};

/**
 * Icon button that opens the token actions (Cash Buy, Receive, View on block
 * explorer, and so on) in a bottom sheet, instead of a row under the chart.
 */
const TokenDetailsActionsBottomSheet = ({
  actions,
  isLoading = false,
  onOpen,
}: TokenDetailsActionsMenuProps) => {
  const sheetRef = useRef<BottomSheetRef>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      sheetRef.current?.onOpenBottomSheet();
    }
  }, [isOpen]);

  const openSheet = () => {
    setIsOpen(true);
    onOpen?.();
  };

  const handleSheetClosed = useCallback(() => {
    setIsOpen(false);
  }, []);

  const closeSheet = (thenRun?: () => void) => {
    if (!sheetRef.current) {
      setIsOpen(false);
      thenRun?.();
      return;
    }
    sheetRef.current.onCloseBottomSheet(thenRun);
  };

  return (
    <>
      <MenuTrigger isOpen={isOpen} isLoading={isLoading} onPress={openSheet} />
      {isOpen ? (
        <Modal
          visible
          transparent
          animationType="none"
          statusBarTranslucent
          onRequestClose={() => closeSheet()}
        >
          <GestureHandlerRootView style={styles.sheetHost}>
            <BottomSheet
              ref={sheetRef}
              testID={TOKEN_DETAILS_ACTIONS_SHEET_TEST_ID}
              isInteractable
              onClose={handleSheetClosed}
            >
              <BottomSheetHeader onClose={() => closeSheet()}>
                {strings('asset_overview.more_button')}
              </BottomSheetHeader>
              <Box twClassName="pb-4">
                {actions.map((action) => (
                  <ActionListItem
                    key={action.key}
                    label={action.label}
                    description={action.description}
                    iconName={action.iconName as IconName}
                    isDisabled={action.isDisabled}
                    testID={action.testID}
                    onPress={() => closeSheet(action.onPress)}
                  />
                ))}
              </Box>
            </BottomSheet>
          </GestureHandlerRootView>
        </Modal>
      ) : null}
    </>
  );
};

const TokenDetailsActionsMenu = (props: TokenDetailsActionsMenuProps) => {
  if (ACTIONS_MENU_PRESENTATION === 'dropdown') {
    return <TokenDetailsActionsDropdown {...props} />;
  }

  return <TokenDetailsActionsBottomSheet {...props} />;
};

export default TokenDetailsActionsMenu;
