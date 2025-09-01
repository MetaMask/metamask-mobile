import React from 'react';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { AlertMessage, AlertMessageProps } from './alert-message';
import { RowAlertKey } from '../UI/info-row/alert-row/constants';
import { Alert } from '../../types/alerts';

function render(props: AlertMessageProps) {
  return renderWithProvider(<AlertMessage {...props} />, {
    state: {},
  });
}

const MESSAGE_MOCK = 'Test Message';
const FIELD_MOCK = 'testField' as RowAlertKey;

describe('AlertMessage', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('renders message from first alert', () => {
    const { getByText } = render({
      alerts: [
        {
          message: MESSAGE_MOCK,
        },
        {
          message: 'other',
        },
      ] as Alert[],
    });

    expect(getByText(MESSAGE_MOCK)).toBeDefined();
  });

  it('renders message from first field alert', () => {
    const { getByText } = render({
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
      ] as Alert[],
    });

    expect(getByText(MESSAGE_MOCK)).toBeDefined();
  });

  it('renders nothing if no alerts', () => {
    const { queryByText } = render({ alerts: [] });
    expect(queryByText(MESSAGE_MOCK)).toBeNull();
  });
});
