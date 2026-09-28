import React from 'react';
import { render } from '@testing-library/react-native';
import PredictMarketDetailsStatus, {
  type PredictMarketDetailsStatusProps,
} from './PredictMarketDetailsStatus';
import {
  PredictMarketStatus,
  type PredictOutcomeToken,
} from '../../../../types';

const winningOutcomeToken: PredictOutcomeToken = {
  id: 'outcome-token-1',
  title: 'Yes',
  price: 0.98,
};

const renderStatus = (
  overrides: Partial<PredictMarketDetailsStatusProps> = {},
) =>
  render(
    <PredictMarketDetailsStatus
      winningOutcomeToken={undefined}
      multipleOpenOutcomesPartiallyResolved={false}
      resolutionStatus={undefined}
      marketStatus={PredictMarketStatus.OPEN}
      {...overrides}
    />,
  );

describe('PredictMarketDetailsStatus', () => {
  it('renders nothing for an open market with no status to report', () => {
    const { toJSON } = renderStatus();

    expect(toJSON()).toBeNull();
  });

  it('renders nothing when the winning outcome is withheld by a partial resolution', () => {
    const { toJSON } = renderStatus({
      winningOutcomeToken,
      multipleOpenOutcomesPartiallyResolved: true,
    });

    expect(toJSON()).toBeNull();
  });

  it('reports the winning outcome once the market is resolved', () => {
    const { getByText } = renderStatus({
      winningOutcomeToken,
      resolutionStatus: 'resolved',
      marketStatus: PredictMarketStatus.RESOLVED,
    });

    expect(getByText('Market resulted to Yes')).toBeOnTheScreen();
  });

  it('reports that the market ended while resolution is still pending', () => {
    const { getByText } = renderStatus({
      winningOutcomeToken,
      marketStatus: PredictMarketStatus.CLOSED,
    });

    expect(getByText('Market ended on Yes')).toBeOnTheScreen();
  });

  it('reports that a closed market is awaiting final resolution', () => {
    const { getByText } = renderStatus({
      marketStatus: PredictMarketStatus.CLOSED,
    });

    expect(getByText('Waiting for final resolution')).toBeOnTheScreen();
  });
});
