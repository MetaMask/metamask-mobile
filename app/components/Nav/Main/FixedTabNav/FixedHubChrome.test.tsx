import React from 'react';
import { Text, View } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import { makeMutable, type SharedValue } from 'react-native-reanimated';
import {
  FixedHubChrome,
  FixedHubChromeProvider,
  FixedHubChromeSpacer,
  useFixedHubChromeInset,
  useFixedHubChromeScroll,
} from './FixedHubChrome';
import { HeaderGlassBackdrop } from '../../../../component-library/components-temp/HeaderGlass';

jest.mock('../../../../component-library/components-temp/HeaderGlass', () => ({
  HeaderGlassBackdrop: jest.fn(() => null),
}));

const mockHeaderGlassBackdrop = jest.mocked(HeaderGlassBackdrop);

const backdropScrollDistance = (): number | undefined => {
  const props = mockHeaderGlassBackdrop.mock.calls.at(-1)?.[0] as
    | { scrollDistance?: SharedValue<number> }
    | undefined;
  return props?.scrollDistance?.value;
};

const InsetProbe = () => {
  const inset = useFixedHubChromeInset();
  return <Text testID="hub-chrome-inset">{String(inset)}</Text>;
};

const ScrollPublisher = ({
  scrollDistance,
}: {
  scrollDistance: SharedValue<number> | null;
}) => {
  useFixedHubChromeScroll(scrollDistance);
  return null;
};

describe('FixedHubChrome', () => {
  beforeEach(() => {
    mockHeaderGlassBackdrop.mockClear();
  });

  it('keeps the header in place outside a hub', () => {
    const { getByText } = render(
      <FixedHubChrome>
        <Text>Account</Text>
      </FixedHubChrome>,
    );

    expect(getByText('Account')).toBeOnTheScreen();
  });

  it('pins the header over the page and clears a gap that can scroll away', () => {
    const { getByTestId, getByText } = render(
      <FixedHubChromeProvider>
        <InsetProbe />
        <FixedHubChrome>
          <View testID="hub-chrome">
            <Text>Account</Text>
          </View>
        </FixedHubChrome>
        <FixedHubChromeSpacer />
      </FixedHubChromeProvider>,
    );

    expect(getByText('Account')).toBeOnTheScreen();
    expect(getByTestId('hub-chrome-inset')).toHaveTextContent('0');

    const overlay = getByTestId('hub-chrome').parent;
    if (!overlay) {
      throw new Error('Pinned chrome has no overlay');
    }
    fireEvent(overlay, 'layout', {
      nativeEvent: { layout: { x: 0, y: 0, width: 390, height: 96 } },
    });

    expect(getByTestId('hub-chrome-inset')).toHaveTextContent('96');
  });

  it('keeps the backdrop transparent at rest when the screen publishes no scroll', () => {
    render(
      <FixedHubChromeProvider>
        <FixedHubChrome>
          <Text>Swaps</Text>
        </FixedHubChrome>
      </FixedHubChromeProvider>,
    );

    expect(mockHeaderGlassBackdrop).toHaveBeenCalled();
    expect(backdropScrollDistance()).toBe(0);
  });

  it('drives the backdrop from the scroll distance the screen publishes', () => {
    render(
      <FixedHubChromeProvider>
        <ScrollPublisher scrollDistance={makeMutable(32)} />
        <FixedHubChrome>
          <Text>Trending</Text>
        </FixedHubChrome>
      </FixedHubChromeProvider>,
    );

    expect(backdropScrollDistance()).toBe(32);
  });
});
