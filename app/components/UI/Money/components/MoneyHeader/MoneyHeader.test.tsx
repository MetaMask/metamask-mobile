import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import MoneyHeader from './MoneyHeader';
import { MoneyHeaderTestIds } from './MoneyHeader.testIds';
import { strings } from '../../../../../../locales/i18n';
import { useProSubscriptionEnabled } from '../../../../../hooks/useProSubscriptionEnabled';

jest.mock('../../../../../hooks/useProSubscriptionEnabled');

const mockUseProSubscriptionEnabled = jest.mocked(useProSubscriptionEnabled);

describe('MoneyHeader', () => {
  beforeEach(() => {
    mockUseProSubscriptionEnabled.mockReturnValue({
      isProSubscriptionEnabled: false,
      variantName: 'control',
      isActive: false,
    });
  });

  it('renders the menu button', () => {
    const { getByTestId } = render(
      <MoneyHeader onMenuPress={jest.fn()} onGetProPress={jest.fn()} />,
    );

    expect(getByTestId(MoneyHeaderTestIds.MENU_BUTTON)).toBeOnTheScreen();
  });

  it('calls onMenuPress when the menu button is pressed', () => {
    const mockOnMenuPress = jest.fn();
    const { getByTestId } = render(
      <MoneyHeader onMenuPress={mockOnMenuPress} onGetProPress={jest.fn()} />,
    );

    fireEvent.press(getByTestId(MoneyHeaderTestIds.MENU_BUTTON));

    expect(mockOnMenuPress).toHaveBeenCalledTimes(1);
  });

  it('uses the same horizontal padding as the Home page header', () => {
    const { getByTestId } = render(
      <MoneyHeader onMenuPress={jest.fn()} onGetProPress={jest.fn()} />,
    );

    expect(getByTestId(MoneyHeaderTestIds.CONTAINER)).toHaveStyle({
      paddingLeft: 16,
      paddingRight: 12,
    });
  });

  describe('"Get Pro" button', () => {
    it('is not shown when the Pro subscription flag is disabled', () => {
      mockUseProSubscriptionEnabled.mockReturnValue({
        isProSubscriptionEnabled: false,
        variantName: 'control',
        isActive: false,
      });

      const { queryByTestId } = render(
        <MoneyHeader onMenuPress={jest.fn()} onGetProPress={jest.fn()} />,
      );

      expect(queryByTestId(MoneyHeaderTestIds.GET_PRO_BUTTON)).toBeNull();
    });

    it('is shown when the Pro subscription flag is enabled', () => {
      mockUseProSubscriptionEnabled.mockReturnValue({
        isProSubscriptionEnabled: true,
        variantName: 'treatment',
        isActive: true,
      });

      const { getByTestId } = render(
        <MoneyHeader onMenuPress={jest.fn()} onGetProPress={jest.fn()} />,
      );

      expect(getByTestId(MoneyHeaderTestIds.GET_PRO_BUTTON)).toBeOnTheScreen();
    });

    it('displays the correct label when shown', () => {
      mockUseProSubscriptionEnabled.mockReturnValue({
        isProSubscriptionEnabled: true,
        variantName: 'treatment',
        isActive: true,
      });

      const { getByTestId } = render(
        <MoneyHeader onMenuPress={jest.fn()} onGetProPress={jest.fn()} />,
      );

      expect(getByTestId(MoneyHeaderTestIds.GET_PRO_BUTTON)).toHaveTextContent(
        strings('money.get_pro'),
      );
    });

    it('calls onGetProPress when pressed', () => {
      mockUseProSubscriptionEnabled.mockReturnValue({
        isProSubscriptionEnabled: true,
        variantName: 'treatment',
        isActive: true,
      });

      const mockOnGetProPress = jest.fn();
      const { getByTestId } = render(
        <MoneyHeader
          onMenuPress={jest.fn()}
          onGetProPress={mockOnGetProPress}
        />,
      );

      fireEvent.press(getByTestId(MoneyHeaderTestIds.GET_PRO_BUTTON));

      expect(mockOnGetProPress).toHaveBeenCalledTimes(1);
    });
  });
});
