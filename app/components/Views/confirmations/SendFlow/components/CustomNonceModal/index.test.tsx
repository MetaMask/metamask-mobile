import React from 'react';
import { render } from '@testing-library/react-native';
import CustomNonceModal from '.';

describe('CustomNonceModal', () => {
  const proposedNonce = 26;
  const customNonce = 28;
  it('should render correctly', () => {
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

  it('should handle only numeric inputs', () => {
    const saveMock = jest.fn();
    const closeMock = jest.fn();
    const { toJSON } = render(
      <CustomNonceModal
        save={saveMock}
        close={closeMock}
        proposedNonce={proposedNonce}
        nonceValue={proposedNonce}
      />,
    );
    const nonceTextInput = wrapper.find('TextInput');
    nonceTextInput.simulate('changeText', '30c');
    expect(wrapper.find('TextInput').prop('value')).toBe(String(proposedNonce));
    nonceTextInput.simulate('changeText', '30');
    expect(wrapper.find('TextInput').prop('value')).toBe('30');
  });
});
