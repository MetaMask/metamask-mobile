import { renderScreen } from '../../../util/test/renderWithProvider';
import Onboarding from './';
import { backgroundState } from '../../../util/test/initial-root-state';
import { OnboardingSelectorIDs } from '../../../../e2e/selectors/Onboarding/Onboarding.selectors';
import { fireEvent } from '@testing-library/react-native';
// eslint-disable-next-line import/no-namespace
import * as traceObj from '../../../util/trace';

const mockInitialState = {
  engine: {
    backgroundState: {
      ...backgroundState,
    },
  },
};

describe('Onboarding', () => {
  it('should render correctly', () => {
    const { toJSON } = renderScreen(
      Onboarding,
      { name: 'Onboarding' },
      {
        state: mockInitialState,
      },
    );
    expect(toJSON()).toMatchSnapshot();
  });
  it('must call trace when press start', () => {
    const spyFetch = jest
      .spyOn(traceObj, 'trace')
      .mockImplementation(() => undefined);
    const { getByTestId } = renderScreen(
      Onboarding,
      { name: 'Onboarding' },
      {
        state: mockInitialState,
      },
    );

    const startButton = getByTestId(OnboardingSelectorIDs.NEW_WALLET_BUTTON);
    fireEvent.press(startButton);
    expect(spyFetch).toHaveBeenCalledTimes(1);
  });
});
