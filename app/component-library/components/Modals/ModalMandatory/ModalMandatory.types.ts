export interface MandatoryModalParams {
  containerTestId?: string;
  buttonTestId?: string;
  buttonText: string;
  checkboxText: string;
  headerTitle: string;
  onAccept: () => Promise<void> | (() => void) | void;
  footerHelpText: string;
  body:
    | {
        source: 'WebView';
        html?: string;
        uri?: string;
      }
    | {
        source: 'Node';
        component: () => React.ReactNode;
      };
  onRender?: () => void;
  isScrollToEndNeeded?: boolean;
  scrollEndBottomMargin?: number;
}
