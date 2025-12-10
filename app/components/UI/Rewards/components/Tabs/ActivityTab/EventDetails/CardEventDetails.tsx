import React from 'react';
import { GenericEventDetails, DetailsRow } from './GenericEventDetails';
import {
  Text,
  TextVariant,
  TextColor,
} from '@metamask/design-system-react-native';
import {
  PointsEventDto,
  CardEventPayload,
} from '../../../../../../../core/Engine/controllers/rewards-controller/types';
import { formatAssetAmount } from '../../../../utils/eventDetailsUtils';

interface CardEventDetailsProps {
  event: PointsEventDto & { type: 'CARD'; payload: CardEventPayload | null };
  accountName?: string;
}

export const CardEventDetails: React.FC<CardEventDetailsProps> = ({
  event,
  accountName,
}) => {
  const payload = event.payload;
  const asset = payload?.asset;

  const extraDetails =
    asset?.amount && asset?.decimals !== undefined && asset?.symbol ? (
      <DetailsRow label="Amount">
        <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
          {formatAssetAmount(asset.amount, asset.decimals)} {asset.symbol}
        </Text>
      </DetailsRow>
    ) : null;

  return (
    <GenericEventDetails
      event={event}
      accountName={accountName}
      extraDetails={extraDetails}
    />
  );
};
