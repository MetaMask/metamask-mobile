// Third party dependencies.
import React from 'react';
import { render } from '@testing-library/react-native';

// External dependencies.
import Text from '../../Texts/Text/Text';
import { ButtonVariants } from '../../Buttons/Button';
import { IconName } from '../../Icons/Icon';
import { ButtonIconSizes } from '../../Buttons/ButtonIcon';

// Internal dependencies.
import Banner from './Banner';
import { TESTID_BANNER_CLOSE_BUTTON_ICON } from './foundation/BannerBase/BannerBase.constants';
import { BannerAlertSeverity } from './variants/BannerAlert/BannerAlert.types';
import { BannerVariant } from './Banner.types';
import { SAMPLE_BANNER_PROPS } from './Banner.constants';

describe('Banner', () => {
  it('should render correctly', () => {
    const wrapper = render(
      <Banner
        severity={BannerAlertSeverity.Error}
        variant={BannerVariant.Alert}
        title={SAMPLE_BANNER_PROPS.title}
        description={SAMPLE_BANNER_PROPS.description}
      />,
    );
    expect(wrapper).toMatchSnapshot();
  });

  it('should render correctly with a start accessory', async () => {
    const wrapper = render(
      <Banner
        severity={BannerAlertSeverity.Error}
        variant={BannerVariant.Alert}
        title={SAMPLE_BANNER_PROPS.title}
        description={SAMPLE_BANNER_PROPS.description}
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
        title={SAMPLE_BANNER_PROPS.title}
        description={SAMPLE_BANNER_PROPS.description}
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
        title={SAMPLE_BANNER_PROPS.title}
        description={SAMPLE_BANNER_PROPS.description}
        actionButtonProps={{
          label: 'Test Action Button',
          onPress: () => jest.fn(),
          variant: ButtonVariants.Secondary,
        }}
        closeButtonProps={{
          onPress: () => jest.fn(),
          iconName: IconName.Close,
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
