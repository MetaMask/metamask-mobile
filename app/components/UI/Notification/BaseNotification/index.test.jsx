import React from 'react';
import BaseNotification, { getDescription } from './';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { strings } from '../../../../../locales/i18n';

const defaultProps = [
  {
    status: 'pending',
    data: { description: 'Testing description', title: 'Testing Title' },
  },
  {
    status: 'pending_withdrawal',
    data: { description: 'Testing description', title: 'Testing Title' },
  },
  {
    status: 'pending_deposit',
    data: { description: 'Testing description', title: 'Testing Title' },
  },
  {
    status: 'success_deposit',
    data: { description: 'Testing description', title: 'Testing Title' },
  },
  {
    status: 'success_withdrawal',
    data: { description: 'Testing description', title: 'Testing Title' },
  },
  {
    status: 'received',
    data: { description: 'Testing description', title: 'Testing Title' },
  },
  {
    status: 'received_payment',
    data: { description: 'Testing description', title: 'Testing Title' },
  },
  {
    status: 'cancelled',
    data: { description: 'Testing description', title: 'Testing Title' },
  },
  {
    status: 'error',
    data: { description: 'Testing description', title: 'Testing Title' },
  },
];

describe('BaseNotification', () => {
  it('gets icon correctly for each status', () => {
    defaultProps.forEach(({ status, data }) => {
      const { toJSON } = renderWithProvider(
        <BaseNotification status={status} data={data} />,
      );
      expect(toJSON()).toMatchSnapshot();
    });
  });

  it('gets titles correctly for each status', () => {
    defaultProps.forEach(({ status }) => {
      const { getByText } = renderWithProvider(
        <BaseNotification status={status} data={{}} />,
      );
      expect(getByText(strings(`notifications.${status}_title`))).toBeTruthy();
    });
  });

  it('gets descriptions correctly for if they are provided', () => {
    defaultProps.forEach(({ status, data }) => {
      const { getByText } = renderWithProvider(
        <BaseNotification status={status} data={data} />,
      );
      expect(getByText(data.description)).toBeTruthy();
    });
  });

  it('constructs the correct description using getDescription when no description is provided', () => {
    defaultProps.forEach(({ status }) => {
      const { getByText } = renderWithProvider(
        <BaseNotification status={status} data={{}} />,
      );
      expect(getByText(getDescription(status, {}))).toBeTruthy();
    });
  });

  describe('EIP-7702 transactions (without nonce)', () => {
    it('renders success title without nonce for EIP-7702 transactions', () => {
      const { getByText } = renderWithProvider(
        <BaseNotification status="success" data={{ nonce: undefined }} />,
      );

      const expectedTitle = strings('notifications.success_title', {
        nonce: '',
      })
        .replace(' #', ' ')
        .replace('{{nonce}}', '')
        .trim();

      expect(getByText(expectedTitle)).toBeTruthy();
    });

    it('renders success title with nonce when nonce exists', () => {
      const { getByText } = renderWithProvider(
        <BaseNotification status="success" data={{ nonce: '3' }} />,
      );

      expect(
        getByText(strings('notifications.success_title', { nonce: '3' })),
      ).toBeTruthy();
    });

    it('renders speedup title without nonce for EIP-7702 transactions', () => {
      const { getByText } = renderWithProvider(
        <BaseNotification status="speedup" data={{ nonce: undefined }} />,
      );

      const expectedTitle = strings('notifications.speedup_title', {
        nonce: '',
      })
        .replace(' #', ' ')
        .replace('{{nonce}}', '')
        .trim();

      expect(getByText(expectedTitle)).toBeTruthy();
    });

    it('renders speedup title with nonce when nonce exists', () => {
      const { getByText } = renderWithProvider(
        <BaseNotification status="speedup" data={{ nonce: '5' }} />,
      );

      expect(
        getByText(strings('notifications.speedup_title', { nonce: '5' })),
      ).toBeTruthy();
    });
  });
});
