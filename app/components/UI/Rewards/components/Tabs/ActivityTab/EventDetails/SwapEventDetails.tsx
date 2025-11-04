import React from 'react';
import { Text, TextVariant } from '@metamask/design-system-react-native';
import { formatSwapDetails } from '../../../../utils/eventDetailsUtils';
import { GenericEventDetails, DetailsRow } from './GenericEventDetails';
import { PointsEventDto } from '../../../../../../../core/Engine/controllers/rewards-controller/types';

export const SwapEventDetails: React.FC<{
  event: Extract<PointsEventDto, { type: 'SWAP' }>;
  accountName?: string;
}> = ({ event, accountName }) => {
  const swapPayload = event.payload; // Type assertion for swap payload

  return (
    swapPayload && (
      <GenericEventDetails
        event={event}
        accountName={accountName}
        extraDetails={
          <DetailsRow label="Asset">
            <Text variant={TextVariant.BodySm}>
              {formatSwapDetails(swapPayload, true)}
            </Text>
          </DetailsRow>
        }
      />
    )
  );
};
