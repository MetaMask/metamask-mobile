import React from 'react';
import type { ModalField } from '../../../../../util/notifications/notification-states/types/NotificationModalDetails';
import AddressField from './AddressField';
import AnnouncementDescriptionField from './AnnouncementDescriptionField';
import AssetField from './AssetField';
import NetworkFeeField from './NetworkFeeField';
import NetworkField from './NetworkField';
import NFTCollectionField from './NFTCollectionField';
import StakingProviderField from './StakingProviderField';
import SwapsRateField from './SwapsRateField';
import TransactionField from './TransactionField';
import type { INotification } from '../../../../../util/notifications/types';

interface Props {
  modalField: ModalField;
  /**
   * Boolean to determine if the network fee is collapsed or not
   */
  isCollapsed: boolean;
  /**
   * Function to set the network fee collapsed state
   */
  setIsCollapsed: (isCollapsed: boolean) => void;
  /**
   * Notification object
   */
  notification: INotification;
}

export default function ModalField({
  modalField,
  isCollapsed,
  setIsCollapsed,
  notification,
}: Props) {
  if (modalField.type === 'ModalField-AnnouncementDescription')
    return <AnnouncementDescriptionField {...modalField} />;

  if (modalField.type === 'ModalField-Address')
    return <AddressField {...modalField} />;

  if (modalField.type === 'ModalField-Asset')
    return <AssetField {...modalField} />;

  if (modalField.type === 'ModalField-NFTCollectionImage')
    return <NFTCollectionField {...modalField} />;

  if (modalField.type === 'ModalField-Network')
    return <NetworkField {...modalField} />;

  if (modalField.type === 'ModalField-NetworkFee')
    return (
      <NetworkFeeField
        {...modalField}
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
        notification={notification}
      />
    );

  if (modalField.type === 'ModalField-StakingProvider')
    return <StakingProviderField {...modalField} />;

  if (modalField.type === 'ModalField-SwapsRate')
    return <SwapsRateField {...modalField} />;

  if (modalField.type === 'ModalField-Transaction')
    return <TransactionField {...modalField} notification={notification} />;

  return null;
}
