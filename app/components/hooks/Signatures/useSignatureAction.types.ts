export interface SignatureProps {
  /**
   * A string that represents the selected address
   */
  selectedAddress: string;
  /**
   * Callback triggered when this message signature is rejected
   */
  onCancel: () => void;
  /**
   * Callback triggered when this message signature is approved
   */
  onConfirm: () => void;
  /**
   * Personal message to be displayed to the user
   */
  messageParams:
    | {
        version?: string;
        origin: string;
        data: string;
        from: string;
        metamaskId: string;
      }
    | any;
  /**
   * Object containing current page title and url
   */
  currentPageInformation: {
    analytics?: {
      request_platform: string;
      request_source: string;
    };
    icon?: string;
    title: string;
    url: string;
  };
  /**
   * Hides or shows the expanded signing message
   */
  toggleExpandedMessage?: () => void;
  /**
   * Indicated whether or not the expanded message is shown
   */
  showExpandedMessage?: boolean;
}

export interface UseSignatureActionProps {
  messageParams: any;
  type: string;
}
