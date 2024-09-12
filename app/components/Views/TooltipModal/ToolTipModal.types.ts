export interface TooltipModalProps {
  /**
   * Props that are passed in while navigating to screen.
   */
  route: {
    params: { title: string; tooltip: string };
  };
}
