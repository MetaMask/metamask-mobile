import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import MoneyHeader from './MoneyHeader';
import { MoneyHeaderTestIds } from './MoneyHeader.testIds';
import { strings } from '../../../../../../locales/i18n';
import { useProSubscriptionEnabled } from '../../../../../hooks/useProSubscriptionEnabled';
import { useIsProSubscriber } from '../../../../../hooks/useIsProSubscriber';

jest.mock('../../../../../hooks/useProSubscriptionEnabled');
jest.mock('../../../../../hooks/useIsProSubscriber');

const mockUseProSubscriptionEnabled = jest.mocked(useProSubscriptionEnabled);
const mockUseIsProSubscriber = jest.mocked(useIsProSubscriber);

describe('MoneyHeader', () => {
  beforeEach(() => {
    mockUseProSubscriptionEnabled.mockReturnValue({
      isProSubscriptionEnabled: false,
      variantName: 'control',
      isActive: false,
    });
    mockUseIsProSubscriber.mockReturnValue(false);
  });

  it('renders the menu button', () => {
    const { getByTestId } = render(
      <MoneyHeader onMenuPress={jest.fn()} onGetProPress={jest.fn()} />,
    );

    expect(getByTestId(MoneyHeaderTestIds.MENU_BUTTON)).toBeOnTheScreen();
  });

  it('renders the Money title alongside the menu button', () => {
    const { getByTestId } = render(
      <MoneyHeader onMenuPress={jest.fn()} onGetProPress={jest.fn()} />,
    );

    expect(getByTestId(MoneyHeaderTestIds.TITLE)).toHaveTextContent(
      strings('money.title'),
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

  describe('back button', () => {
    it('is not rendered without an onBack handler', () => {
      const { queryByTestId } = render(
        <MoneyHeader onMenuPress={jest.fn()} onGetProPress={jest.fn()} />,
      );

      expect(
        queryByTestId(MoneyHeaderTestIds.BACK_BUTTON),
      ).not.toBeOnTheScreen();
    });

    it('is rendered with an onBack handler', () => {
      const { getByTestId } = render(
        <MoneyHeader
          onMenuPress={jest.fn()}
          onGetProPress={jest.fn()}
          onBack={jest.fn()}
        />,
      );

      expect(getByTestId(MoneyHeaderTestIds.BACK_BUTTON)).toBeOnTheScreen();
    });

    it('calls onBack when pressed', () => {
      const mockOnBack = jest.fn();
      const { getByTestId } = render(
        <MoneyHeader
          onMenuPress={jest.fn()}
          onGetProPress={jest.fn()}
          onBack={mockOnBack}
        />,
      );

      fireEvent.press(getByTestId(MoneyHeaderTestIds.BACK_BUTTON));

      expect(mockOnBack).toHaveBeenCalledTimes(1);
    });

    it('keeps the Money title and the menu button alongside it', () => {
      const { getByTestId } = render(
        <MoneyHeader
          onMenuPress={jest.fn()}
          onGetProPress={jest.fn()}
          onBack={jest.fn()}
        />,
      );

      expect(getByTestId(MoneyHeaderTestIds.TITLE)).toHaveTextContent(
        strings('money.title'),
      );
      expect(getByTestId(MoneyHeaderTestIds.MENU_BUTTON)).toBeOnTheScreen();
    });
  });

  describe('Pro button', () => {
    it('is not shown when the Pro subscription flag is disabled', () => {
      mockUseProSubscriptionEnabled.mockReturnValue({
        isProSubscriptionEnabled: false,
        variantName: 'control',
        isActive: false,
      });

      const { queryByTestId } = render(
        <MoneyHeader onMenuPress={jest.fn()} onGetProPress={jest.fn()} />,
      );

      expect(
        queryByTestId(MoneyHeaderTestIds.GET_PRO_BUTTON),
      ).not.toBeOnTheScreen();
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

    it('invites the user to join when they are not subscribed', () => {
      mockUseProSubscriptionEnabled.mockReturnValue({
        isProSubscriptionEnabled: true,
        variantName: 'treatment',
        isActive: true,
      });
      mockUseIsProSubscriber.mockReturnValue(false);

      const { getByTestId, getByLabelText } = render(
        <MoneyHeader onMenuPress={jest.fn()} onGetProPress={jest.fn()} />,
      );

      expect(getByTestId(MoneyHeaderTestIds.GET_PRO_BUTTON)).toHaveTextContent(
        strings('pro_subscription.join_pro'),
      );
      expect(
        getByLabelText(strings('pro_subscription.join_pro')),
      ).toBeOnTheScreen();
    });

    it('shows the Pro label when the user is already subscribed', () => {
      mockUseProSubscriptionEnabled.mockReturnValue({
        isProSubscriptionEnabled: true,
        variantName: 'treatment',
        isActive: true,
      });
      mockUseIsProSubscriber.mockReturnValue(true);

      const { getByTestId, getByLabelText } = render(
        <MoneyHeader onMenuPress={jest.fn()} onGetProPress={jest.fn()} />,
      );

      expect(getByTestId(MoneyHeaderTestIds.GET_PRO_BUTTON)).toHaveTextContent(
        strings('pro_subscription.pro'),
      );
      expect(getByLabelText(strings('pro_subscription.pro'))).toBeOnTheScreen();
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
