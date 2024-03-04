import React from 'react';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import TabThumbnail from './';

describe('TabThumbnail', () => {
  it('should render correctly', () => {
    const foo = () => null;
    const wrapper = renderWithProvider(
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
