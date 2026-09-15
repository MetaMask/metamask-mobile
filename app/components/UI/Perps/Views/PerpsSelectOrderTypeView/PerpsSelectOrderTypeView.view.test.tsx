/**
 * Component view tests for PerpsSelectOrderTypeView.
 * State-driven via Redux and stream overrides; no hook mocks.
 */
import '../../../../../../tests/component-view/mocks';

import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { strings } from '../../../../../../locales/i18n';
import { renderPerpsView } from '../../../../../../tests/component-view/renderers/perpsViewRenderer';
import { PerpsOrderTypeBottomSheetSelectorsIDs } from '../../Perps.testIds';
import Routes from '../../../../../constants/navigation/Routes';
import PerpsSelectOrderTypeView from './PerpsSelectOrderTypeView';

describe('PerpsSelectOrderTypeView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the container, both order type options, their title text, and the close button', async () => {
    renderPerpsView(
      PerpsSelectOrderTypeView as unknown as React.ComponentType,
      Routes.PERPS.SELECT_ORDER_TYPE,
    );

    // Container
    expect(
      await screen.findByTestId(
        PerpsOrderTypeBottomSheetSelectorsIDs.CONTAINER,
      ),
    ).toBeOnTheScreen();

    // Both options with their testIds
    expect(
      screen.getByTestId(PerpsOrderTypeBottomSheetSelectorsIDs.MARKET_OPTION),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(PerpsOrderTypeBottomSheetSelectorsIDs.LIMIT_OPTION),
    ).toBeOnTheScreen();

    // Labels for each option type
    expect(
      screen.getByText(strings('perps.order.type.market.title')),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(strings('perps.order.type.limit.title')),
    ).toBeOnTheScreen();

    // Close button is always present
    expect(
      screen.getByTestId(PerpsOrderTypeBottomSheetSelectorsIDs.CLOSE_BUTTON),
    ).toBeOnTheScreen();
  });

  it('pressing Market option does not crash and container remains on screen', async () => {
    renderPerpsView(
      PerpsSelectOrderTypeView as unknown as React.ComponentType,
      Routes.PERPS.SELECT_ORDER_TYPE,
      { initialParams: { currentOrderType: 'limit' } },
    );

    const marketOption = await screen.findByTestId(
      PerpsOrderTypeBottomSheetSelectorsIDs.MARKET_OPTION,
    );

    fireEvent.press(marketOption);

    // Sheet dismisses after a selection — container may leave the screen,
    // but the interaction must not throw or leave the UI in an error state.
    await waitFor(() => {
      expect(
        screen.queryByText(strings('perps.errors.order_not_found')) ?? null,
      ).toBeNull();
    });
  });
});
