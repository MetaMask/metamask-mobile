import React from 'react';

import { render } from '@testing-library/react-native';
import Banner from './Banner';
import Text from '../../Texts/Text/Text';
import { BannerAlertSeverity } from './variants/BannerAlert/BannerAlert.types';
import { BannerVariant } from './Banner.types';
import { ButtonVariants } from '../../Buttons/Button';
import { IconName } from '../../Icons/Icon';
import { ButtonIconSizes, ButtonIconVariants } from '../../Buttons/ButtonIcon';

describe('SendFlowAddressFrom', () => {
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

  it('should render correctly with a start accessory', () => {
    const wrapper = render(
      <Banner
        severity={BannerAlertSeverity.Error}
        variant={BannerVariant.Alert}
        title="Hello Error Banner World"
        description={
          'This is nothing but a test of the emergency broadcast system.'
        }
        startAccessory={<Text>Start accessory</Text>}
      />,
    );
    expect(wrapper).toMatchSnapshot();
  });

  it('should render correctly with an action button', () => {
    const wrapper = render(
      <Banner
        severity={BannerAlertSeverity.Error}
        variant={BannerVariant.Alert}
        title="Hello Error Banner World"
        description={
          'This is nothing but a test of the emergency broadcast system.'
        }
        actionButtonProps={{
          label: 'Action Button',
          onPress: () => jest.fn(),
          variant: ButtonVariants.Secondary,
        }}
      />,
    );
    expect(wrapper).toMatchSnapshot();
  });

  it('should render correctly with a close button', () => {
    const wrapper = render(
      <Banner
        severity={BannerAlertSeverity.Error}
        variant={BannerVariant.Alert}
        title="Hello Error Banner World"
        description={
          'This is nothing but a test of the emergency broadcast system.'
        }
        actionButtonProps={{
          label: 'Action Button',
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
  });
});
