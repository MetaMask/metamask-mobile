jest.useFakeTimers();

import React from 'react';
import { shallow } from 'enzyme';
import TabThumbnail from './';

describe('TabThumbnail', () => {
  it('should render correctly', () => {
    const foo = () => null;
    const wrapper = shallow(
      // eslint-disable-next-line react/jsx-no-bind
      <TabThumbnail
        tab={{ url: 'about:blank', image: '' }}
        isActiveTab
        onClose={foo}
        onSwitch={foo}
      />,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
