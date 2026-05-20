export interface BasicFunctionalityComponentProps {
  handleSwitchToggle: () => void;
  /** Omit top margin when stacked directly under a section title (e.g. Privacy heading). */
  flushTop?: boolean;
}
