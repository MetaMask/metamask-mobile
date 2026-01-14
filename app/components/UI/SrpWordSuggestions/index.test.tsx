import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../util/test/renderWithProvider';
import SrpWordSuggestions from './index';

// Mock the BIP39 wordlist with a subset for testing
jest.mock('@metamask/scure-bip39/dist/wordlists/english', () => ({
  wordlist: [
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
    'account',
    'accuse',
    'achieve',
    'acid',
    'acoustic',
    'acquire',
    'across',
    'act',
  ],
}));

describe('SrpWordSuggestions', () => {
  const mockOnSuggestionSelect = jest.fn();
  const mockOnPressIn = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders nothing when currentInputWord is empty', () => {
      const { queryByText } = renderWithProvider(
        <SrpWordSuggestions
          currentInputWord=""
          onSuggestionSelect={mockOnSuggestionSelect}
        />,
      );

      expect(queryByText('abandon')).toBeNull();
    });

    it('renders nothing when currentInputWord is whitespace only', () => {
      const { queryByText } = renderWithProvider(
        <SrpWordSuggestions
          currentInputWord="   "
          onSuggestionSelect={mockOnSuggestionSelect}
        />,
      );

      expect(queryByText('abandon')).toBeNull();
    });

    it('renders suggestions when currentInputWord matches BIP39 words', () => {
      const { getByText } = renderWithProvider(
        <SrpWordSuggestions
          currentInputWord="ab"
          onSuggestionSelect={mockOnSuggestionSelect}
        />,
      );

      expect(getByText('abandon')).toBeOnTheScreen();
      expect(getByText('ability')).toBeOnTheScreen();
      expect(getByText('able')).toBeOnTheScreen();
      expect(getByText('about')).toBeOnTheScreen();
      expect(getByText('above')).toBeOnTheScreen();
    });

    it('limits suggestions to 5 words', () => {
      const { queryByText } = renderWithProvider(
        <SrpWordSuggestions
          currentInputWord="ab"
          onSuggestionSelect={mockOnSuggestionSelect}
        />,
      );

      expect(queryByText('abandon')).toBeOnTheScreen();
      expect(queryByText('ability')).toBeOnTheScreen();
      expect(queryByText('able')).toBeOnTheScreen();
      expect(queryByText('about')).toBeOnTheScreen();
      expect(queryByText('above')).toBeOnTheScreen();
      expect(queryByText('absent')).not.toBeOnTheScreen();
    });

    it('renders nothing when no words match', () => {
      const { queryByText } = renderWithProvider(
        <SrpWordSuggestions
          currentInputWord="xyz"
          onSuggestionSelect={mockOnSuggestionSelect}
        />,
      );

      expect(queryByText('abandon')).toBeNull();
    });

    it('handles case-insensitive matching', () => {
      const { getByText } = renderWithProvider(
        <SrpWordSuggestions
          currentInputWord="AB"
          onSuggestionSelect={mockOnSuggestionSelect}
        />,
      );

      expect(getByText('abandon')).toBeOnTheScreen();
    });

    it('trims input before matching', () => {
      const { getByText } = renderWithProvider(
        <SrpWordSuggestions
          currentInputWord="  ab  "
          onSuggestionSelect={mockOnSuggestionSelect}
        />,
      );

      expect(getByText('abandon')).toBeOnTheScreen();
    });
  });

  describe('interactions', () => {
    it('calls onSuggestionSelect when a suggestion is pressed', () => {
      const { getByText } = renderWithProvider(
        <SrpWordSuggestions
          currentInputWord="ab"
          onSuggestionSelect={mockOnSuggestionSelect}
        />,
      );

      fireEvent.press(getByText('abandon'));

      expect(mockOnSuggestionSelect).toHaveBeenCalledWith('abandon');
      expect(mockOnSuggestionSelect).toHaveBeenCalledTimes(1);
    });

    it('calls onPressIn when a suggestion press begins', () => {
      const { getByText } = renderWithProvider(
        <SrpWordSuggestions
          currentInputWord="ab"
          onSuggestionSelect={mockOnSuggestionSelect}
          onPressIn={mockOnPressIn}
        />,
      );

      const suggestionButton = getByText('abandon').parent;
      if (suggestionButton) {
        fireEvent(suggestionButton, 'pressIn');
      }

      expect(mockOnPressIn).toHaveBeenCalledTimes(1);
    });

    it('does not throw when onPressIn is not provided', () => {
      const { getByText } = renderWithProvider(
        <SrpWordSuggestions
          currentInputWord="ab"
          onSuggestionSelect={mockOnSuggestionSelect}
        />,
      );

      const suggestionButton = getByText('abandon').parent;
      if (suggestionButton) {
        fireEvent(suggestionButton, 'pressIn');
      }

      expect(getByText('abandon')).toBeOnTheScreen();
    });
  });

  describe('filtering', () => {
    it('shows exact match when available', () => {
      const { getByText } = renderWithProvider(
        <SrpWordSuggestions
          currentInputWord="able"
          onSuggestionSelect={mockOnSuggestionSelect}
        />,
      );

      expect(getByText('able')).toBeOnTheScreen();
    });

    it('filters correctly with single character input', () => {
      const { getByText, queryByText } = renderWithProvider(
        <SrpWordSuggestions
          currentInputWord="a"
          onSuggestionSelect={mockOnSuggestionSelect}
        />,
      );

      expect(getByText('abandon')).toBeOnTheScreen();
      expect(getByText('ability')).toBeOnTheScreen();
      expect(getByText('able')).toBeOnTheScreen();
      expect(getByText('about')).toBeOnTheScreen();
      expect(getByText('above')).toBeOnTheScreen();
      expect(queryByText('absent')).not.toBeOnTheScreen();
    });

    it('shows specific matches for longer prefixes', () => {
      const { getByText, queryByText } = renderWithProvider(
        <SrpWordSuggestions
          currentInputWord="acc"
          onSuggestionSelect={mockOnSuggestionSelect}
        />,
      );

      expect(getByText('access')).toBeOnTheScreen();
      expect(getByText('accident')).toBeOnTheScreen();
      expect(getByText('account')).toBeOnTheScreen();
      expect(getByText('accuse')).toBeOnTheScreen();
      expect(queryByText('abandon')).not.toBeOnTheScreen();
    });
  });
});
