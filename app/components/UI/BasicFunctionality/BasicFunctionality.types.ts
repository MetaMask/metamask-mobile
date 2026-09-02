export interface BasicFunctionalityComponentProps {
  handleSwitchToggle: () => void;
  /** Omit top margin when stacked directly under a section title (e.g. Privacy heading). */
  flushTop?: boolean;
  /** When true, the switch cannot be changed (e.g. social-login users). */
  disabled?: boolean;
}
