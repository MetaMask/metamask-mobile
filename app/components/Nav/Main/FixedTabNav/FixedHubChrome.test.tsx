import React from 'react';
import { Text, View } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import {
  FIXED_HUB_CONTENT_GAP,
  FixedHubChrome,
  FixedHubChromeProvider,
  FixedHubChromeSpacer,
  useFixedHubChromeInset,
} from './FixedHubChrome';

const InsetProbe = () => {
  const inset = useFixedHubChromeInset();
  return <Text testID="hub-chrome-inset">{String(inset)}</Text>;
};

describe('FixedHubChrome', () => {
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

  it('backs the pinned chrome with a solid fill instead of a scroll blur', () => {
    const { getByTestId } = render(
      <FixedHubChromeProvider>
        <FixedHubChrome>
          <Text>Trending</Text>
        </FixedHubChrome>
      </FixedHubChromeProvider>,
    );

    expect(getByTestId('fixed-hub-chrome-backdrop')).toBeOnTheScreen();
  });

  it('adds 16px of content clearance below the pinned chrome', () => {
    const { getByTestId, queryByTestId } = render(
      <FixedHubChromeProvider>
        <FixedHubChrome>
          <View testID="hub-chrome">
            <Text>Account</Text>
          </View>
        </FixedHubChrome>
        <View testID="scroll">
          <FixedHubChromeSpacer />
        </View>
      </FixedHubChromeProvider>,
    );

    // Nothing to clear yet: no spacer before the chrome measures.
    expect(queryByTestId('fixed-hub-chrome-spacer')).toBeNull();

    const overlay = getByTestId('hub-chrome').parent;
    if (!overlay) {
      throw new Error('Pinned chrome has no overlay');
    }
    fireEvent(overlay, 'layout', {
      nativeEvent: { layout: { x: 0, y: 0, width: 390, height: 96 } },
    });

    const spacer = getByTestId('fixed-hub-chrome-spacer');
    expect(spacer.props.style).toEqual({ height: 96 + FIXED_HUB_CONTENT_GAP });
  });

  it('adds a screen-specific extra gap on top of the shared clearance', () => {
    const { getByTestId } = render(
      <FixedHubChromeProvider>
        <FixedHubChrome>
          <View testID="hub-chrome">
            <Text>Account</Text>
          </View>
        </FixedHubChrome>
        <View testID="scroll">
          <FixedHubChromeSpacer extraGap={8} />
        </View>
      </FixedHubChromeProvider>,
    );

    const overlay = getByTestId('hub-chrome').parent;
    if (!overlay) {
      throw new Error('Pinned chrome has no overlay');
    }
    fireEvent(overlay, 'layout', {
      nativeEvent: { layout: { x: 0, y: 0, width: 390, height: 96 } },
    });

    const spacer = getByTestId('fixed-hub-chrome-spacer');
    expect(spacer.props.style).toEqual({
      height: 96 + FIXED_HUB_CONTENT_GAP + 8,
    });
  });
});
