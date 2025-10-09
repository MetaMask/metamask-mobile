import React from 'react';
import { GenericEventDetails } from './GenericEventDetails';
import { PointsEventDto } from '../../../../../../../core/Engine/controllers/rewards-controller/types';

export const PerpsEventDetails: React.FC<{
  event: Extract<PointsEventDto, { type: 'PERPS' }>;
  accountName?: string;
}> = ({ event, accountName }) => (
  // For now, perps events use the generic display
  // Future: Add perps-specific details like position size, PnL, etc.
  <GenericEventDetails event={event} accountName={accountName} />
);
