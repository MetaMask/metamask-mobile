import React from 'react';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { AlertMessage, AlertMessageProps } from './alert-message';
import { useAlerts } from '../../context/alert-system-context';
import { RowAlertKey } from '../UI/info-row/alert-row/constants';

jest.mock('../../context/alert-system-context');

function render(props: Partial<AlertMessageProps> = {}) {
  return renderWithProvider(<AlertMessage {...props} />, {
    state: {},
  });
}

const MESSAGE_MOCK = 'Test Message';
const FIELD_MOCK = 'testField' as RowAlertKey;

describe('AlertMessage', () => {
  const useAlertsMock = jest.mocked(useAlerts);

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('renders message from first alert', () => {
    useAlertsMock.mockReturnValue({
      alerts: [
        {
          message: MESSAGE_MOCK,
        },
        {
          message: 'other',
        },
      ],
    } as unknown as ReturnType<typeof useAlerts>);

    const { getByText } = render();

    expect(getByText(MESSAGE_MOCK)).toBeDefined();
  });

  it('renders message from first field alert', () => {
    useAlertsMock.mockReturnValue({
      alerts: [
        {
          message: MESSAGE_MOCK,
          field: FIELD_MOCK,
        },
        {
          message: 'other',
          field: FIELD_MOCK,
        },
        {
          message: 'other2',
        },
      ],
    } as unknown as ReturnType<typeof useAlerts>);

    const { getByText } = render({ field: FIELD_MOCK });

    expect(getByText(MESSAGE_MOCK)).toBeDefined();
  });

  it('renders nothing if no alerts', () => {
    useAlertsMock.mockReturnValue({
      alerts: [],
    } as unknown as ReturnType<typeof useAlerts>);

    const { queryByText } = render();

    expect(queryByText(MESSAGE_MOCK)).toBeNull();
  });
});
