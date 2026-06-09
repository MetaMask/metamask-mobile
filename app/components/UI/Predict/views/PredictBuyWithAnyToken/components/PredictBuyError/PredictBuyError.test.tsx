import React from 'react';
import { screen } from '@testing-library/react-native';
import PredictBuyError from './PredictBuyError';
import renderWithProvider from '../../../../../../../util/test/renderWithProvider';

describe('PredictBuyError', () => {
  describe('when errorMessage is undefined', () => {
    it('renders nothing', () => {
      renderWithProvider(<PredictBuyError errorMessage={undefined} />);

      expect(screen.queryByText(/./)).not.toBeOnTheScreen();
    });
  });

  describe('when errorMessage is empty string', () => {
    it('renders nothing', () => {
      renderWithProvider(<PredictBuyError errorMessage="" />);

      expect(screen.queryByText(/./)).not.toBeOnTheScreen();
    });
  });

  describe('when errorMessage is provided', () => {
    it('displays the error message text', () => {
      const errorMessage = 'Insufficient balance';

      renderWithProvider(<PredictBuyError errorMessage={errorMessage} />);

      expect(screen.getByText(errorMessage)).toBeOnTheScreen();
    });

    it('renders error text with centered alignment and error color', () => {
      const errorMessage = 'Minimum bet required';

      renderWithProvider(<PredictBuyError errorMessage={errorMessage} />);

      const errorText = screen.getByText(errorMessage);
      expect(errorText).toBeOnTheScreen();
      expect(errorText.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ textAlign: 'center' }),
        ]),
      );
    });
  });

  describe('when no props provided', () => {
    it('renders nothing', () => {
      renderWithProvider(<PredictBuyError />);

      expect(screen.queryByText(/./)).not.toBeOnTheScreen();
    });
  });
});
