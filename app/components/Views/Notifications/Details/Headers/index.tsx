import React from 'react';
import type { ModalHeader } from '../../../../../util/notifications/notification-states/types/NotificationModalDetails';
import AnnouncementImageHeader from './AnnouncementImageHeader';
import NFTImageHeader from './NFTImageHeader';

interface Props {
  modalHeader: ModalHeader;
}

export default function ModalHeader({ modalHeader }: Props) {
  if (modalHeader.type === 'ModalHeader-AnnouncementImage')
    return <AnnouncementImageHeader {...modalHeader} />;

  if (modalHeader.type === 'ModalHeader-NFTImage')
    return <NFTImageHeader {...modalHeader} />;

  return null;
}
