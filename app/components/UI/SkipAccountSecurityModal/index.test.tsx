import React from 'react';
import { shallow } from 'enzyme';
import SkipAccountSecurityModal from './';

const noop = () => ({});

describe('HintModal', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <SkipAccountSecurityModal
        route={{
          params: {
            onConfirm: noop,
          },
        }}
      />,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
