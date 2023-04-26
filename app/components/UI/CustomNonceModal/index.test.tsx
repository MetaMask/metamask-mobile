import React from 'react';
import { render } from '@testing-library/react-native';
import CustomNonceModal from './';

describe('CustomNonceModal', () => {
  it('should render correctly', () => {
    const proposedNonce = 26;
    const customNonce = 28;
    const noop = () => ({});
    const { toJSON } = render(
      <CustomNonceModal
        save={noop}
        close={noop}
        proposedNonce={proposedNonce}
        nonceValue={customNonce}
      />,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
