import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import MoneyHeader from './MoneyHeader';
import { MoneyHeaderTestIds } from './MoneyHeader.testIds';
import { strings } from '../../../../../../locales/i18n';
import {
  MoneyAccountPlusAccess,
  useMoneyAccountPlusAccess,
} from '../../../../../hooks/useMoneyAccountPlusAccess';

jest.mock('../../../../../hooks/useMoneyAccountPlusAccess', () => ({
  ...jest.requireActual('../../../../../hooks/useMoneyAccountPlusAccess'),
  useMoneyAccountPlusAccess: jest.fn(),
}));

const mockUseMoneyAccountPlusAccess = jest.mocked(useMoneyAccountPlusAccess);

const renderMoneyHeader = (
  props: Partial<React.ComponentProps<typeof MoneyHeader>> = {},
) =>
  render(
    <MoneyHeader
      onMenuPress={jest.fn()}
      onGetProPress={jest.fn()}
      onProHubPress={jest.fn()}
      {...props}
    />,
  );

describe('MoneyHeader', () => {
  beforeEach(() => {
    mockUseMoneyAccountPlusAccess.mockReturnValue(
      MoneyAccountPlusAccess.Disabled,
    );
  });

  it('renders the menu button', () => {
    const { getByTestId } = renderMoneyHeader();

    expect(getByTestId(MoneyHeaderTestIds.MENU_BUTTON)).toBeOnTheScreen();
  });

  it('renders the Money title alongside the menu button', () => {
    const { getByTestId } = renderMoneyHeader();

    expect(getByTestId(MoneyHeaderTestIds.TITLE)).toHaveTextContent(
      strings('money.title'),
    );

    expect(getByTestId(MoneyHeaderTestIds.MENU_BUTTON)).toBeOnTheScreen();
  });

  it('calls onMenuPress when the menu button is pressed', () => {
    const mockOnMenuPress = jest.fn();
    const { getByTestId } = renderMoneyHeader({
      onMenuPress: mockOnMenuPress,
    });

    fireEvent.press(getByTestId(MoneyHeaderTestIds.MENU_BUTTON));

    expect(mockOnMenuPress).toHaveBeenCalledTimes(1);
  });

  it('uses the same horizontal padding as the Home page header', () => {
    const { getByTestId } = renderMoneyHeader();

    expect(getByTestId(MoneyHeaderTestIds.CONTAINER)).toHaveStyle({
      paddingLeft: 16,
      paddingRight: 12,
    });
  });

  describe('"Join Pro" button', () => {
    it('is not shown when Pro access is disabled', () => {
      mockUseMoneyAccountPlusAccess.mockReturnValue(
        MoneyAccountPlusAccess.Disabled,
      );

      const { queryByTestId } = renderMoneyHeader();

      expect(
        queryByTestId(MoneyHeaderTestIds.GET_PRO_BUTTON),
      ).not.toBeOnTheScreen();
    });

    it('is not shown while entitlements are loading', () => {
      mockUseMoneyAccountPlusAccess.mockReturnValue(
        MoneyAccountPlusAccess.Loading,
      );

      const { queryByTestId } = renderMoneyHeader();

      expect(
        queryByTestId(MoneyHeaderTestIds.GET_PRO_BUTTON),
      ).not.toBeOnTheScreen();
      expect(
        queryByTestId(MoneyHeaderTestIds.PRO_HUB_BUTTON),
      ).not.toBeOnTheScreen();
    });

    it('is shown with the Join Pro label for an eligible non-subscriber', () => {
      mockUseMoneyAccountPlusAccess.mockReturnValue(
        MoneyAccountPlusAccess.Eligible,
      );

      const { getByTestId } = renderMoneyHeader();

      expect(getByTestId(MoneyHeaderTestIds.GET_PRO_BUTTON)).toHaveTextContent(
        strings('pro_subscription.join_pro'),
      );
    });

    it('calls onGetProPress when pressed', () => {
      mockUseMoneyAccountPlusAccess.mockReturnValue(
        MoneyAccountPlusAccess.Eligible,
      );
      const mockOnGetProPress = jest.fn();

      const { getByTestId } = renderMoneyHeader({
        onGetProPress: mockOnGetProPress,
      });

      fireEvent.press(getByTestId(MoneyHeaderTestIds.GET_PRO_BUTTON));

      expect(mockOnGetProPress).toHaveBeenCalledTimes(1);
    });
  });

  describe('"Pro" button', () => {
    it('replaces the upsell for an entitled subscriber', () => {
      mockUseMoneyAccountPlusAccess.mockReturnValue(
        MoneyAccountPlusAccess.Subscriber,
      );

      const { getByTestId, queryByTestId } = renderMoneyHeader();

      expect(getByTestId(MoneyHeaderTestIds.PRO_HUB_BUTTON)).toHaveTextContent(
        strings('pro_subscription.view_pro'),
      );
      expect(
        queryByTestId(MoneyHeaderTestIds.GET_PRO_BUTTON),
      ).not.toBeOnTheScreen();
    });

    it('calls onProHubPress when pressed', () => {
      mockUseMoneyAccountPlusAccess.mockReturnValue(
        MoneyAccountPlusAccess.Subscriber,
      );
      const mockOnProHubPress = jest.fn();

      const { getByTestId } = renderMoneyHeader({
        onProHubPress: mockOnProHubPress,
      });

      fireEvent.press(getByTestId(MoneyHeaderTestIds.PRO_HUB_BUTTON));

      expect(mockOnProHubPress).toHaveBeenCalledTimes(1);
    });
  });
});
