// Third party dependencies.
import React from 'react';
import { select, text } from '@storybook/addon-knobs';

// External dependencies.
import { storybookPropsGroupID } from '../../../../../constants/storybook.constants';

// Internal dependencies.
import BannerTip from './BannerTip';
import { BannerTipProps, BannerTipLogoType } from './BannerTip.types';
import {
  DEFAULT_BANNERTIP_LOGOTYPE,
  SAMPLE_BANNERTIP_TITLE,
  SAMPLE_BANNERTIP_DESCRIPTION,
  SAMPLE_BANNERTIP_ACTIONBUTTONLABEL,
  SAMPLE_BANNERTIP_PROPS,
} from './BannerTip.constants';

export const getBannerTipStoryProps = (): BannerTipProps => {
  const logoTypeSelector = select(
    'logoType',
    BannerTipLogoType,
    DEFAULT_BANNERTIP_LOGOTYPE,
    storybookPropsGroupID,
  );

  const title = text('title', SAMPLE_BANNERTIP_TITLE, storybookPropsGroupID);
  const description = text(
    'description',
    SAMPLE_BANNERTIP_DESCRIPTION,
    storybookPropsGroupID,
  );
  const actionButtonLabel = text(
    'actionButtonLabel',
    SAMPLE_BANNERTIP_ACTIONBUTTONLABEL,
    storybookPropsGroupID,
  );

  return {
    logoType: logoTypeSelector,
    title,
    description,
    actionButtonLabel,
    actionButtonOnPress: SAMPLE_BANNERTIP_PROPS.actionButtonOnPress,
    onClose: SAMPLE_BANNERTIP_PROPS.onClose,
  };
};

const BannerTipStory = () => <BannerTip {...getBannerTipStoryProps()} />;

export default BannerTipStory;
