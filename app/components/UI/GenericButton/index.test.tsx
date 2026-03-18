import React from 'react';
import { render } from '@testing-library/react-native';
import GenericButtonIos from './index.ios';
import GenericButtonAndroid from './index.android';

describe('GenericButton', () => {
  it('should render correctly on iOS', () => {
    const component = render(<GenericButtonIos />);
    expect(component).toMatchSnapshot();
  });

  it('should render correctly on android', () => {
    jest.doMock('react-native/Libraries/Utilities/Platform', () => ({
      OS: 'android',
    }));
    const component = render(<GenericButtonAndroid />);
    expect(component).toMatchSnapshot();
  });
});
