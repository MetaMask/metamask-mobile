import React, { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  Text,
  TextVariant,
  TextColor,
} from '@metamask/design-system-react-native';
import { resetOnboardingState } from '../../../../../core/redux/slices/card';
import Button, {
  ButtonVariants,
  ButtonSize,
  ButtonWidthTypes,
} from '../../../../../component-library/components/Buttons/Button';
import { strings } from '../../../../../../locales/i18n';

const CardDeveloperOptionsSection = () => {
  const dispatch = useDispatch();
  const tw = useTailwind();

  const handleResetOnboardingState = useCallback(() => {
    dispatch(resetOnboardingState());
  }, [dispatch]);

  return (
    <Box twClassName="mt-2 gap-2">
      <Text
        color={TextColor.TextDefault}
        variant={TextVariant.HeadingLg}
        style={tw.style('mt-4')}
      >
        {strings('app_settings.developer_options.card.title')}
      </Text>
      <Text
        color={TextColor.TextAlternative}
        variant={TextVariant.BodyMd}
        style={tw.style('mt-2')}
      >
        {strings(
          'app_settings.developer_options.card.reset_onboarding_description',
        )}
      </Text>
      <Button
        variant={ButtonVariants.Secondary}
        size={ButtonSize.Lg}
        label={strings(
          'app_settings.developer_options.card.reset_onboarding_button',
        )}
        onPress={handleResetOnboardingState}
        width={ButtonWidthTypes.Full}
        style={tw.style('mt-4')}
      />
    </Box>
  );
};

export default CardDeveloperOptionsSection;
