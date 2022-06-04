export interface IToast extends React.FC {
  showWarningToast: (params: ShowWarningToastParams) => void;
}

export interface ShowWarningToastParams {
  /**
   * The text to display in the toast title.
   */
  title: string;
  /**
   * The text to display in the toast body.
   */
  message: string;
  /**
   * The function to call when the action link is pressed.
   */
  action: () => void;
  /**
   * The text to display in the action link.
   */
  actionText: string;
}

export interface WarningToastProps {
  /**
   * The function to call when the action link is pressed.
   */
  action: () => void;
  /**
   * The text to display in the action link.
   */
  actionText: string;
}
