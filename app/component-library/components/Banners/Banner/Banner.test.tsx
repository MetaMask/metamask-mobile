import React from 'react';

import { render } from '@testing-library/react-native';
import Banner from './Banner';
import Text from '../../Texts/Text/Text';
import { BannerAlertSeverity } from './variants/BannerAlert/BannerAlert.types';
import { BannerVariant } from './Banner.types';
import { ButtonVariants } from '../../Buttons/Button';
import { IconName } from '../../Icons/Icon';
import { ButtonIconSizes, ButtonIconVariants } from '../../Buttons/ButtonIcon';
import { TESTID_BANNER_CLOSE_BUTTON_ICON } from './foundation/BannerBase/BannerBase.constants';

describe('Banner', () => {
  it('should render correctly', () => {
    const wrapper = render(
      <Banner
        severity={BannerAlertSeverity.Error}
        variant={BannerVariant.Alert}
        title="Hello Error Banner World"
        description={
          'This is nothing but a test of the emergency broadcast system.'
        }
      />,
    );
    expect(wrapper).toMatchSnapshot();
  });

  it('should render correctly with a start accessory', async () => {
    const wrapper = render(
      <Banner
        severity={BannerAlertSeverity.Error}
        variant={BannerVariant.Alert}
        title="Hello Error Banner World"
        description={
          'This is nothing but a test of the emergency broadcast system.'
        }
        startAccessory={<Text>Test Start accessory</Text>}
      />,
    );

    expect(wrapper).toMatchSnapshot();
    expect(await wrapper.findByText('Test Start accessory')).toBeDefined();
  });

  it('should render correctly with an action button', async () => {
    const wrapper = render(
      <Banner
        severity={BannerAlertSeverity.Error}
        variant={BannerVariant.Alert}
        title="Hello Error Banner World"
        description={
          'This is nothing but a test of the emergency broadcast system.'
        }
        actionButtonProps={{
          label: 'Test Action Button',
          onPress: () => jest.fn(),
          variant: ButtonVariants.Secondary,
        }}
      />,
    );

    expect(wrapper).toMatchSnapshot();
    expect(await wrapper.findByText('Test Action Button')).toBeDefined();
  });

  it('should render correctly with a close button', async () => {
    const wrapper = render(
      <Banner
        severity={BannerAlertSeverity.Error}
        variant={BannerVariant.Alert}
        title="Hello Error Banner World"
        description={
          'This is nothing but a test of the emergency broadcast system.'
        }
        actionButtonProps={{
          label: 'Test Action Button',
          onPress: () => jest.fn(),
          variant: ButtonVariants.Secondary,
        }}
        closeButtonProps={{
          onPress: () => jest.fn(),
          iconName: IconName.Close,
          variant: ButtonIconVariants.Primary,
          size: ButtonIconSizes.Sm,
        }}
      />,
    );

    expect(wrapper).toMatchSnapshot();
    expect(await wrapper.findByText('Test Action Button')).toBeDefined();
    expect(
      await wrapper.queryByTestId(TESTID_BANNER_CLOSE_BUTTON_ICON),
    ).toBeDefined();
  });
});
