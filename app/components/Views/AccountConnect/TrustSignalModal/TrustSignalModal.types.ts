export interface TrustSignalModalProps {
  /** The dApp URL/hostname to display. */
  url: string;
  /** Called when the user taps "Connect Anyway". */
  onConnectAnyway: () => void;
  /** Called when the user taps the close button. */
  onClose: () => void;
}
