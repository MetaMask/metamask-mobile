import React from 'react';
import { render } from '@testing-library/react-native';
import TabThumbnail from './';

describe('TabThumbnail', () => {
  it('should render correctly', () => {
    const foo = () => null;
    const { toJSON } = render(
      // eslint-disable-next-line react/jsx-no-bind
      <TabThumbnail
        tab={{ url: 'about:blank', image: '' }}
        isActiveTab
        onClose={foo}
        onSwitch={foo}
      />,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
