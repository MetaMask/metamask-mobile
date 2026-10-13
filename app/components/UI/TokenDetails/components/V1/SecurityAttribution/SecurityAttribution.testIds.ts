export const SecurityAttributionSelectors = {
  /**
   * The provider mark. Carries no text, so its colour is the only thing
   * standing between it and an invisible row.
   */
  LOGO: 'security-attribution-logo',
  /**
   * The affordance for the disclaimer sheet. Rendered only when the row is
   * pressable, so an info glyph never sits there promising an action that
   * does nothing.
   */
  INFO_ICON: 'security-attribution-info-icon',
} as const;
