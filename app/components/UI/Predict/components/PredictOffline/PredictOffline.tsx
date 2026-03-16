import React from 'react';
import { strings } from '../../../../../../locales/i18n';
import Button, {
  ButtonSize,
  ButtonVariants,
} from '../../../../../component-library/components/Buttons/Button';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { Box, Text, TextVariant } from '@metamask/design-system-react-native';
import Icon, {
  IconName,
  IconSize,
  IconColor,
} from '../../../../../component-library/components/Icons/Icon';

interface PredictOfflineProps {
  /**
   * Optional callback when retry button is pressed
   */
  onRetry?: () => void;
  /**
   * TestID for the component
   */
  testID?: string;
}

const PredictOffline: React.FC<PredictOfflineProps> = ({
  onRetry,
  testID = 'predict-error-state',
}) => {
  const tw = useTailwind();

  return (
    <Box
      testID={testID}
      style={tw.style('flex-1 items-center justify-center px-6')}
    >
      <Icon
        name={IconName.Warning}
        size={IconSize.Xl}
        color={IconColor.Muted}
        style={tw.style('mb-4')}
      />
      <Text
        variant={TextVariant.HeadingMd}
        twClassName="text-default"
        style={tw.style('mb-2 text-center')}
      >
        {strings('predict.error.title')}
      </Text>
      <Text
        variant={TextVariant.BodyMd}
        twClassName="text-alternative"
        style={tw.style('mb-6 text-center')}
      >
        {strings('predict.error.description')}
      </Text>
      {onRetry && (
        <Button
          variant={ButtonVariants.Primary}
          size={ButtonSize.Lg}
          onPress={onRetry}
          label={strings('predict.error.retry')}
          style={tw.style('w-full self-center')}
        />
      )}
    </Box>
  );
};

export default PredictOffline;
