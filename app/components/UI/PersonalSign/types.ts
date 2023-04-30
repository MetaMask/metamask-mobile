import { MessageParams, PageMeta } from '../SignatureRequest/types';

export interface PersonalSignProps {
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
  messageParams: MessageParams;
  /**
   * Object containing current page title and url
   */
  currentPageInformation: PageMeta;
  /**
   * Hides or shows the expanded signing message
   */
  toggleExpandedMessage?: () => void;
  /**
   * Indicated whether or not the expanded message is shown
   */
  showExpandedMessage?: boolean;
}
