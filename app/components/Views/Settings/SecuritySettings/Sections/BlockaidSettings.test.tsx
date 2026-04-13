import React from 'react';

import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import { strings } from '../../../../../../locales/i18n';

import BlockaidSettings from './BlockaidSettings';

const initialState = {
  privacy: { approvedHosts: {} },
  browser: { history: [] },
  settings: { lockTime: 1000 },
  user: { passwordSet: true },
  engine: {
    backgroundState,
  },
  security: {},
};

describe('BlockaidSettings', () => {
  it('should render correctly', () => {
    const { getByText } = renderWithProvider(<BlockaidSettings />, {
      state: initialState,
    });
    expect(
      getByText(strings('app_settings.security_alerts')),
    ).toBeOnTheScreen();
  });
});
