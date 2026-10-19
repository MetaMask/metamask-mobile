import React from 'react';
import GlobalAlert from './index';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { strings } from '../../../../locales/i18n';

describe('GlobalAlert', () => {
  it('renders storage-full alert message when visible', () => {
    const { getByText } = renderWithProvider(<GlobalAlert />, {
      state: {
        alert: {
          isVisible: true,
          autodismiss: null,
          content: 'storage-full-alert',
          data: {
            msg: strings('storage.device_full_alert'),
          },
        },
      },
    });

    expect(getByText(strings('storage.device_full_alert'))).toBeOnTheScreen();
  });
});
