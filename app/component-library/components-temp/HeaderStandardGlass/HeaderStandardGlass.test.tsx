import React from 'react';
import { Text } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import { IconName } from '@metamask/design-system-react-native';

import HeaderStandardGlass from './HeaderStandardGlass';

const mockUseLiquidGlass = jest.fn();
jest.mock('../../hooks/useLiquidGlass', () => ({
  useLiquidGlass: () => mockUseLiquidGlass(),
}));

const TITLE = 'Accounts';
const BACK_BUTTON_TEST_ID = 'header-standard-glass-back';
const CLOSE_BUTTON_TEST_ID = 'header-standard-glass-close';
const BACK_CAPSULE_TEST_ID = 'header-standard-glass-back-capsule';
const CLOSE_CAPSULE_TEST_ID = 'header-standard-glass-close-capsule';

const glassOff = {
  isGlassEnabled: false,
  glassColorScheme: 'light',
  isBlurEnabled: false,
  blurTint: 'systemChromeMaterialLight',
};

describe('HeaderStandardGlass', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseLiquidGlass.mockReturnValue(glassOff);
  });

  it('renders the title', () => {
    const { getByText } = render(<HeaderStandardGlass title={TITLE} />);

    expect(getByText(TITLE)).toBeOnTheScreen();
  });

  it('renders the subtitle under the title', () => {
    const { getByText } = render(
      <HeaderStandardGlass title={TITLE} subtitle="3 accounts" />,
    );

    expect(getByText('3 accounts')).toBeOnTheScreen();
  });

  it('renders children in place of the title', () => {
    const { getByText, queryByText } = render(
      <HeaderStandardGlass title={TITLE}>
        <Text>Custom title</Text>
      </HeaderStandardGlass>,
    );

    expect(getByText('Custom title')).toBeOnTheScreen();
    expect(queryByText(TITLE)).not.toBeOnTheScreen();
  });

  it('renders a back button from onBack and calls it', () => {
    const onBack = jest.fn();
    const { getByTestId } = render(
      <HeaderStandardGlass
        title={TITLE}
        onBack={onBack}
        backButtonProps={{ testID: BACK_BUTTON_TEST_ID }}
      />,
    );

    fireEvent.press(getByTestId(BACK_BUTTON_TEST_ID));

    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('uses backButtonProps.onPress over onBack', () => {
    const onBack = jest.fn();
    const onPress = jest.fn();
    const { getByTestId } = render(
      <HeaderStandardGlass
        title={TITLE}
        onBack={onBack}
        backButtonProps={{ onPress, testID: BACK_BUTTON_TEST_ID }}
      />,
    );

    fireEvent.press(getByTestId(BACK_BUTTON_TEST_ID));

    expect(onPress).toHaveBeenCalledTimes(1);
    expect(onBack).not.toHaveBeenCalled();
  });

  it('renders startButtonIconProps in place of the back button', () => {
    const { getByTestId, queryByTestId } = render(
      <HeaderStandardGlass
        title={TITLE}
        onBack={jest.fn()}
        backButtonProps={{ testID: BACK_BUTTON_TEST_ID }}
        startButtonIconProps={{
          iconName: IconName.Menu,
          onPress: jest.fn(),
          testID: 'custom-start-button',
        }}
      />,
    );

    expect(getByTestId('custom-start-button')).toBeOnTheScreen();
    expect(queryByTestId(BACK_BUTTON_TEST_ID)).not.toBeOnTheScreen();
  });

  it('renders startAccessory in place of the start icon button', () => {
    const { getByTestId, queryByTestId } = render(
      <HeaderStandardGlass
        title={TITLE}
        onBack={jest.fn()}
        backButtonProps={{ testID: BACK_BUTTON_TEST_ID }}
        startAccessory={<Text testID="custom-start">Start</Text>}
      />,
    );

    expect(getByTestId('custom-start')).toBeOnTheScreen();
    expect(queryByTestId(BACK_BUTTON_TEST_ID)).not.toBeOnTheScreen();
  });

  it('renders a close button from onClose and calls it', () => {
    const onClose = jest.fn();
    const { getByTestId } = render(
      <HeaderStandardGlass
        title={TITLE}
        onClose={onClose}
        closeButtonProps={{ testID: CLOSE_BUTTON_TEST_ID }}
      />,
    );

    fireEvent.press(getByTestId(CLOSE_BUTTON_TEST_ID));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('places the close button to the right of other end buttons', () => {
    const { getByTestId, toJSON } = render(
      <HeaderStandardGlass
        title={TITLE}
        onClose={jest.fn()}
        closeButtonProps={{ testID: CLOSE_BUTTON_TEST_ID }}
        endButtonIconProps={[
          {
            iconName: IconName.Search,
            onPress: jest.fn(),
            testID: 'search-button',
          },
        ]}
      />,
    );

    expect(getByTestId('search-button')).toBeOnTheScreen();
    expect(getByTestId(CLOSE_BUTTON_TEST_ID)).toBeOnTheScreen();

    const serialized = JSON.stringify(toJSON());
    const searchIndex = serialized.indexOf('"search-button"');
    const closeIndex = serialized.indexOf(`"${CLOSE_BUTTON_TEST_ID}"`);

    expect(searchIndex).toBeGreaterThan(-1);
    expect(closeIndex).toBeGreaterThan(searchIndex);
  });

  it('renders endAccessory in place of the end icon buttons', () => {
    const { getByTestId, queryByTestId } = render(
      <HeaderStandardGlass
        title={TITLE}
        onClose={jest.fn()}
        closeButtonProps={{ testID: CLOSE_BUTTON_TEST_ID }}
        endAccessory={<Text testID="custom-end">End</Text>}
      />,
    );

    expect(getByTestId('custom-end')).toBeOnTheScreen();
    expect(queryByTestId(CLOSE_BUTTON_TEST_ID)).not.toBeOnTheScreen();
  });

  it('leaves icon buttons uncapsuled when glass is off', () => {
    const { getByTestId, queryByTestId } = render(
      <HeaderStandardGlass
        isGlass={false}
        title={TITLE}
        onBack={jest.fn()}
        backButtonProps={{
          testID: BACK_BUTTON_TEST_ID,
          capsuleTestID: BACK_CAPSULE_TEST_ID,
        }}
      />,
    );

    expect(getByTestId(BACK_BUTTON_TEST_ID)).toBeOnTheScreen();
    expect(queryByTestId(BACK_CAPSULE_TEST_ID)).not.toBeOnTheScreen();
  });

  it('seats icon buttons in capsules when glass is on', () => {
    const onBack = jest.fn();
    const { getByTestId } = render(
      <HeaderStandardGlass
        isGlass
        title={TITLE}
        onBack={onBack}
        onClose={jest.fn()}
        backButtonProps={{
          testID: BACK_BUTTON_TEST_ID,
          capsuleTestID: BACK_CAPSULE_TEST_ID,
        }}
        closeButtonProps={{
          testID: CLOSE_BUTTON_TEST_ID,
          capsuleTestID: CLOSE_CAPSULE_TEST_ID,
        }}
      />,
    );

    expect(getByTestId(BACK_CAPSULE_TEST_ID)).toBeOnTheScreen();
    expect(getByTestId(CLOSE_CAPSULE_TEST_ID)).toBeOnTheScreen();

    fireEvent.press(getByTestId(BACK_BUTTON_TEST_ID));

    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('seats icon buttons in capsules when Liquid Glass is available', () => {
    mockUseLiquidGlass.mockReturnValue({
      ...glassOff,
      isGlassEnabled: true,
    });

    const { getByTestId } = render(
      <HeaderStandardGlass
        title={TITLE}
        onBack={jest.fn()}
        backButtonProps={{
          testID: BACK_BUTTON_TEST_ID,
          capsuleTestID: BACK_CAPSULE_TEST_ID,
        }}
      />,
    );

    expect(getByTestId(BACK_CAPSULE_TEST_ID)).toBeOnTheScreen();
  });

  it('keeps a button uncapsuled when its own isCapsule is false', () => {
    const { getByTestId, queryByTestId } = render(
      <HeaderStandardGlass
        isGlass
        title={TITLE}
        onBack={jest.fn()}
        backButtonProps={{
          isCapsule: false,
          testID: BACK_BUTTON_TEST_ID,
          capsuleTestID: BACK_CAPSULE_TEST_ID,
        }}
      />,
    );

    expect(getByTestId(BACK_BUTTON_TEST_ID)).toBeOnTheScreen();
    expect(queryByTestId(BACK_CAPSULE_TEST_ID)).not.toBeOnTheScreen();
  });
});
