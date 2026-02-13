import React from 'react';
import { Text, TextVariant } from '@metamask/design-system-react-native';
import { GenericEventDetails, DetailsRow } from './GenericEventDetails';
import { PointsEventDto } from '../../../../../../../core/Engine/controllers/rewards-controller/types';
import { strings } from '../../../../../../../../locales/i18n';

export const BonusCodeEventDetails: React.FC<{
  event: Extract<PointsEventDto, { type: 'BONUS_CODE' }>;
  accountName?: string;
}> = ({ event, accountName }) => {
  const bonusCodePayload = event.payload;

  return (
    <GenericEventDetails
      event={event}
      accountName={accountName}
      extraDetails={
        bonusCodePayload?.code ? (
          <DetailsRow label={strings('rewards.events.code')}>
            <Text variant={TextVariant.BodySm}>{bonusCodePayload.code}</Text>
          </DetailsRow>
        ) : undefined
      }
    />
  );
};
