import React from 'react';
import renderWithProvider from '../../../util/test/renderWithProvider';
import ApprovalTagUrl from './ApprovalTagUrl';
import { backgroundState } from '../../../util/test/initial-root-state';

const ADDRESS_MOCK = '0x1234567890abcdef1234567890abcdef12345678';
const DOMAIN_MOCK = 'metamask.github.io';
const mockInitialState = {
  settings: {},
  engine: {
    backgroundState: {
      ...backgroundState,
      PreferencesController: {
        selectedAddress: ADDRESS_MOCK,
      },
    },
  },
};

describe('ApprovalTagUrl', () => {
  it('renders correctly', () => {
    const { toJSON } = renderWithProvider(
      <ApprovalTagUrl
        from={ADDRESS_MOCK}
        origin={DOMAIN_MOCK}
        url={`https://${DOMAIN_MOCK}/test-dapp/mock-url-query`}
        sdkDappMetadata={{ url: '', icon: '' }}
      />,
      { state: mockInitialState },
    );

    expect(toJSON()).toMatchSnapshot();
  });
});
