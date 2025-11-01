// External dependencies.
import { ButtonBaseProps } from '@metamask/design-system-react-native';

/**
 * ButtonSemantic severity variants.
 */
export enum ButtonSemanticSeverity {
  Success = 'Success',
  Danger = 'Danger',
}

/**
 * ButtonSemantic component props.
 */
export interface ButtonSemanticProps extends ButtonBaseProps {
  /**
   * Severity variant of the button.
   */
  severity: ButtonSemanticSeverity;
}

/**
 * Style sheet input parameters.
 */
export type ButtonSemanticStyleSheetVars = Pick<
  ButtonSemanticProps,
  'severity'
>;
