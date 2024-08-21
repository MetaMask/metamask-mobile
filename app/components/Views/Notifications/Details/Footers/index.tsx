import React from 'react';
import type { ModalFooter } from '../../../../../util/notifications/notification-states/types/NotificationModalDetails';
import MobileLinkFooter from './MobileLinkFooter';
import ExternalLinkFooter from './ExternaLinkFooter';
import BlockExplorerFooter from './BlockExplorerFooter';

interface Props {
  modalFooter: ModalFooter;
}

export default function ModalFooter({ modalFooter }: Props) {
  if (modalFooter.type === 'ModalFooter-BlockExplorer')
    return <BlockExplorerFooter {...modalFooter} />;

  if (modalFooter.type === 'ModalFooter-ExternalLink')
    return <ExternalLinkFooter {...modalFooter} />;

  if (modalFooter.type === 'ModalFooter-MobileLink')
    return <MobileLinkFooter {...modalFooter} />;

  return null;
}
