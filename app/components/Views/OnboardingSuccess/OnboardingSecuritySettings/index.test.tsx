import React from 'react';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { selectUseSafeChainsListValidation } from '../../../../selectors/preferencesController';
import { selectSeedlessOnboardingAuthConnection } from '../../../../selectors/seedlessOnboardingController';
import { AuthConnection } from '@metamask/seedless-onboarding-controller';
import OnboardingSecuritySettings from './';

const mockUseMetrics = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: jest.fn(),
}));

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

jest.mock('../../../../util/networks', () => ({
  toggleUseSafeChainsListValidation: jest.fn(),
}));

jest.mock(
  '../../Settings/SecuritySettings/Sections/MetaMetricsAndDataCollectionSection/MetaMetricsAndDataCollectionSection',
  () => ({
    __esModule: true,
    default: jest.fn(() => null),
  }),
);

jest.mock(
  '../../Settings/SecuritySettings/Sections/DeleteMetaMetricsData',
  () => ({
    __esModule: true,
    default: jest.fn(() => null),
  }),
);

jest.mock('../../../hooks/useMetrics', () => ({
  useMetrics: () => mockUseMetrics(),
}));

describe('OnboardingSecuritySettings', () => {
  const mockNavigation = {
    goBack: jest.fn(),
    setOptions: jest.fn(),
    navigate: jest.fn(),
  };

  const mockMetaMetricsAndDataCollectionSection = jest.requireMock(
    '../../Settings/SecuritySettings/Sections/MetaMetricsAndDataCollectionSection/MetaMetricsAndDataCollectionSection',
  ).default;
  const mockDeleteMetaMetricsData = jest.requireMock(
    '../../Settings/SecuritySettings/Sections/DeleteMetaMetricsData',
  ).default;

  beforeEach(() => {
    jest.clearAllMocks();
    (useNavigation as jest.Mock).mockReturnValue(mockNavigation);
    mockMetaMetricsAndDataCollectionSection.mockReturnValue(null);
    mockDeleteMetaMetricsData.mockReturnValue(null);
    mockUseMetrics.mockReturnValue({
      isEnabled: jest.fn(() => false),
    });
  });

  describe('Basic rendering', () => {
    it('should render correctly with no auth connection', () => {
      (useSelector as jest.Mock).mockImplementation((selector) => {
        if (selector === selectUseSafeChainsListValidation) return false;
        if (selector === selectSeedlessOnboardingAuthConnection) return null;
        return null;
      });
      const { toJSON } = renderWithProvider(<OnboardingSecuritySettings />);
      expect(toJSON()).toMatchSnapshot();
    });

    it('should always render NetworkDetailsCheckSettings regardless of auth connection', () => {
      (useSelector as jest.Mock).mockImplementation((selector) => {
        if (selector === selectUseSafeChainsListValidation) return false;
        if (selector === selectSeedlessOnboardingAuthConnection) return null;
        return null;
      });
      const { getByTestId } = renderWithProvider(
        <OnboardingSecuritySettings />,
      );
      expect(getByTestId('use-chains-list-validation')).toBeTruthy();
    });
  });

  describe('Social login detection and conditional rendering', () => {
    it('should render security sections when auth connection is Google', () => {
      (useSelector as jest.Mock).mockImplementation((selector) => {
        if (selector === selectUseSafeChainsListValidation) return false;
        if (selector === selectSeedlessOnboardingAuthConnection)
          return AuthConnection.Google;
        return null;
      });

      renderWithProvider(<OnboardingSecuritySettings />);

      expect(mockMetaMetricsAndDataCollectionSection).toHaveBeenCalledWith(
        expect.objectContaining({ hideMarketingSection: true }),
        expect.anything(),
      );
      expect(mockDeleteMetaMetricsData).toHaveBeenCalledWith(
        expect.objectContaining({ metricsOptin: false }),
        expect.anything(),
      );
    });

    it('should render security sections when auth connection is Apple', () => {
      (useSelector as jest.Mock).mockImplementation((selector) => {
        if (selector === selectUseSafeChainsListValidation) return false;
        if (selector === selectSeedlessOnboardingAuthConnection)
          return AuthConnection.Apple;
        return null;
      });

      renderWithProvider(<OnboardingSecuritySettings />);

      expect(mockMetaMetricsAndDataCollectionSection).toHaveBeenCalledWith(
        expect.objectContaining({ hideMarketingSection: true }),
        expect.anything(),
      );
      expect(mockDeleteMetaMetricsData).toHaveBeenCalledWith(
        expect.objectContaining({ metricsOptin: false }),
        expect.anything(),
      );
    });

    it('should NOT render security sections when auth connection is null', () => {
      (useSelector as jest.Mock).mockImplementation((selector) => {
        if (selector === selectUseSafeChainsListValidation) return false;
        if (selector === selectSeedlessOnboardingAuthConnection) return null;
        return null;
      });

      renderWithProvider(<OnboardingSecuritySettings />);

      expect(mockMetaMetricsAndDataCollectionSection).not.toHaveBeenCalled();
      expect(mockDeleteMetaMetricsData).not.toHaveBeenCalled();
    });

    it('should NOT render security sections when auth connection is undefined', () => {
      (useSelector as jest.Mock).mockImplementation((selector) => {
        if (selector === selectUseSafeChainsListValidation) return false;
        if (selector === selectSeedlessOnboardingAuthConnection)
          return undefined;
        return null;
      });

      renderWithProvider(<OnboardingSecuritySettings />);

      expect(mockMetaMetricsAndDataCollectionSection).not.toHaveBeenCalled();
      expect(mockDeleteMetaMetricsData).not.toHaveBeenCalled();
    });

    it('should NOT render security sections for non-social login auth connections', () => {
      (useSelector as jest.Mock).mockImplementation((selector) => {
        if (selector === selectUseSafeChainsListValidation) return false;
        if (selector === selectSeedlessOnboardingAuthConnection)
          return 'OTHER_AUTH_TYPE';
        return null;
      });

      renderWithProvider(<OnboardingSecuritySettings />);

      expect(mockMetaMetricsAndDataCollectionSection).not.toHaveBeenCalled();
      expect(mockDeleteMetaMetricsData).not.toHaveBeenCalled();
    });
  });

  describe('Component props validation', () => {
    beforeEach(() => {
      (useSelector as jest.Mock).mockImplementation((selector) => {
        if (selector === selectUseSafeChainsListValidation) return false;
        if (selector === selectSeedlessOnboardingAuthConnection)
          return AuthConnection.Google;
        return null;
      });
    });

    it('should pass hideMarketingSection=true to MetaMetricsAndDataCollectionSection', () => {
      renderWithProvider(<OnboardingSecuritySettings />);

      expect(mockMetaMetricsAndDataCollectionSection).toHaveBeenCalledWith(
        expect.objectContaining({ hideMarketingSection: true }),
        expect.anything(),
      );
    });

    it('should pass metricsOptin=false to DeleteMetaMetricsData by default', () => {
      renderWithProvider(<OnboardingSecuritySettings />);

      expect(mockDeleteMetaMetricsData).toHaveBeenCalledWith(
        expect.objectContaining({ metricsOptin: false }),
        expect.anything(),
      );
    });

    it('should pass correct analyticsEnabled state to DeleteMetaMetricsData', () => {
      renderWithProvider(<OnboardingSecuritySettings />);

      expect(mockDeleteMetaMetricsData).toHaveBeenCalledWith(
        expect.objectContaining({ metricsOptin: expect.any(Boolean) }),
        expect.anything(),
      );
    });
  });

  describe('Selector usage', () => {
    it('should call selectSeedlessOnboardingAuthConnection selector', () => {
      (useSelector as jest.Mock).mockImplementation((selector) => {
        if (selector === selectUseSafeChainsListValidation) return false;
        if (selector === selectSeedlessOnboardingAuthConnection)
          return AuthConnection.Google;
        return null;
      });

      renderWithProvider(<OnboardingSecuritySettings />);

      expect(useSelector).toHaveBeenCalledWith(
        selectSeedlessOnboardingAuthConnection,
      );
    });

    it('should call selectUseSafeChainsListValidation selector', () => {
      (useSelector as jest.Mock).mockImplementation((selector) => {
        if (selector === selectUseSafeChainsListValidation) return false;
        if (selector === selectSeedlessOnboardingAuthConnection) return null;
        return null;
      });

      renderWithProvider(<OnboardingSecuritySettings />);

      expect(useSelector).toHaveBeenCalledWith(
        selectUseSafeChainsListValidation,
      );
    });
  });

  describe('Analytics state management', () => {
    beforeEach(() => {
      (useSelector as jest.Mock).mockImplementation((selector) => {
        if (selector === selectUseSafeChainsListValidation) return false;
        if (selector === selectSeedlessOnboardingAuthConnection)
          return AuthConnection.Google;
        return null;
      });
    });

    it('should pass metricsOptin=false when analytics is disabled', () => {
      mockUseMetrics.mockReturnValue({
        isEnabled: jest.fn(() => false),
      });

      renderWithProvider(<OnboardingSecuritySettings />);

      expect(mockDeleteMetaMetricsData).toHaveBeenCalledWith(
        expect.objectContaining({ metricsOptin: false }),
        expect.anything(),
      );
    });

    it('should pass metricsOptin=true when analytics is enabled', () => {
      mockUseMetrics.mockReturnValue({
        isEnabled: jest.fn(() => true),
      });

      renderWithProvider(<OnboardingSecuritySettings />);

      expect(mockDeleteMetaMetricsData).toHaveBeenCalledWith(
        expect.objectContaining({ metricsOptin: true }),
        expect.anything(),
      );
    });

    it('should call useMetrics hook to get analytics state', () => {
      const mockIsEnabled = jest.fn(() => false);
      mockUseMetrics.mockReturnValue({
        isEnabled: mockIsEnabled,
      });

      renderWithProvider(<OnboardingSecuritySettings />);

      expect(mockUseMetrics).toHaveBeenCalled();
      expect(mockIsEnabled).toHaveBeenCalled();
    });

    it('should sync analytics state on component mount', () => {
      const mockIsEnabled = jest.fn(() => true);
      mockUseMetrics.mockReturnValue({
        isEnabled: mockIsEnabled,
      });

      renderWithProvider(<OnboardingSecuritySettings />);

      expect(mockIsEnabled).toHaveBeenCalled();
      expect(mockDeleteMetaMetricsData).toHaveBeenCalledWith(
        expect.objectContaining({ metricsOptin: true }),
        expect.anything(),
      );
    });
  });
});
