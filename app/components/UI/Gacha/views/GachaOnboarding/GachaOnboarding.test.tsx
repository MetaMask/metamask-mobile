import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import GachaOnboarding from './GachaOnboarding';
import { GachaOnboardingSelectorsIDs as IDs } from './GachaOnboarding.testIds';

// Props-only contracts; route gating and persisted completion are covered in CV.
describe('GachaOnboarding', () => {
  const props = {
    balance: 0n,
    onFund: jest.fn(),
    onComplete: jest.fn(),
    onClose: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const goToFundingStep = () => {
    fireEvent.press(screen.getByTestId(IDs.NEXT));
    fireEvent.press(screen.getByTestId(IDs.NEXT));
  };

  it('moves back through steps without completing onboarding', () => {
    renderWithProvider(<GachaOnboarding {...props} />);

    expect(screen.getByTestId(IDs.PROGRESS)).toHaveTextContent('Step 1 of 3');
    fireEvent.press(screen.getByTestId(IDs.NEXT));
    expect(screen.getByTestId(IDs.PROGRESS)).toHaveTextContent('Step 2 of 3');
    fireEvent.press(screen.getByTestId(IDs.BACK));

    expect(screen.getByTestId(IDs.PROGRESS)).toHaveTextContent('Step 1 of 3');
    expect(props.onComplete).not.toHaveBeenCalled();
  });

  it('shows the Pokémon 2500 artwork with explicitly illustrative odds', () => {
    renderWithProvider(<GachaOnboarding {...props} />);

    expect(screen.getByTestId(IDs.PACK)).toHaveProp(
      'accessibilityLabel',
      'Pokémon Astral',
    );
    expect(screen.getByText('Example odds')).toBeOnTheScreen();
    expect(screen.getByText(/Demo odds for this prototype/u)).toBeOnTheScreen();
  });

  it.each([0, 1, 2])('closes step %s without recording completion', (step) => {
    renderWithProvider(<GachaOnboarding {...props} />);
    for (let index = 0; index < step; index += 1) {
      fireEvent.press(screen.getByTestId(IDs.NEXT));
    }

    fireEvent.press(screen.getByTestId(IDs.CLOSE));

    expect(props.onClose).toHaveBeenCalledTimes(1);
    expect(props.onComplete).not.toHaveBeenCalled();
  });

  it('keeps the funding step open until OK is pressed', () => {
    renderWithProvider(<GachaOnboarding {...props} balance={73500000n} />);
    goToFundingStep();

    fireEvent.press(screen.getByTestId(IDs.FUND));

    expect(props.onFund).toHaveBeenCalledTimes(1);
    expect(props.onComplete).not.toHaveBeenCalled();
    expect(screen.getByTestId(IDs.PROGRESS)).toHaveTextContent('Step 3 of 3');
    expect(screen.getByTestId(IDs.BALANCE)).toHaveTextContent('73.50 USDC');

    fireEvent.press(screen.getByTestId(IDs.COMPLETE));
    expect(props.onComplete).toHaveBeenCalledTimes(1);
  });

  it('updates the displayed balance without restarting onboarding', () => {
    const { rerender } = renderWithProvider(<GachaOnboarding {...props} />);
    goToFundingStep();
    expect(screen.getByTestId(IDs.BALANCE)).toHaveTextContent('0.00 USDC');

    rerender(<GachaOnboarding {...props} balance={25000000n} />);

    expect(screen.getByTestId(IDs.PROGRESS)).toHaveTextContent('Step 3 of 3');
    expect(screen.getByTestId(IDs.BALANCE)).toHaveTextContent('25.00 USDC');
  });

  it('allows completion while a second funding flow is disabled', () => {
    renderWithProvider(<GachaOnboarding {...props} isFunding />);
    goToFundingStep();

    expect(screen.getByTestId(IDs.FUND)).toBeDisabled();
    fireEvent.press(screen.getByTestId(IDs.COMPLETE));

    expect(props.onComplete).toHaveBeenCalledTimes(1);
  });
});
