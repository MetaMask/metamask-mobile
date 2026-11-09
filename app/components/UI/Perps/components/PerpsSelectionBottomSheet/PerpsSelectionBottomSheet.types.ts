import type { ReactNode } from 'react';

/**
 * A single selectable option rendered as a card in the selection sheet.
 */
export interface PerpsSelectionOption {
  /**
   * Unique identifier of the option. Passed to `onSave` when selected.
   */
  id: string;
  /**
   * Primary label of the option.
   */
  title: string;
  /**
   * Optional short label rendered next to the title (e.g. "50x max").
   */
  tag?: string;
  /**
   * Optional supporting text rendered below the title. May contain line breaks.
   */
  description?: string;
  /**
   * Optional leading visual, rendered in a 40x40 rounded slot
   * (e.g. an exchange logo).
   */
  startAccessory?: ReactNode;
}

export interface PerpsSelectionBottomSheetProps {
  /**
   * Title shown in the sheet header.
   */
  title: string;
  /**
   * Optional centered description shown above the options.
   */
  description?: string;
  /**
   * Options to choose from.
   */
  options: PerpsSelectionOption[];
  /**
   * Id of the option that is selected when the sheet opens.
   * Changes made in the sheet stay local until the save button is pressed.
   */
  selectedOptionId?: string;
  /**
   * Called with the id of the chosen option when the save button is pressed.
   * The sheet closes afterwards.
   */
  onSave: (optionId: string) => void;
  /**
   * Called once the sheet has been dismissed (close button, swipe, overlay
   * tap or after saving).
   */
  onClose: () => void;
  /**
   * Optional label of the save button. Defaults to "Save".
   */
  saveButtonLabel?: string;
  /**
   * Optional test ID for the sheet container.
   */
  testID?: string;
}

export interface PerpsSelectionOptionCardProps {
  /**
   * Option to render.
   */
  option: PerpsSelectionOption;
  /**
   * Whether the option is currently selected.
   */
  isSelected: boolean;
  /**
   * Called when the card is pressed.
   */
  onPress: () => void;
  /**
   * Optional test ID for the card. The radio button uses `${testID}-radio`.
   */
  testID?: string;
}
