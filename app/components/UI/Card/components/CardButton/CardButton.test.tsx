import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import CardButton from './CardButton';
import { renderScreen } from '../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import { WalletViewSelectorsIDs } from '../../../../Views/Wallet/WalletView.testIds';

const mockTrackEvent = jest.fn();
const mockBuiltEvent = { name: 'Card Button Viewed', properties: {} };
const mockBuild = jest.fn().mockReturnValue(mockBuiltEvent);
const mockCreateEventBuilder = jest.fn().mockReturnValue({
  build: mockBuild,
});

jest.mock('../../../../hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: () => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: mockCreateEventBuilder,
  }),
}));

jest.mock('../../../../../util/Logger', () => ({ log: jest.fn() }));

interface RenderOptions {
  /** Set to 0 to simulate flags not yet loaded. Defaults to 1 (resolved). */
  cacheTimestamp?: number;
}

function renderWithProvider(
  component: React.ComponentType,
  { cacheTimestamp = 1 }: RenderOptions = {},
) {
  return renderScreen(
    component,
    { name: 'CardButton' },
    {
      state: {
        engine: {
          backgroundState: {
            ...backgroundState,
            RemoteFeatureFlagController: {
              ...backgroundState.RemoteFeatureFlagController,
              cacheTimestamp,
            },
          },
        },
      },
    },
  );
}

describe('CardButton Component', () => {
  const mockOnPress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockBuild.mockReturnValue(mockBuiltEvent);
    mockCreateEventBuilder.mockReturnValue({
      build: mockBuild,
    });
  });

  it('renders the card button', () => {
    const { getByTestId } = renderWithProvider(() => (
      <CardButton
        onPress={mockOnPress}
        touchAreaSlop={{ top: 0, bottom: 0, left: 0, right: 0 }}
      />
    ));

    expect(getByTestId(WalletViewSelectorsIDs.CARD_BUTTON)).toBeOnTheScreen();
  });

  it('calls onPress when pressed', () => {
    const { getByTestId } = renderWithProvider(() => (
      <CardButton
        onPress={mockOnPress}
        touchAreaSlop={{ top: 0, bottom: 0, left: 0, right: 0 }}
      />
    ));

    fireEvent.press(getByTestId(WalletViewSelectorsIDs.CARD_BUTTON));

    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });

  describe('analytics: CARD_BUTTON_VIEWED event', () => {
    it('fires exactly once on mount', () => {
      renderWithProvider(() => (
        <CardButton
          onPress={mockOnPress}
          touchAreaSlop={{ top: 0, bottom: 0, left: 0, right: 0 }}
        />
      ));

      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'Card Button Viewed',
        }),
      );
      expect(mockBuild).toHaveBeenCalledTimes(1);
      expect(mockTrackEvent).toHaveBeenCalledTimes(1);
      expect(mockTrackEvent).toHaveBeenCalledWith(mockBuiltEvent);
    });

    it('does not fire event when flags are not yet resolved (cacheTimestamp = 0)', () => {
      renderWithProvider(
        () => (
          <CardButton
            onPress={mockOnPress}
            touchAreaSlop={{ top: 0, bottom: 0, left: 0, right: 0 }}
          />
        ),
        { cacheTimestamp: 0 },
      );

      expect(mockTrackEvent).not.toHaveBeenCalled();
    });
  });
});
