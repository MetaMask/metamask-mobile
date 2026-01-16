import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import PredictBetButtons from './PredictBetButtons';
import renderWithProvider from '../../../../../util/test/renderWithProvider';

const createDefaultProps = (overrides = {}) => ({
  yesLabel: 'Yes',
  yesPrice: 65,
  onYesPress: jest.fn(),
  noLabel: 'No',
  noPrice: 35,
  onNoPress: jest.fn(),
  testID: 'bet-buttons',
  ...overrides,
});

describe('PredictBetButtons', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders both yes and no buttons', () => {
      const props = createDefaultProps();

      renderWithProvider(<PredictBetButtons {...props} />);

      expect(screen.getByText('YES · 65¢')).toBeOnTheScreen();
      expect(screen.getByText('NO · 35¢')).toBeOnTheScreen();
    });

    it('renders with custom labels', () => {
      const props = createDefaultProps({
        yesLabel: 'SEA',
        noLabel: 'DEN',
      });

      renderWithProvider(<PredictBetButtons {...props} />);

      expect(screen.getByText('SEA · 65¢')).toBeOnTheScreen();
      expect(screen.getByText('DEN · 35¢')).toBeOnTheScreen();
    });

    it('renders with custom prices', () => {
      const props = createDefaultProps({
        yesPrice: 49,
        noPrice: 51,
      });

      renderWithProvider(<PredictBetButtons {...props} />);

      expect(screen.getByText('YES · 49¢')).toBeOnTheScreen();
      expect(screen.getByText('NO · 51¢')).toBeOnTheScreen();
    });

    it('renders with testID prefix for each button', () => {
      const props = createDefaultProps({ testID: 'custom-buttons' });

      renderWithProvider(<PredictBetButtons {...props} />);

      expect(screen.getByTestId('custom-buttons-yes')).toBeOnTheScreen();
      expect(screen.getByTestId('custom-buttons-no')).toBeOnTheScreen();
    });
  });

  describe('press handling', () => {
    it('calls onYesPress when yes button is pressed', () => {
      const mockOnYesPress = jest.fn();
      const props = createDefaultProps({ onYesPress: mockOnYesPress });

      renderWithProvider(<PredictBetButtons {...props} />);
      fireEvent.press(screen.getByTestId('bet-buttons-yes'));

      expect(mockOnYesPress).toHaveBeenCalledTimes(1);
    });

    it('calls onNoPress when no button is pressed', () => {
      const mockOnNoPress = jest.fn();
      const props = createDefaultProps({ onNoPress: mockOnNoPress });

      renderWithProvider(<PredictBetButtons {...props} />);
      fireEvent.press(screen.getByTestId('bet-buttons-no'));

      expect(mockOnNoPress).toHaveBeenCalledTimes(1);
    });

    it('does not call handlers when disabled', () => {
      const mockOnYesPress = jest.fn();
      const mockOnNoPress = jest.fn();
      const props = createDefaultProps({
        onYesPress: mockOnYesPress,
        onNoPress: mockOnNoPress,
        disabled: true,
      });

      renderWithProvider(<PredictBetButtons {...props} />);
      fireEvent.press(screen.getByTestId('bet-buttons-yes'));
      fireEvent.press(screen.getByTestId('bet-buttons-no'));

      expect(mockOnYesPress).not.toHaveBeenCalled();
      expect(mockOnNoPress).not.toHaveBeenCalled();
    });
  });

  describe('team colors', () => {
    it('renders with team colors when provided', () => {
      const props = createDefaultProps({
        yesLabel: 'SEA',
        noLabel: 'DEN',
        yesTeamColor: '#002244',
        noTeamColor: '#FB4F14',
      });

      renderWithProvider(<PredictBetButtons {...props} />);

      expect(screen.getByTestId('bet-buttons-yes')).toBeOnTheScreen();
      expect(screen.getByTestId('bet-buttons-no')).toBeOnTheScreen();
    });

    it('renders without team colors for standard markets', () => {
      const props = createDefaultProps();

      renderWithProvider(<PredictBetButtons {...props} />);

      expect(screen.getByTestId('bet-buttons-yes')).toBeOnTheScreen();
      expect(screen.getByTestId('bet-buttons-no')).toBeOnTheScreen();
    });
  });

  describe('edge cases', () => {
    it('renders with equal prices (50/50 market)', () => {
      const props = createDefaultProps({
        yesPrice: 50,
        noPrice: 50,
      });

      renderWithProvider(<PredictBetButtons {...props} />);

      expect(screen.getByText('YES · 50¢')).toBeOnTheScreen();
      expect(screen.getByText('NO · 50¢')).toBeOnTheScreen();
    });

    it('renders with extreme prices', () => {
      const props = createDefaultProps({
        yesPrice: 99,
        noPrice: 1,
      });

      renderWithProvider(<PredictBetButtons {...props} />);

      expect(screen.getByText('YES · 99¢')).toBeOnTheScreen();
      expect(screen.getByText('NO · 1¢')).toBeOnTheScreen();
    });
  });
});
