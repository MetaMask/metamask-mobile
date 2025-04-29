import React from 'react';
import { shallow } from 'enzyme';
import CustomNonceModal from '.';

const PROPOSED_NONCE = 26;
const saveMock = jest.fn();
const closeMock = jest.fn();
const createWrapper = () =>
  shallow(
    <CustomNonceModal
      save={saveMock}
      close={closeMock}
      proposedNonce={PROPOSED_NONCE}
      nonceValue={PROPOSED_NONCE}
    />,
  );
describe('CustomNonceModal', () => {
  it('renders correctly', () => {
    const wrapper = createWrapper();
    expect(wrapper).toMatchSnapshot();
  });

  it('handles only numeric inputs', () => {
    const wrapper = createWrapper();
    const nonceTextInput = wrapper.find('TextInput');
    nonceTextInput.simulate('changeText', '30c');
    expect(wrapper.find('TextInput').prop('value')).toBe(
      String(PROPOSED_NONCE),
    );
    nonceTextInput.simulate('changeText', '30');
    expect(wrapper.find('TextInput').prop('value')).toBe('30');
  });

  it('increments nonce correctly', () => {
    const wrapper = createWrapper();
    const incrementButton = wrapper.find({ testID: 'increment-nonce' });

    incrementButton.simulate('press');
    expect(wrapper.find('TextInput').prop('value')).toBe(
      String(PROPOSED_NONCE + 1),
    );
  });

  it('decrements nonce correctly', () => {
    const wrapper = shallow(
      <CustomNonceModal
        save={saveMock}
        close={closeMock}
        proposedNonce={PROPOSED_NONCE}
        nonceValue={PROPOSED_NONCE}
      />,
    );
    const decrementButton = wrapper.find({ testID: 'decrement-nonce' });

    decrementButton.simulate('press');
    expect(wrapper.find('TextInput').prop('value')).toBe(
      String(PROPOSED_NONCE - 1),
    );
  });

  it('does not decrement the nonce value below 0 when the current nonce is 0', () => {
    const wrapper = createWrapper();
    wrapper.setProps({ proposedNonce: 0, nonceValue: 0 });
    const decrementButton = wrapper.find({ testID: 'decrement-nonce' });

    decrementButton.simulate('press');
    expect(wrapper.find('TextInput').prop('value')).toBe(String(0));
  });
});
