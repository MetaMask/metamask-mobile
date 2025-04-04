import React from 'react';
import Options from '.';
import { render } from '@testing-library/react-native';
import { useNavigation } from '@react-navigation/native';
import { useMetrics } from '../../../../hooks/useMetrics';
import { useSelector } from 'react-redux';

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

jest.mock('../../../../hooks/useMetrics', () => ({
  useMetrics: jest.fn(),
}));

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
  useDispatch: () => jest.fn(),
}));

describe('Options', () => {
  const mockProps = {
    toggleOptions: jest.fn(),
    onNewTabPress: jest.fn(),
    toggleOptionsIfNeeded: jest.fn(),
    activeUrl: 'https://test.com',
    isHomepage: jest.fn(() => false),
    getMaskedUrl: jest.fn(),
    onSubmitEditing: jest.fn(),
    title: { current: 'Test Title' },
    reload: jest.fn(),
    sessionENSNames: {},
    favicon: { uri: 'test-favicon' },
    icon: { current: undefined },
  };

  beforeEach(() => {
    (useNavigation as jest.Mock).mockReturnValue({ push: jest.fn() });
    (useMetrics as jest.Mock).mockReturnValue({
      trackEvent: jest.fn(),
      createEventBuilder: jest.fn().mockReturnValue({
        build: jest.fn(),
        addProperties: jest.fn().mockReturnValue({ build: jest.fn() }),
      }),
    });
    (useSelector as jest.Mock).mockReturnValue([]);
  });

  it('should render non-homepage options correctly', () => {
    const { toJSON } = render(<Options {...mockProps} />);
    expect(toJSON()).toMatchSnapshot();
  });

  it('should render homepage options correctly', () => {
    const homepageProps = {
      ...mockProps,
      isHomepage: jest.fn(() => true),
    };

    const { toJSON } = render(<Options {...homepageProps} />);
    expect(toJSON()).toMatchSnapshot();
  });
});
