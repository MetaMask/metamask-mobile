import { ReactNode } from 'react';
import { ImageSourcePropType } from 'react-native';

export interface StepperCardCta {
  text: string;
  onPress: () => void;
  disabled?: boolean;
}

export interface StepperCardStep {
  title: string;
  description: string;
  /**
   * When provided, an info icon is rendered inline after the description text.
   * The handler is called when the icon is pressed.
   */
  onDescriptionTooltipPress?: () => void;
  /**
   * Accessibility label for the inline tooltip icon.
   * Defaults to "More information" when not provided.
   */
  descriptionTooltipAccessibilityLabel?: string;
  image: ImageSourcePropType;
  /**
   * Optional custom media rendered in the image slot in place of `image`
   * (e.g. an animated graphic). Falls back to `image` when not provided.
   */
  media?: ReactNode;
  primaryCta: StepperCardCta;
  secondaryCta?: StepperCardCta;
}

export interface StepperCardProps {
  steps: StepperCardStep[];
  /**
   * 0-based index of the currently active step.
   */
  currentStep: number;
  /**
   * Called once when currentStep reaches or exceeds steps.length.
   * StepperCard returns null at that point — no consumer guard needed.
   */
  onComplete?: () => void;
  /**
   * Optional prefix used to derive child testIDs:
   * `${testID}-container`, `${testID}-step-image`,
   * `${testID}-title`, `${testID}-description`, `${testID}-cta-button`
   */
  testID?: string;
}
