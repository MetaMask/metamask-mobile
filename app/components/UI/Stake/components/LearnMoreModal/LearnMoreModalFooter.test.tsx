import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { LearnMoreModalFooter } from './LearnMoreModalFooter';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { strings } from '../../../../../../locales/i18n';

describe('LearnMoreModalFooter', () => {
  const onClose = jest.fn();
  const onLearnMorePress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders learn more button', () => {
    const { getByText } = renderWithProvider(
      <LearnMoreModalFooter
        onClose={onClose}
        onLearnMorePress={onLearnMorePress}
      />,
    );

    expect(getByText(strings('stake.learn_more'))).toBeOnTheScreen();
  });

  it('renders got it button', () => {
    const { getByText } = renderWithProvider(
      <LearnMoreModalFooter
        onClose={onClose}
        onLearnMorePress={onLearnMorePress}
      />,
    );

    expect(getByText(strings('stake.got_it'))).toBeOnTheScreen();
  });

  it('calls onLearnMorePress when learn more button is pressed', () => {
    const { getByText } = renderWithProvider(
      <LearnMoreModalFooter
        onClose={onClose}
        onLearnMorePress={onLearnMorePress}
      />,
    );

    fireEvent.press(getByText(strings('stake.learn_more')));

    expect(onLearnMorePress).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('calls onClose when got it button is pressed', () => {
    const { getByText } = renderWithProvider(
      <LearnMoreModalFooter
        onClose={onClose}
        onLearnMorePress={onLearnMorePress}
      />,
    );

    fireEvent.press(getByText(strings('stake.got_it')));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onLearnMorePress).not.toHaveBeenCalled();
  });
});
