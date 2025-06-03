import { renderScreen } from '../../../util/test/renderWithProvider';
import Onboarding from './';
import { backgroundState } from '../../../util/test/initial-root-state';
import Device from '../../../util/device';
import { fireEvent } from '@testing-library/react-native';
import { OnboardingSelectorIDs } from '../../../../e2e/selectors/Onboarding/Onboarding.selectors';

const mockInitialState = {
  engine: {
    backgroundState: {
      ...backgroundState,
    },
  },
};

jest.mock('../../../util/device', () => ({
  isLargeDevice: jest.fn(),
  isIphoneX: jest.fn(),
  isAndroid: jest.fn(),
  isIos: jest.fn(),
}));

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

  it('should render correctly with large device and iphoneX', () => {
    (Device.isLargeDevice as jest.Mock).mockReturnValue(true);
    (Device.isIphoneX as jest.Mock).mockReturnValue(true);
    (Device.isAndroid as jest.Mock).mockReturnValue(false);
    (Device.isIos as jest.Mock).mockReturnValue(true);

    const { toJSON } = renderScreen(
      Onboarding,
      { name: 'Onboarding' },
      {
        state: mockInitialState,
      },
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('should render correctly with android', () => {
    (Device.isAndroid as jest.Mock).mockReturnValue(true);
    (Device.isIos as jest.Mock).mockReturnValue(false);
    (Device.isLargeDevice as jest.Mock).mockReturnValue(false);
    (Device.isIphoneX as jest.Mock).mockReturnValue(false);

    const { toJSON } = renderScreen(
      Onboarding,
      { name: 'Onboarding' },
      {
        state: mockInitialState,
      },
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('should click on create wallet button', () => {
    (Device.isAndroid as jest.Mock).mockReturnValue(true);
    (Device.isIos as jest.Mock).mockReturnValue(false);
    (Device.isLargeDevice as jest.Mock).mockReturnValue(false);
    (Device.isIphoneX as jest.Mock).mockReturnValue(false);

    const { getByTestId } = renderScreen(
      Onboarding,
      { name: 'Onboarding' },
      {
        state: mockInitialState,
      },
    );

    const createWalletButton = getByTestId(
      OnboardingSelectorIDs.NEW_WALLET_BUTTON,
    );
    fireEvent.press(createWalletButton);
  });

  it('should click on import seed button', () => {
    (Device.isAndroid as jest.Mock).mockReturnValue(true);
    (Device.isIos as jest.Mock).mockReturnValue(false);
    (Device.isLargeDevice as jest.Mock).mockReturnValue(false);
    (Device.isIphoneX as jest.Mock).mockReturnValue(false);

    const { getByTestId } = renderScreen(
      Onboarding,
      { name: 'Onboarding' },
      {
        state: mockInitialState,
      },
    );

    const importSeedButton = getByTestId(
      OnboardingSelectorIDs.IMPORT_SEED_BUTTON,
    );
    fireEvent.press(importSeedButton);
  });
});
