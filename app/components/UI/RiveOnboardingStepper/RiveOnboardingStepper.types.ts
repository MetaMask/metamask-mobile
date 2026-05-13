import type { StyleProp, ViewStyle } from 'react-native';
import type { Alignment, Fit } from 'rive-react-native';
import type {
  ButtonVariant,
  IconColor,
  TextColor,
} from '@metamask/design-system-react-native';

export interface OnboardingStep {
  /**
   * Title of the step. Keep to 1 line (~30 characters max).
   */
  title?: string;
  /**
   * Body of the step. Keep to 2 lines (~100 characters max)
   */
  body?: string;
  /** How long the progress bar takes to fill for this step (ms). */
  durationMs: number;
  /**
   * Footer text of the step. Keep to 1 line (~30 characters max).
   */
  footerText?: string;
  /**
   * When provided, shown as the footer button text. When omitted, the footer
   * button is hidden for this step.
   */
  buttonLabel?: string;
  /**
   * Whether the close button is visible on this step. Defaults to `true` when
   * `onClose` is provided. Set to `false` to hide the close button on specific
   * steps (e.g. animation-only final steps).
   */
  showCloseButton?: boolean;
}

export interface RiveConfig {
  /** Result of `require('./path/to/file.riv')`. */
  source: number;
  /** Name of the Rive state machine to drive. */
  stateMachineName: string;
  /** Name of the trigger input that advances to the next animation segment. */
  triggerName: string;
  /** How the animation scales inside its container. Defaults to `Fit.FitWidth`. */
  fit?: Fit;
  /** How the animation anchors inside its container. Defaults to `Alignment.Center`. */
  alignment?: Alignment;
}

export interface RiveOnboardingStepperProps {
  steps: OnboardingStep[];
  riveConfig: RiveConfig;
  /** Renders the full-screen background (gradient, image, solid color, etc.). */
  renderBackground: () => React.ReactNode;
  /** Text color applied to the title and body across all steps. */
  titleTextColor: TextColor;
  /** Text color applied to the body across all steps. */
  bodyTextColor: TextColor;
  /** Footer text color. */
  footerTextColor: TextColor;
  /** Color of the filled progress bar segments (and active indicator). */
  progressBarColor: string;
  /**
   * Style applied to the Rive animation element. Controls position within the
   * absolute-positioned container (e.g. `{ flex: 1, top: 100 }`). Required so
   * each consumer explicitly declares the offset for their animation's geometry.
   */
  riveStyle?: StyleProp<ViewStyle>;
  buttonVariant?: ButtonVariant;
  /** When true, renders the button in inverse style (e.g. white on coloured background). */
  buttonIsInverse?: boolean;
  /**
   * When provided, a close ("X") button is shown next to the title on steps
   * where `showCloseButton` is not `false`.
   */
  onClose?: () => void;
  /**
   * Icon color for the close button. Defaults to the design system default
   * (dark). Pass `IconColor.PrimaryInverse` for light/white on dark backgrounds.
   */
  closeButtonIconColor?: IconColor;
  /** Fires each time the step index changes, including on the initial render. */
  onStepChange?: (stepIndex: number) => void;
  /** Fires when the user taps the footer button on the last step. */
  onComplete: () => void;
  /**
   * When true, `onComplete` is called automatically once the last step's
   * `durationMs` elapses, without requiring a button tap.
   */
  autoCompleteOnLastStep?: boolean;
}
