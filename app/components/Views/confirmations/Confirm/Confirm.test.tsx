import React from 'react';

import renderWithProvider from '../../../../util/test/renderWithProvider';
import {
  personalSignatureConfirmationState,
  securityAlertResponse,
  typedSignV1ConfirmationState,
} from '../../../../util/test/confirm-data-helpers';
import Confirm from './index';

jest.mock('react-native-gzip', () => ({
  deflate: (str: string) => str,
}));

describe('Confirm', () => {
  it('should render correct information for personal sign', async () => {
    const { getAllByRole, getByText } = renderWithProvider(<Confirm />, {
      state: personalSignatureConfirmationState,
    });
    expect(getByText('Signature request')).toBeDefined();
    expect(getByText('Estimated changes')).toBeDefined();
    expect(
      getByText(
        'You’re signing into a site and there are no predicted changes to your account.',
      ),
    ).toBeDefined();
    expect(getByText('Request from')).toBeDefined();
    expect(getByText('metamask.github.io')).toBeDefined();
    expect(getByText('Message')).toBeDefined();
    expect(getByText('Example `personal_sign` message')).toBeDefined();
    expect(getAllByRole('button')).toHaveLength(2);
  });

  it('should render correct information for typed sign v1', async () => {
    const { getAllByRole, getAllByText, getByText, queryByText } =
      renderWithProvider(<Confirm />, {
        state: typedSignV1ConfirmationState,
      });
    expect(getByText('Signature request')).toBeDefined();
    expect(getByText('Estimated changes')).toBeDefined();
    expect(
      getByText(
        'You’re signing into a site and there are no predicted changes to your account.',
      ),
    ).toBeDefined();
    expect(getByText('Request from')).toBeDefined();
    expect(getByText('metamask.github.io')).toBeDefined();
    expect(getAllByText('Message')).toHaveLength(2);
    expect(getByText('Hi, Alice!')).toBeDefined();
    expect(getAllByRole('button')).toHaveLength(2);
    expect(queryByText('This is a deceptive request')).toBeNull();
  });

  it('should render blockaid banner is confirmation has blockaid error response', async () => {
    const typedSignApproval =
      typedSignV1ConfirmationState.engine.backgroundState.ApprovalController
        .pendingApprovals['7e62bcb1-a4e9-11ef-9b51-ddf21c91a998'];
    const { getByText } = renderWithProvider(<Confirm />, {
      state: {
        ...typedSignV1ConfirmationState,
        engine: {
          ...typedSignV1ConfirmationState.engine,
          backgroundState: {
            ...typedSignV1ConfirmationState.engine.backgroundState,
            ApprovalController: {
              pendingApprovals: {
                'fb2029e1-b0ab-11ef-9227-05a11087c334': {
                  ...typedSignApproval,
                  requestData: {
                    ...typedSignApproval.requestData,
                    securityAlertResponse,
                  },
                },
              },
            },
          },
        },
      },
    });
    expect(getByText('Signature request')).toBeDefined();
    expect(getByText('This is a deceptive request')).toBeDefined();
  });
});
