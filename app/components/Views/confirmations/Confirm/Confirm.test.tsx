import React from 'react';

import renderWithProvider from '../../../../util/test/renderWithProvider';
import {
  personalSignatureConfirmationState,
  securityAlertResponse,
  typedSignV1ConfirmationState,
  stakingDepositConfirmationState,
} from '../../../../util/test/confirm-data-helpers';
// eslint-disable-next-line import/no-namespace
import * as ConfirmationRedesignEnabled from '../hooks/useConfirmationRedesignEnabled';

import Confirm from './index';

jest.mock('../../../../core/Engine', () => ({
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

jest.mock('../../../../util/address', () => ({
  ...jest.requireActual('../../../../util/address'),
  getAddressAccountType: (str: string) => str,
}));

jest.mock('react-native-gzip', () => ({
  deflate: (str: string) => str,
}));

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: jest.fn(),
    addListener: jest.fn(),
    dispatch: jest.fn(),
  }),
}));

describe('Confirm', () => {
  it('renders flat confirmation', async () => {
    const { getByTestId } = renderWithProvider(<Confirm />, {
      state: stakingDepositConfirmationState,
    });
    expect(getByTestId('flat-confirmation-container')).toBeDefined();
  });

  it('renders modal confirmation', async () => {
    const { getByTestId } = renderWithProvider(<Confirm />, {
      state: typedSignV1ConfirmationState,
    });
    expect(getByTestId('modal-confirmation-container')).toBeDefined();
  });

  it('renders correct information for personal sign', async () => {
    const { getAllByRole, getByText } = renderWithProvider(<Confirm />, {
      state: personalSignatureConfirmationState,
    });
    expect(getByText('Signature request')).toBeDefined();
    expect(
      getByText('Review request details before you confirm.'),
    ).toBeDefined();
    expect(getByText('Request from')).toBeDefined();
    expect(getByText('metamask.github.io')).toBeDefined();
    expect(getByText('Message')).toBeDefined();
    expect(getByText('Example `personal_sign` message')).toBeDefined();
    expect(getAllByRole('button')).toHaveLength(2);
  });

  it('renders correct information for typed sign v1', async () => {
    const { getAllByRole, getAllByText, getByText, queryByText } =
      renderWithProvider(<Confirm />, {
        state: typedSignV1ConfirmationState,
      });
    expect(getByText('Signature request')).toBeDefined();
    expect(getByText('Request from')).toBeDefined();
    expect(getByText('metamask.github.io')).toBeDefined();
    expect(getAllByText('Message')).toHaveLength(2);
    expect(getByText('Hi, Alice!')).toBeDefined();
    expect(getAllByRole('button')).toHaveLength(2);
    expect(queryByText('This is a deceptive request')).toBeNull();
  });

  it('renders blockaid banner if confirmation has blockaid error response', async () => {
    const { getByText } = renderWithProvider(<Confirm />, {
      state: {
        ...typedSignV1ConfirmationState,
        signatureRequest: { securityAlertResponse },
      },
    });
    expect(getByText('Signature request')).toBeDefined();
    expect(getByText('This is a deceptive request')).toBeDefined();
  });

  it('returns null if re-design is not enabled for confirmation', () => {
    jest
      .spyOn(ConfirmationRedesignEnabled, 'useConfirmationRedesignEnabled')
      .mockReturnValue({ isRedesignedEnabled: false });
    const { queryByText } = renderWithProvider(<Confirm />, {
      state: {
        ...typedSignV1ConfirmationState,
        signatureRequest: { securityAlertResponse },
      },
    });
    expect(queryByText('Signature request')).toBeNull();
  });
});
