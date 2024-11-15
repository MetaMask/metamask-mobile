import React from 'react';
import configureMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';
import { render } from '@testing-library/react-native';
import { SnapAvatar } from './SnapAvatar';

describe('SnapAvatar', () => {
  const mockStore = configureMockStore();
  const mockInitialState = {
    settings: {},
    engine: {
      backgroundState: {
        SubjectMetadataController: {
          subjectMetadata: {
            'npm:@metamask/bip32-example-snap': {
              extensionId: null,
              iconUrl: null,
              name: 'BIP-32 Example Snap',
              origin: 'npm:@metamask/bip32-example-snap',
              subjectType: 'snap',
              svgIcon: '<svg />',
              version: '1.0.0',
            },
          },
        },
      },
    },
  };
  const store = mockStore(mockInitialState);

  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Wrapper = ({ children }: any) => (
    <Provider store={store}>{children}</Provider>
  );

  it('renders an icon using subject metadata', () => {
    const { getByTestId } = render(
      <SnapAvatar
        snapId="npm:@metamask/bip32-example-snap"
        snapName="BIP-32 Example Snap"
      />,
      {
        wrapper: Wrapper,
      },
    );
    expect(getByTestId('snap-avatar-icon')).toBeDefined();
  });

  it('falls back to the first non symbol in the snap name', () => {
    const { getByTestId, getByText } = render(
      <SnapAvatar
        snapId="npm:@metamask/bip44-example-snap"
        snapName="BIP-44 Example Snap"
      />,
      {
        wrapper: Wrapper,
      },
    );
    expect(getByText('B')).toBeDefined();
    expect(getByTestId('snap-avatar-fallback')).toBeDefined();
  });
});
