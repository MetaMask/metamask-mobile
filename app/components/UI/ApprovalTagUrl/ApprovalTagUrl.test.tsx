import React from 'react';
import renderWithProvider from '../../../util/test/renderWithProvider';
import ApprovalTagUrl, { APPROVAL_TAG_URL_ORIGIN_PILL } from './ApprovalTagUrl';
import { backgroundState } from '../../../util/test/initial-root-state';
import { INTERNAL_ORIGINS } from '../../../constants/transaction';

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
    const { toJSON, getByTestId } = renderWithProvider(
      <ApprovalTagUrl
        from={ADDRESS_MOCK}
        origin={DOMAIN_MOCK}
        url={`https://${DOMAIN_MOCK}/test-dapp/mock-url-query`}
        sdkDappMetadata={{ url: '', icon: '' }}
      />,
      { state: mockInitialState },
    );

    expect(toJSON()).toMatchSnapshot();
    expect(getByTestId(APPROVAL_TAG_URL_ORIGIN_PILL)).toBeDefined();
  });

  it('does not render when origin is an internal origin', () => {
    const { queryByTestId } = renderWithProvider(
      <ApprovalTagUrl
        from={ADDRESS_MOCK}
        origin={INTERNAL_ORIGINS[0]}
        url={`https://${INTERNAL_ORIGINS[0]}`}
        sdkDappMetadata={{ url: '', icon: '' }}
      />,
      { state: mockInitialState },
    );

    expect(queryByTestId(APPROVAL_TAG_URL_ORIGIN_PILL)).toBeNull();
  });

  it('renders correctly when only origin is provided', () => {
    const { toJSON, getByTestId } = renderWithProvider(
      <ApprovalTagUrl
        from={ADDRESS_MOCK}
        origin={DOMAIN_MOCK}
        url=""
        sdkDappMetadata={{ url: '', icon: '' }}
      />,
      { state: mockInitialState },
    );

    expect(toJSON()).toMatchSnapshot();
    expect(getByTestId(APPROVAL_TAG_URL_ORIGIN_PILL)).toBeDefined();
  });
});
