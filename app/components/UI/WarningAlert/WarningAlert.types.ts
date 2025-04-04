export interface WarningAlertProps {
  /**
   * Warning description text
   */
  text: string;
  /**
   * useState function to unshow the warning alert
   */
  dismissAlert: () => void;
  /**
   * On press learn more action, usually to redirect to an article
   */
  onPressLearnMore?: () => void;
  /**
   * if there is a precedent alert the warning will be positioned on top
   */
  precedentAlert?: boolean;
}
