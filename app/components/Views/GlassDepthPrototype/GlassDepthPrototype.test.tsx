import { fireEvent } from '@testing-library/react-native';

import { strings } from '../../../../locales/i18n';
import { renderScreen } from '../../../util/test/renderWithProvider';
import { backgroundState } from '../../../util/test/initial-root-state';
import GlassDepthPrototype from './GlassDepthPrototype';
import { GLASS_DEPTH_TEST_IDS } from './GlassDepthPrototype.constants';

const COPY = 'app_settings.developer_options.glass_depth';

const initialState = {
  engine: {
    backgroundState,
  },
};

describe('GlassDepthPrototype', () => {
  const renderPrototype = () =>
    renderScreen(
      GlassDepthPrototype,
      { name: 'GlassDepthPrototype' },
      { state: initialState },
    );

  it('starts on the flat page, with no layered surfaces', () => {
    const { getByTestId, getByText, queryByTestId } = renderPrototype();

    expect(getByTestId(GLASS_DEPTH_TEST_IDS.SCREEN)).toBeOnTheScreen();
    expect(getByText(strings(`${COPY}.flat_note`))).toBeOnTheScreen();
    expect(queryByTestId(GLASS_DEPTH_TEST_IDS.ACCENT)).toBeNull();
    expect(queryByTestId(GLASS_DEPTH_TEST_IDS.TOKEN_CARD)).toBeNull();
    expect(getByTestId(GLASS_DEPTH_TEST_IDS.TOKEN_LIST)).toBeOnTheScreen();
  });

  it('shows the sunken wash and opaque cards after switching to layered', () => {
    const { getByTestId, getByText, queryByTestId } = renderPrototype();

    fireEvent.press(getByText(strings(`${COPY}.layered`)));

    expect(getByTestId(GLASS_DEPTH_TEST_IDS.ACCENT)).toBeOnTheScreen();
    expect(getByTestId(GLASS_DEPTH_TEST_IDS.BALANCE_CARD)).toBeOnTheScreen();
    expect(getByTestId(GLASS_DEPTH_TEST_IDS.TOKEN_CARD)).toBeOnTheScreen();
    expect(queryByTestId(GLASS_DEPTH_TEST_IDS.TOKEN_LIST)).toBeNull();
    expect(getByText(strings(`${COPY}.layered_note`))).toBeOnTheScreen();
  });
});
