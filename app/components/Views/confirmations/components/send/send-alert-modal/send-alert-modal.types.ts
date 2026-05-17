import type { SendAlert } from '../../../hooks/send/alerts/types';

export interface SendAlertModalProps {
  isOpen: boolean;
  alerts: SendAlert[];
  onAcknowledge: () => void;
  onClose: () => void;
}
