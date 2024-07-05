import React from 'react';
import type { ModalFooter } from '../../../../../util/notifications/notification-states/types/NotificationModalDetails';
import AnnouncementCtaFooter from './AnnouncementCtaFooter';
import BlockExplorerFooter from './BlockExplorerFooter';

interface Props {
  modalFooter: ModalFooter;
}

export default function ModalFooter({ modalFooter }: Props) {
  if (modalFooter.type === 'ModalFooter-BlockExplorer')
    return <BlockExplorerFooter {...modalFooter} />;

  if (modalFooter.type === 'ModalFooter-AnnouncementCta')
    return <AnnouncementCtaFooter {...modalFooter} />;

  return null;
}
