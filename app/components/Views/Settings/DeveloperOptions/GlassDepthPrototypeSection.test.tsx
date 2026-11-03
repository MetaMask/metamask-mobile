import React from 'react';
import { fireEvent } from '@testing-library/react-native';

import Routes from '../../../../constants/navigation/Routes';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../util/test/initial-root-state';
import GlassDepthPrototypeSection, {
  GLASS_DEPTH_OPEN_TEST_ID,
} from './GlassDepthPrototypeSection';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate }),
}));

describe('GlassDepthPrototypeSection', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it('opens the glass depth prototype', () => {
    const { getByTestId } = renderWithProvider(<GlassDepthPrototypeSection />, {
      state: { engine: { backgroundState } },
    });

    fireEvent.press(getByTestId(GLASS_DEPTH_OPEN_TEST_ID));

    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.SETTINGS.GLASS_DEPTH_PROTOTYPE,
    );
  });
});
