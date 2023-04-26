import React from 'react';
import { render } from '@testing-library/react-native';
import HintModal from './';

const noop = () => ({});
const hint = 'hint';

describe('HintModal', () => {
  it('should render correctly', () => {
    const { toJSON } = render(
      <HintModal
        onCancel={noop}
        onConfirm={noop}
        onChangeText={noop}
        onRequestClose={noop}
        modalVisible={false}
        value={hint}
      />,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
