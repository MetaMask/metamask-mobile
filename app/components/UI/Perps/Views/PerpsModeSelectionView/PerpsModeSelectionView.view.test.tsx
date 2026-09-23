/**
 * Component view tests for PerpsModeSelectionView.
 * State-driven via Redux and stream overrides; no hook mocks.
 */
import '../../../../../../tests/component-view/mocks';

import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import Engine from '../../../../../core/Engine';
import { strings } from '../../../../../../locales/i18n';
import { renderPerpsView } from '../../../../../../tests/component-view/renderers/perpsViewRenderer';
import { PerpsModeSelectionBottomSheetSelectorsIDs } from '../../Perps.testIds';
import Routes from '../../../../../constants/navigation/Routes';
import PerpsModeSelectionView from './PerpsModeSelectionView';

describe('PerpsModeSelectionView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the sheet with title, subtitle, and both Lite and Pro options', async () => {
    renderPerpsView(
      PerpsModeSelectionView as unknown as React.ComponentType,
      Routes.PERPS.MODALS.MODE_SELECTION,
    );

    // Title and subtitle
    expect(
      await screen.findByText(strings('perps.mode.selection_title')),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(strings('perps.mode.selection_subtitle')),
    ).toBeOnTheScreen();

    // Both mode options present
    expect(screen.getByText(strings('perps.mode.lite'))).toBeOnTheScreen();
    expect(screen.getByText(strings('perps.mode.pro'))).toBeOnTheScreen();

    // Sheet container
    expect(
      screen.getByTestId(PerpsModeSelectionBottomSheetSelectorsIDs.CONTAINER),
    ).toBeOnTheScreen();
  });

  it('pressing Lite calls setPerpsMode with "lite"', async () => {
    const setPerpsMode = jest.mocked(
      Engine.context.PerpsController.setPerpsMode,
    );

    renderPerpsView(
      PerpsModeSelectionView as unknown as React.ComponentType,
      Routes.PERPS.MODALS.MODE_SELECTION,
      { initialParams: { entry: 'home' } },
    );

    fireEvent.press(
      await screen.findByTestId(
        PerpsModeSelectionBottomSheetSelectorsIDs.LITE_OPTION,
      ),
    );

    await waitFor(() => {
      expect(setPerpsMode).toHaveBeenCalledWith('lite');
    });
    expect(setPerpsMode).toHaveBeenCalledTimes(1);
  });

  it('pressing Pro calls setPerpsMode with "pro"', async () => {
    const setPerpsMode = jest.mocked(
      Engine.context.PerpsController.setPerpsMode,
    );

    renderPerpsView(
      PerpsModeSelectionView as unknown as React.ComponentType,
      Routes.PERPS.MODALS.MODE_SELECTION,
      { initialParams: { entry: 'home' } },
    );

    fireEvent.press(
      await screen.findByTestId(
        PerpsModeSelectionBottomSheetSelectorsIDs.PRO_OPTION,
      ),
    );

    await waitFor(() => {
      expect(setPerpsMode).toHaveBeenCalledWith('pro');
    });
    expect(setPerpsMode).toHaveBeenCalledTimes(1);
  });
});
