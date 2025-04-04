import React from 'react';
import type { ModalFooter } from '../../../../../util/notifications/notification-states/types/NotificationModalDetails';
import AnnouncementCtaFooter from './AnnouncementCtaFooter';
import BlockExplorerFooter from './BlockExplorerFooter';
import type { INotification } from '../../../../../util/notifications/types';

interface Props {
  modalFooter: ModalFooter;
  notification: INotification;
}

export default function ModalFooter({ modalFooter, notification }: Props) {
  if (modalFooter.type === 'ModalFooter-BlockExplorer')
    return <BlockExplorerFooter {...modalFooter} notification={notification} />;

  if (modalFooter.type === 'ModalFooter-AnnouncementCta')
    return <AnnouncementCtaFooter {...modalFooter} />;

  return null;
}
