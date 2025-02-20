import React from 'react';

import { ConfirmationPageSectionsSelectorIDs } from '../../../../../../e2e/selectors/Confirmation/ConfirmationView.selectors';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { personalSignatureConfirmationState } from '../../../../../util/test/confirm-data-helpers';
import Info from '../../components/Confirm/Info';
import { ScrollContextProvider, useScrollContext } from './ScrollContext';

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    goBack: jest.fn(),
  }),
}));

jest.mock('../../../../../core/Engine', () => ({
  getTotalFiatAccountBalance: () => ({ tokenFiat: 10 }),
  context: {
    KeyringController: {
      state: {
        keyrings: [],
      },
      getOrAddQRKeyring: jest.fn(),
    },
  },
  controllerMessenger: {
    subscribe: jest.fn(),
  },
}));

describe('ScrollContext', () => {
  it('scroll button is not rendered if there is no scroll', () => {
    const { queryByTestId } = renderWithProvider(
      <ScrollContextProvider>
        <Info />
      </ScrollContextProvider>,
      {
        state: personalSignatureConfirmationState,
      },
    );
    expect(
      queryByTestId(ConfirmationPageSectionsSelectorIDs.SCROLL_BUTTON),
    ).toBeNull();
  });
});

describe('useScrollContext', () => {
  it('should throw error is not wrapped in ScrollContext', () => {
    expect(() => {
      useScrollContext();
    }).toThrow();
  });
});
