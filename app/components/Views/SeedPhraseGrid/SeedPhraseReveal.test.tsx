import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { SeedPhraseReveal } from './SeedPhraseReveal';

describe('SeedPhraseReveal', () => {
  const mockSeedPhrase = [
    'abandon',
    'ability',
    'able',
    'about',
    'above',
    'absent',
    'absorb',
    'abstract',
    'absurd',
    'abuse',
    'access',
    'accident',
  ];

  it('renders the overlay when component first mounts', () => {
    render(<SeedPhraseReveal seedPhrase={mockSeedPhrase} />);

    expect(
      screen.getByText('Tap to reveal your Secret Recovery Phrase'),
    ).toBeTruthy();
    expect(
      screen.getByText('Make sure no one is looking at your screen'),
    ).toBeTruthy();
  });

  it('renders overlay as a touchable element', () => {
    render(<SeedPhraseReveal seedPhrase={mockSeedPhrase} />);

    const overlay = screen.getByText(
      'Tap to reveal your Secret Recovery Phrase',
    );
    expect(overlay.parent).toBeTruthy();
  });

  it('hides the overlay when tapped', () => {
    render(<SeedPhraseReveal seedPhrase={mockSeedPhrase} />);

    const overlayText = screen.getByText(
      'Tap to reveal your Secret Recovery Phrase',
    );
    const touchableOverlay = overlayText.parent;

    if (touchableOverlay) {
      fireEvent.press(touchableOverlay);
    }

    expect(
      screen.queryByText('Tap to reveal your Secret Recovery Phrase'),
    ).toBeNull();
    expect(
      screen.queryByText('Make sure no one is looking at your screen'),
    ).toBeNull();
  });

  it('does not show overlay again after it has been revealed', () => {
    render(<SeedPhraseReveal seedPhrase={mockSeedPhrase} />);

    const overlayText = screen.getByText(
      'Tap to reveal your Secret Recovery Phrase',
    );
    const touchableOverlay = overlayText.parent;

    if (touchableOverlay) {
      fireEvent.press(touchableOverlay);
    }

    expect(
      screen.queryByText('Tap to reveal your Secret Recovery Phrase'),
    ).toBeNull();

    screen.rerender(<SeedPhraseReveal seedPhrase={mockSeedPhrase} />);

    expect(
      screen.queryByText('Tap to reveal your Secret Recovery Phrase'),
    ).toBeNull();
  });
  it('handles empty seed phrase array', () => {
    render(<SeedPhraseReveal seedPhrase={[]} />);

    expect(
      screen.getByText('Tap to reveal your Secret Recovery Phrase'),
    ).toBeTruthy();
  });

  it('handles different seed phrase lengths', () => {
    const shortSeedPhrase = ['test', 'phrase'];
    render(<SeedPhraseReveal seedPhrase={shortSeedPhrase} />);

    expect(
      screen.getByText('Tap to reveal your Secret Recovery Phrase'),
    ).toBeTruthy();
  });

  it('renders container with correct styles', () => {
    const { toJSON } = render(<SeedPhraseReveal seedPhrase={mockSeedPhrase} />);

    expect(toJSON()).toMatchSnapshot();
  });

  it('renders touchable overlay that responds to press', () => {
    render(<SeedPhraseReveal seedPhrase={mockSeedPhrase} />);

    const overlayText = screen.getByText(
      'Tap to reveal your Secret Recovery Phrase',
    );
    const touchableOverlay = overlayText.parent;

    expect(touchableOverlay).toBeTruthy();

    if (touchableOverlay) {
      fireEvent.press(touchableOverlay);
      expect(
        screen.queryByText('Tap to reveal your Secret Recovery Phrase'),
      ).toBeNull();
    }
  });

  it('is accessible for screen readers', () => {
    render(<SeedPhraseReveal seedPhrase={mockSeedPhrase} />);

    const overlayText = screen.getByText(
      'Tap to reveal your Secret Recovery Phrase',
    );
    expect(overlayText).toBeTruthy();

    const subtextElement = screen.getByText(
      'Make sure no one is looking at your screen',
    );
    expect(subtextElement).toBeTruthy();
  });

  it('has proper text hierarchy', () => {
    render(<SeedPhraseReveal seedPhrase={mockSeedPhrase} />);

    const mainText = screen.getByText(
      'Tap to reveal your Secret Recovery Phrase',
    );
    const subText = screen.getByText(
      'Make sure no one is looking at your screen',
    );

    expect(mainText).toBeTruthy();
    expect(subText).toBeTruthy();
  });

  it('maintains reveal state independently for multiple instances', () => {
    const { unmount } = render(
      <SeedPhraseReveal seedPhrase={mockSeedPhrase} />,
    );

    const overlayText = screen.getByText(
      'Tap to reveal your Secret Recovery Phrase',
    );
    const touchableOverlay = overlayText.parent;

    if (touchableOverlay) {
      fireEvent.press(touchableOverlay);
    }
    unmount();

    // Render new instance
    render(<SeedPhraseReveal seedPhrase={mockSeedPhrase} />);

    // New instance should show overlay again
    expect(
      screen.getByText('Tap to reveal your Secret Recovery Phrase'),
    ).toBeTruthy();
  });

  it('renders seed phrase words after overlay is removed', () => {
    render(<SeedPhraseReveal seedPhrase={mockSeedPhrase} />);

    expect(
      screen.getByText('Tap to reveal your Secret Recovery Phrase'),
    ).toBeTruthy();

    const overlayText = screen.getByText(
      'Tap to reveal your Secret Recovery Phrase',
    );
    const touchableOverlay = overlayText.parent;

    if (touchableOverlay) {
      fireEvent.press(touchableOverlay);
    }

    expect(
      screen.queryByText('Tap to reveal your Secret Recovery Phrase'),
    ).toBeNull();

    expect(screen.getByText('1.')).toBeTruthy();
    expect(screen.getByText('2.')).toBeTruthy();
  });
});
