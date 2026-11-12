import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import { strings } from '../../../../../../locales/i18n';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import CollectiblesOnboarding from './CollectiblesOnboarding';
import CollectiblesOnboardingVideo from './CollectiblesOnboardingVideo';
import { CollectiblesOnboardingSelectorsIDs as IDs } from './CollectiblesOnboarding.testIds';

// Narrow props-only contracts; real route gating/persistence are covered in CV.
jest.mock('./CollectiblesOnboardingVideo', () => jest.fn(() => null));

describe('CollectiblesOnboarding', () => {
  const props = {
    onComplete: jest.fn(),
    onClose: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uses the laid-out screen rather than the device window for its scene', () => {
    renderWithProvider(<CollectiblesOnboarding {...props} />);
    const artwork = jest.mocked(CollectiblesOnboardingVideo);
    expect(artwork.mock.calls.at(-1)?.[0].isActive).toBe(false);

    fireEvent(screen.getByTestId(IDs.CONTAINER), 'layout', {
      nativeEvent: { layout: { width: 390, height: 720 } },
    });

    expect(artwork.mock.calls.at(-1)?.[0]).toEqual(
      expect.objectContaining({ step: 0, isActive: true }),
    );
  });

  it('shows the complete alternative introduction copy on each slide', () => {
    renderWithProvider(<CollectiblesOnboarding {...props} />);

    expect(
      screen.getByText('Open packs, get real graded cards'),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(
        'Collectibles trading cards, professionally graded. See the odds before you open.',
      ),
    ).toBeOnTheScreen();

    fireEvent.press(screen.getByTestId(IDs.NEXT));

    expect(screen.getByText('Keep it or sell it back')).toBeOnTheScreen();
    expect(
      screen.getByText(
        'Cards you keep stay in your collection. Selling back pays a set percentage of market value.',
      ),
    ).toBeOnTheScreen();
  });

  it('keeps the description within the design-system body line height', () => {
    renderWithProvider(<CollectiblesOnboarding {...props} />);

    expect(
      screen.getByText(
        'Collectibles trading cards, professionally graded. See the odds before you open.',
      ),
    ).toHaveStyle({ fontSize: 16, lineHeight: 24 });
  });

  it.each([IDs.BACK, IDs.FIRST_STEP])(
    'returns to the first slide using %s without completing onboarding',
    (control) => {
      renderWithProvider(<CollectiblesOnboarding {...props} />);
      fireEvent.press(screen.getByTestId(IDs.NEXT));

      fireEvent.press(screen.getByTestId(control));

      expect(screen.getByTestId(IDs.PROGRESS)).toHaveProp(
        'accessibilityLabel',
        strings('collectibles.onboarding.step', { step: 1, total: 2 }),
      );
      expect(props.onComplete).not.toHaveBeenCalled();
    },
  );

  it('allows selecting the second slide without completing onboarding', () => {
    renderWithProvider(<CollectiblesOnboarding {...props} />);

    fireEvent.press(screen.getByTestId(IDs.SECOND_STEP));

    expect(screen.getByTestId(IDs.COMPLETE)).toBeOnTheScreen();
    expect(props.onComplete).not.toHaveBeenCalled();
  });

  it.each([0, 1])('closes slide %s without recording completion', (step) => {
    renderWithProvider(<CollectiblesOnboarding {...props} />);
    if (step === 1) fireEvent.press(screen.getByTestId(IDs.NEXT));

    fireEvent.press(screen.getByTestId(IDs.CLOSE));

    expect(props.onClose).toHaveBeenCalledTimes(1);
    expect(props.onComplete).not.toHaveBeenCalled();
  });

  it('records completion only once when Get started is pressed repeatedly', () => {
    renderWithProvider(<CollectiblesOnboarding {...props} />);
    fireEvent.press(screen.getByTestId(IDs.NEXT));

    fireEvent.press(screen.getByTestId(IDs.COMPLETE));
    fireEvent.press(screen.getByTestId(IDs.COMPLETE));

    expect(props.onComplete).toHaveBeenCalledTimes(1);
  });
});
