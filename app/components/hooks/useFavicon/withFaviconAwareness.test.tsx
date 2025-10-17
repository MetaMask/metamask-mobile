import React, { Component } from 'react';
import { render } from '@testing-library/react-native';
import withFaviconAwareness from './withFaviconAwareness';
import useFavicon from './useFavicon';
import { View } from 'react-native';

jest.mock('./useFavicon');

interface MockComponentProps {
  url: string;
  faviconSource?: string;
}

class MockComponent extends Component<MockComponentProps> {
  render() {
    return <View testID="mock-component" />;
  }
}

describe('withFaviconAwareness', () => {
  it('passes the correct props to the child component', () => {
    (useFavicon as jest.Mock).mockReturnValue({
      faviconURI: { uri: 'mockedUri' },
      isLoading: false,
      isLoaded: true,
    });

    const renderSpy = jest.spyOn(MockComponent.prototype, 'render');

    const MockComponentWithFavicon = withFaviconAwareness(MockComponent);
    render(<MockComponentWithFavicon url="mockedUrl" />);

    expect(renderSpy).toHaveBeenCalled();
    expect(renderSpy.mock.instances[0].props).toEqual({
      url: 'mockedUrl',
      faviconSource: 'mockedUri',
    });

    renderSpy.mockRestore();
  });

  it('passes only url prop when faviconURI is empty', () => {
    (useFavicon as jest.Mock).mockReturnValue({
      faviconURI: {},
      isLoading: false,
      isLoaded: true,
    });

    const renderSpy = jest.spyOn(MockComponent.prototype, 'render');

    const MockComponentWithFavicon = withFaviconAwareness(MockComponent);
    render(<MockComponentWithFavicon url="mockedUrl" />);

    expect(renderSpy).toHaveBeenCalled();
    expect(renderSpy.mock.instances[0].props).toEqual({
      url: 'mockedUrl',
    });

    renderSpy.mockRestore();
  });
});
