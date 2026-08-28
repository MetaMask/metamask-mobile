import { ReactNode, useCallback } from 'react';
import {
  ButtonIconSize,
  FontWeight,
  IconName,
  TextColor,
} from '@metamask/design-system-react-native';
import useTooltipModal from '../../../hooks/useTooltipModal';

/**
 * The design system row hard-codes horizontal padding, a fixed height and no
 * overflow. The confirmation sections supply their own padding and size to
 * their content, so each row opts back out.
 */
export const KEY_VALUE_ROW_CLASSNAME = 'h-auto px-0 overflow-hidden';

export const KEY_VALUE_ROW_KEY_TEXT_PROPS = {
  color: TextColor.TextDefault,
};

export const KEY_VALUE_ROW_VALUE_TEXT_PROPS = {
  fontWeight: FontWeight.Regular,
};

/**
 * Builds the `keyEndButtonIconProps` for a row whose label carries a tooltip.
 *
 * The design system row exposes the button rather than a tooltip, so the
 * wiring lives here to keep it identical across the confirmation screens.
 */
export const useKeyValueRowTooltip = () => {
  const { openTooltipModal } = useTooltipModal();

  return useCallback(
    (title: string, content: string | ReactNode) => ({
      size: ButtonIconSize.Xs,
      iconName: IconName.Question,
      accessibilityRole: 'button' as const,
      accessibilityLabel: `${title} tooltip`,
      onPress: () => openTooltipModal(title, content),
    }),
    [openTooltipModal],
  );
};
