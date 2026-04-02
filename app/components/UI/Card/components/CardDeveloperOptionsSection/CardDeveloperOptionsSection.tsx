import React, { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  Button,
  ButtonVariant,
  ButtonSize,
} from '@metamask/design-system-react-native';
import { resetOnboardingState } from '../../../../../core/redux/slices/card';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../component-library/components/Texts/Text';
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
        color={TextColor.Default}
        variant={TextVariant.HeadingLG}
        style={tw.style('mt-4')}
      >
        {strings('app_settings.developer_options.card.title')}
      </Text>
      <Text
        color={TextColor.Alternative}
        variant={TextVariant.BodyMD}
        style={tw.style('mt-2')}
      >
        {strings(
          'app_settings.developer_options.card.reset_onboarding_description',
        )}
      </Text>
      <Button
        variant={ButtonVariant.Secondary}
        size={ButtonSize.Lg}
        onPress={handleResetOnboardingState}
        isFullWidth
        style={tw.style('mt-4')}
      >
        {strings('app_settings.developer_options.card.reset_onboarding_button')}
      </Button>
    </Box>
  );
};

export default CardDeveloperOptionsSection;
