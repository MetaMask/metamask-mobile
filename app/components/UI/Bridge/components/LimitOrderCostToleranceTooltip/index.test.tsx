import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { renderScreen } from '../../../../../util/test/renderWithProvider';
import Routes from '../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../locales/i18n';
import { LimitOrderCostToleranceTooltip } from './index';
import { LimitOrderCostToleranceTooltipSelectorsIDs } from './testIds';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

describe('LimitOrderCostToleranceTooltip', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the tooltip button', () => {
    const { getByTestId } = renderScreen(
      () => <LimitOrderCostToleranceTooltip />,
      { name: Routes.BRIDGE.ROOT },
    );

    expect(
      getByTestId(LimitOrderCostToleranceTooltipSelectorsIDs.BUTTON),
    ).toBeOnTheScreen();
  });

  it('navigates to the cost tolerance info sheet within the Bridge modal stack when pressed', () => {
    const { getByTestId } = renderScreen(
      () => <LimitOrderCostToleranceTooltip />,
      { name: Routes.BRIDGE.ROOT },
    );

    fireEvent.press(
      getByTestId(LimitOrderCostToleranceTooltipSelectorsIDs.BUTTON),
    );

    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith(Routes.BRIDGE.MODALS.ROOT, {
      screen: Routes.BRIDGE.MODALS.LIMIT_ORDER_COST_TOLERANCE_INFO_MODAL,
    });
  });

  it('applies a custom testID when provided', () => {
    const { getByTestId, queryByTestId } = renderScreen(
      () => <LimitOrderCostToleranceTooltip testID="custom-tooltip" />,
      { name: Routes.BRIDGE.ROOT },
    );

    expect(getByTestId('custom-tooltip')).toBeOnTheScreen();
    expect(
      queryByTestId(LimitOrderCostToleranceTooltipSelectorsIDs.BUTTON),
    ).toBeNull();
  });

  it('has an accessibility label matching the cost tolerance title', () => {
    const { getByLabelText } = renderScreen(
      () => <LimitOrderCostToleranceTooltip />,
      { name: Routes.BRIDGE.ROOT },
    );

    expect(getByLabelText(strings('bridge.cost_tolerance'))).toBeOnTheScreen();
  });
});
