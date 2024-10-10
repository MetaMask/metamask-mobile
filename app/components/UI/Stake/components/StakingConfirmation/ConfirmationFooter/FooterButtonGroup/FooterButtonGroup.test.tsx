import React from 'react';
import renderWithProvider from '../../../../../../../util/test/renderWithProvider';
import { strings } from '../../../../../../../../locales/i18n';
import FooterButtonGroup from './FooterButtonGroup';
import { fireEvent } from '@testing-library/react-native';

const mockCanGoBack = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      canGoBack: mockCanGoBack,
      goBack: mockGoBack,
    }),
  };
});

describe('FooterButtonGroup', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('render matches snapshot', () => {
    const { getByText, toJSON } = renderWithProvider(<FooterButtonGroup />);

    expect(getByText(strings('stake.cancel'))).toBeDefined();
    expect(getByText(strings('stake.confirm'))).toBeDefined();

    expect(toJSON()).toMatchSnapshot();
  });

  it('navigates to previous page when cancel button is pressed', () => {
    mockCanGoBack.mockImplementationOnce(() => true);

    const { getByText, toJSON } = renderWithProvider(<FooterButtonGroup />);

    fireEvent.press(getByText(strings('stake.cancel')));

    expect(mockCanGoBack).toHaveBeenCalledTimes(1);
    expect(mockGoBack).toHaveBeenCalledTimes(1);

    expect(toJSON()).toMatchSnapshot();
  });

  it.todo('confirms stake when confirm button is pressed');
});
