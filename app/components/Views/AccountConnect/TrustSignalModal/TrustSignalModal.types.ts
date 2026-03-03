export type TrustSignalModalVariant = 'malicious';

export interface TrustSignalModalProps {
  /** Which variant to render — determines colors, copy, and icon. */
  variant: TrustSignalModalVariant;
  /** The dApp URL/hostname to display. */
  url: string;
  /** Called when the user taps "Connect Anyway". */
  onConnectAnyway: () => void;
  /** Called when the user taps the close button. */
  onClose: () => void;
}
