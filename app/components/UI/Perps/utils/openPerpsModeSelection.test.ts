import { PERPS_EVENT_VALUE } from '@metamask/perps-controller/constants';
import Routes from '../../../../constants/navigation/Routes';
import {
  openPerpsModeSelection,
  openPerpsModeSelectionIfNeeded,
} from './openPerpsModeSelection';

const mockHasCompletedPerpsModeSelection = jest.fn();
jest.mock('./perpsModeSelectionStorage', () => ({
  hasCompletedPerpsModeSelection: () => mockHasCompletedPerpsModeSelection(),
}));

describe('openPerpsModeSelection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHasCompletedPerpsModeSelection.mockResolvedValue(false);
  });

  it('navigates to the mode selection modal with defaults', () => {
    const navigate = jest.fn();

    openPerpsModeSelection({ navigate });

    expect(navigate).toHaveBeenCalledWith(Routes.PERPS.MODALS.ROOT, {
      screen: Routes.PERPS.MODALS.MODE_SELECTION,
      params: {
        entry: 'trade',
        source: PERPS_EVENT_VALUE.SOURCE.TRADE_MENU_ACTION,
      },
    });
  });

  it('forwards entry and source overrides', () => {
    const navigate = jest.fn();

    openPerpsModeSelection(
      { navigate },
      {
        entry: 'home',
        source: PERPS_EVENT_VALUE.SOURCE.PERPS_HOME,
      },
    );

    expect(navigate).toHaveBeenCalledWith(Routes.PERPS.MODALS.ROOT, {
      screen: Routes.PERPS.MODALS.MODE_SELECTION,
      params: {
        entry: 'home',
        source: PERPS_EVENT_VALUE.SOURCE.PERPS_HOME,
      },
    });
  });
});

describe('openPerpsModeSelectionIfNeeded', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('opens the chooser and returns true when selection is incomplete', async () => {
    mockHasCompletedPerpsModeSelection.mockResolvedValue(false);
    const navigate = jest.fn();

    const opened = await openPerpsModeSelectionIfNeeded(
      { navigate },
      {
        entry: 'home',
        source: PERPS_EVENT_VALUE.SOURCE.PERPS_HOME,
      },
    );

    expect(opened).toBe(true);
    expect(navigate).toHaveBeenCalledWith(Routes.PERPS.MODALS.ROOT, {
      screen: Routes.PERPS.MODALS.MODE_SELECTION,
      params: {
        entry: 'home',
        source: PERPS_EVENT_VALUE.SOURCE.PERPS_HOME,
      },
    });
  });

  it('skips the chooser and returns false when selection is already completed', async () => {
    mockHasCompletedPerpsModeSelection.mockResolvedValue(true);
    const navigate = jest.fn();

    const opened = await openPerpsModeSelectionIfNeeded(
      { navigate },
      {
        entry: 'market',
        source: PERPS_EVENT_VALUE.SOURCE.PERP_ASSET_SCREEN,
      },
    );

    expect(opened).toBe(false);
    expect(navigate).not.toHaveBeenCalled();
  });
});
