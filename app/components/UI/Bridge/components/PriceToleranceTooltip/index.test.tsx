import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { renderScreen } from '../../../../../util/test/renderWithProvider';
import Routes from '../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../locales/i18n';
import { PriceToleranceTooltip } from './index';
import { PriceToleranceTooltipSelectorsIDs } from './testIds';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

describe('PriceToleranceTooltip', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the cost tolerance label as the tooltip trigger', () => {
    const { getByTestId } = renderScreen(() => <PriceToleranceTooltip />, {
      name: Routes.BRIDGE.ROOT,
    });

    expect(
      getByTestId(PriceToleranceTooltipSelectorsIDs.BUTTON),
    ).toHaveTextContent(strings('bridge.cost_tolerance'));
  });

  it('navigates to the cost tolerance info sheet within the Bridge modal stack when pressed', () => {
    const { getByTestId } = renderScreen(() => <PriceToleranceTooltip />, {
      name: Routes.BRIDGE.ROOT,
    });

    fireEvent.press(getByTestId(PriceToleranceTooltipSelectorsIDs.BUTTON));

    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith(Routes.BRIDGE.MODALS.ROOT, {
      screen: Routes.BRIDGE.MODALS.LIMIT_ORDER_COST_TOLERANCE_INFO_MODAL,
    });
  });

  it('applies a custom testID when provided', () => {
    const { getByTestId, queryByTestId } = renderScreen(
      () => <PriceToleranceTooltip testID="custom-tooltip" />,
      { name: Routes.BRIDGE.ROOT },
    );

    expect(getByTestId('custom-tooltip')).toBeOnTheScreen();
    expect(queryByTestId(PriceToleranceTooltipSelectorsIDs.BUTTON)).toBeNull();
  });

  it('has an accessibility label matching the cost tolerance title', () => {
    const { getByLabelText } = renderScreen(() => <PriceToleranceTooltip />, {
      name: Routes.BRIDGE.ROOT,
    });

    expect(getByLabelText(strings('bridge.cost_tolerance'))).toBeOnTheScreen();
  });
});
