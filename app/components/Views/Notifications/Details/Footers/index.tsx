import React from 'react';
import type { ModalFooter } from '../../../../../util/notifications/notification-states/types/NotificationModalDetails';
import MobileLinkFooter from './MobileLinkFooter';
import ExternalLinkFooter from './ExternaLinkFooter';
import BlockExplorerFooter from './BlockExplorerFooter';
import type { Notification } from '../../../../../util/notifications/types';

interface Props {
  modalFooter: ModalFooter;
  notification: Notification;
}

export default function ModalFooter({ modalFooter, notification }: Props) {
  if (modalFooter.type === 'ModalFooter-BlockExplorer')
    return <BlockExplorerFooter {...modalFooter} notification={notification} />;

  if (modalFooter.type === 'ModalFooter-ExternalLink')
    return <ExternalLinkFooter {...modalFooter} />;

  if (modalFooter.type === 'ModalFooter-MobileLink')
    return <MobileLinkFooter {...modalFooter} />;

  return null;
}
