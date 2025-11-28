import React from 'react';
import {
  Text,
  TextVariant,
  TextColor,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../../locales/i18n';
import { GenericEventDetails, DetailsRow } from './GenericEventDetails';
import {
  PointsEventDto,
  MusdDepositEventPayload,
} from '../../../../../../../core/Engine/controllers/rewards-controller/types';
import { formatRewardsMusdDepositPayloadDate } from '../../../../utils/formatUtils';

interface MusdDepositEventDetailsProps {
  event: PointsEventDto & {
    type: 'MUSD_DEPOSIT';
    payload: MusdDepositEventPayload | null;
  };
  accountName?: string;
}

export const MusdDepositEventDetails: React.FC<
  MusdDepositEventDetailsProps
> = ({ event, accountName }) => {
  const payload = event.payload;

  const formattedDate = formatRewardsMusdDepositPayloadDate(payload?.date);
  const extraDetails = formattedDate ? (
    <DetailsRow label={strings('rewards.events.for_deposit_period')}>
      <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
        {formattedDate}
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
