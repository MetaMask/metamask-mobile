// PROTOTYPE-DO-NOT-MERGE
// Paper screens: KP-23 (see prototypeScreens.ts)
import React, { useCallback } from 'react';
import { Linking, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  AvatarIcon,
  AvatarIconSeverity,
  AvatarIconSize,
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
  FontWeight,
  IconName,
  ListItem,
  ListItemVariant,
  Text,
  TextButton,
  TextColor,
  TextVariant,
  TitleStandard,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useSelector } from 'react-redux';
import { strings } from '../../../../../../locales/i18n';
import HeaderStandardGlass from '../../../../../component-library/components-temp/HeaderStandardGlass';
import { selectGlassHeadersEnabled } from '../../../../../selectors/featureFlagController/glassHeaders';
import { PROTOTYPE_COPY } from './prototypeConstants';
import { KalshiPrototypeStepUpSelectorsIDs } from './KalshiPrototypeStepUp.testIds';

const LEARN_MORE_URL =
  'https://support.metamask.io/trade/identity-verification';

// The same rows, icons and wording as the shared Verify your identity page,
// cut to what a Level 2 check asks for.
const STEPS = [
  {
    id: 'photograph-id',
    icon: IconName.Card,
    title: 'kyc.verify_identity.step_photograph_id',
  },
  {
    id: 'take-selfie',
    icon: IconName.FaceId,
    title: 'kyc.verify_identity.step_take_selfie',
  },
] as const;

interface KalshiPrototypeStepUpProps {
  /** Opens the identity provider. */
  onContinue: () => void;
  /** Leaves the flow; the status card keeps the step-up state. */
  onNotNow: () => void;
}

/**
 * Kalshi Level 2 step-up (Paper 6SR): what the extra check needs before
 * Sumsub opens. Shown live and when the user comes back from the card before
 * finishing their ID and selfie. It is the Verify your identity layout
 * without idOS or consent, which the user has already given.
 *
 * @param props - The two actions.
 * @returns The step-up page.
 */
const KalshiPrototypeStepUp = ({
  onContinue,
  onNotNow,
}: KalshiPrototypeStepUpProps) => {
  const tw = useTailwind();
  const isGlassHeader = useSelector(selectGlassHeadersEnabled);
  const copy = PROTOTYPE_COPY.stepUp;
  const handleLearnMore = useCallback(
    () => Linking.openURL(LEARN_MORE_URL),
    [],
  );

  return (
    <Box twClassName="flex-1 bg-default">
      <SafeAreaView
        edges={['right', 'bottom', 'left']}
        style={tw.style('flex-1')}
      >
        <HeaderStandardGlass
          isGlass={isGlassHeader}
          isFloating={false}
          onBack={onNotNow}
          backButtonProps={{
            testID: KalshiPrototypeStepUpSelectorsIDs.BACK_BUTTON,
          }}
          includesTopInset
        />
        <ScrollView
          contentContainerStyle={tw.style('flex-grow pb-4')}
          testID={KalshiPrototypeStepUpSelectorsIDs.CONTAINER}
        >
          <TitleStandard
            title={copy.title}
            bottomLabel={
              <Text
                variant={TextVariant.BodySm}
                fontWeight={FontWeight.Medium}
                color={TextColor.TextAlternative}
              >
                <Text
                  variant={TextVariant.BodySm}
                  fontWeight={FontWeight.Medium}
                  color={TextColor.TextAlternative}
                >
                  {copy.body}
                </Text>{' '}
                <TextButton
                  variant={TextVariant.BodySm}
                  onPress={handleLearnMore}
                  testID={KalshiPrototypeStepUpSelectorsIDs.LEARN_MORE_LINK}
                >
                  {strings('kyc.verify_identity.learn_more')}
                </TextButton>
              </Text>
            }
            twClassName="px-4 pt-2 pb-4"
          />
          <Box>
            {STEPS.map((step) => (
              <ListItem
                key={step.id}
                variant={ListItemVariant.OneLine}
                avatar={
                  <AvatarIcon
                    iconName={step.icon}
                    severity={AvatarIconSeverity.Neutral}
                    size={AvatarIconSize.Lg}
                  />
                }
                title={strings(step.title)}
                testID={`${KalshiPrototypeStepUpSelectorsIDs.STEP}-${step.id}`}
              />
            ))}
          </Box>
        </ScrollView>
        <Box twClassName="p-4 gap-2">
          <Button
            variant={ButtonVariant.Primary}
            size={ButtonSize.Lg}
            isFullWidth
            onPress={onContinue}
            testID={KalshiPrototypeStepUpSelectorsIDs.CONTINUE_BUTTON}
          >
            {copy.continue}
          </Button>
          <Button
            variant={ButtonVariant.Secondary}
            size={ButtonSize.Lg}
            isFullWidth
            onPress={onNotNow}
            testID={KalshiPrototypeStepUpSelectorsIDs.NOT_NOW_BUTTON}
          >
            {copy.notNow}
          </Button>
        </Box>
      </SafeAreaView>
    </Box>
  );
};

export default KalshiPrototypeStepUp;
