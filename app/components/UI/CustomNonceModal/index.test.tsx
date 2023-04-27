import React from 'react';
import { shallow } from 'enzyme';
import CustomNonceModal from './';

describe('CustomNonceModal', () => {
  it('should render correctly', () => {
    const proposedNonce = 26;
    const customNonce = 28;
    const noop = () => ({});
    const wrapper = shallow(
      <CustomNonceModal
        save={noop}
        close={noop}
        proposedNonce={proposedNonce}
        nonceValue={customNonce}
      />,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
