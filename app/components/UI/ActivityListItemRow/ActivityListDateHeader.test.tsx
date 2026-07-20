import React from 'react';
import { render } from '@testing-library/react-native';
import ActivityListDateHeader from './ActivityListDateHeader';

jest.mock('../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

jest.mock('../../../util/theme', () => ({
  useTheme: () => ({
    colors: {
      text: {
        alternative: 'text-alternative',
        default: 'text-default',
      },
    },
  }),
}));

describe('ActivityListDateHeader', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders provided label without formatting timestamp', () => {
    const { getByTestId } = render(
      <ActivityListDateHeader label="transaction.pending" timestamp={0} />,
    );

    expect(getByTestId('activity-list-date-header')).toHaveTextContent(
      'transaction.pending',
    );
  });

  it('renders formatted date label from timestamp', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 5, 19, 12));

    const { getByTestId } = render(
      <ActivityListDateHeader timestamp={new Date(2026, 5, 19, 1).getTime()} />,
    );

    expect(getByTestId('activity-list-date-header')).toHaveTextContent(
      'perps.today',
    );
  });
});
