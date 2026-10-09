import React from 'react';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import {
  Box,
  Button,
  ButtonBase,
  ButtonSize,
  ButtonVariant,
  FontWeight,
  HeaderStandard,
  IconName,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import type { AppNavigationProp } from '../../../../../../core/NavigationService/types';
import Routes from '../../../../../../constants/navigation/Routes';
import {
  VbaAccountProvisioningErrorAdapter,
  VbaErrorAdapter,
  VbaKycRejectedAdapter,
} from '../modules/VbaStatusAdapters';
import VbaIllustration, { VbaIllustrationSource } from '../VbaIllustration';
import VbaKycPending from '../VbaKycPending';
import VbaKycSuccess from '../VbaKycSuccess';
import VbaOnboardingError from '../VbaOnboardingError';
import VbaSumSubKyc from '../VbaSumSubKyc';
import { VbaOnboardingRoutes, type VbaOnboardingParamList } from '../routes';

export const VbaDevScreenSelectorsIDs = {
  ENTRY: 'vba-dev-screen-entry',
  PICKER: 'vba-dev-screen-picker',
  PREVIEW: 'vba-dev-screen-preview',
  BACK: 'vba-dev-screen-back',
} as const;

interface VbaDevScreenOption {
  id: string;
  label: string;
  /** File that renders this preview. */
  component: string;
  /** The screen draws its own back header. Status screens do not. */
  ownsHeader: boolean;
}

/**
 * Temporary dev catalog. Delete this folder when the screens are reachable
 * from the real funnel.
 */
export const VBA_DEV_SCREENS: readonly VbaDevScreenOption[] = [
  {
    id: 'error',
    label: "Couldn't continue",
    component: 'VbaOnboardingError.tsx',
    ownsHeader: true,
  },
  {
    id: 'accountProvisioning',
    label: "Couldn't create your account",
    component: 'VbaOnboardingError.tsx',
    ownsHeader: true,
  },
  {
    id: 'kycRejected',
    label: 'Verification unsuccessful',
    component: 'VbaKycRejected.tsx',
    ownsHeader: true,
  },
  {
    id: 'moreInfo',
    label: 'More information needed',
    component: 'VbaSumSubKyc.tsx',
    ownsHeader: true,
  },
  {
    id: 'launchError',
    label: "Couldn't start verification",
    component: 'VbaSumSubKyc.tsx',
    ownsHeader: true,
  },
  {
    id: 'checklist',
    label: 'Error layout with checklist',
    component: 'VbaOnboardingError.tsx',
    ownsHeader: true,
  },
  {
    id: 'verifying',
    label: 'Verifying your identity',
    component: 'VbaKycPending.tsx',
    ownsHeader: false,
  },
  {
    id: 'verified',
    label: 'Identity verified',
    component: 'VbaKycSuccess.tsx',
    ownsHeader: false,
  },
];

const noop = () => undefined;

export const VbaDevScreenBody = ({ screenId }: { screenId: string }) => {
  switch (screenId) {
    case 'error':
      return <VbaErrorAdapter />;
    case 'accountProvisioning':
      return <VbaAccountProvisioningErrorAdapter />;
    case 'kycRejected':
      return <VbaKycRejectedAdapter />;
    case 'moreInfo':
      return <VbaSumSubKyc onSubmitted={noop} initialNeedsMoreInfo />;
    case 'launchError':
      return <VbaSumSubKyc onSubmitted={noop} initialHasError />;
    case 'checklist':
      return (
        <VbaOnboardingError
          illustration={
            <VbaIllustration source={VbaIllustrationSource.hazard} />
          }
          title="We couldn't verify your identity"
          description="A few details need your attention. Review each item below, then try again."
          items={[
            {
              id: 'document',
              icon: IconName.Info,
              title: 'Check your identity document',
              description: 'Make sure it is valid, clear, and fully visible',
            },
            {
              id: 'selfie',
              icon: IconName.UserCircle,
              title: 'Retake your selfie',
              description: 'Use good lighting and show your face clearly',
            },
          ]}
          primaryAction={{ label: 'Try again', onPress: noop }}
          secondaryAction={{ label: 'Need help verifying?', onPress: noop }}
        />
      );
    case 'verifying':
      return <VbaKycPending />;
    case 'verified':
      return <VbaKycSuccess onContinue={noop} />;
    default:
      return null;
  }
};

export const VbaDevScreenEntry = () => {
  const navigation = useNavigation<AppNavigationProp>();

  if (!__DEV__) {
    return null;
  }

  return (
    <Box twClassName="px-4 pb-2">
      <Button
        variant={ButtonVariant.Secondary}
        size={ButtonSize.Lg}
        isFullWidth
        testID={VbaDevScreenSelectorsIDs.ENTRY}
        onPress={() =>
          navigation.navigate(Routes.RAMP.VBA_ONBOARDING, {
            screen: VbaOnboardingRoutes.DEV_PREVIEW,
          })
        }
      >
        VBA screens
      </Button>
    </Box>
  );
};

const VbaDevScreenPicker = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const tw = useTailwind();

  return (
    <SafeAreaView
      edges={['right', 'bottom', 'left']}
      style={tw.style('flex-1 bg-default')}
      testID={VbaDevScreenSelectorsIDs.PICKER}
    >
      <HeaderStandard
        title="VBA screens"
        onBack={() => navigation.goBack()}
        includesTopInset
      />
      <ScrollView contentContainerStyle={tw.style('gap-3 px-4 pb-6')}>
        <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
          Temporary dev picker. These are the screens from this pass.
        </Text>
        {VBA_DEV_SCREENS.map((screen) => (
          <ButtonBase
            key={screen.id}
            testID={`${VbaDevScreenSelectorsIDs.PICKER}-${screen.id}`}
            onPress={() =>
              navigation.navigate(Routes.RAMP.VBA_ONBOARDING, {
                screen: VbaOnboardingRoutes.DEV_SCREEN,
                params: { screenId: screen.id },
              })
            }
            isFullWidth
            contentWrapperProps={{ twClassName: 'w-full' }}
            style={({ pressed }) =>
              tw.style(
                'h-auto w-full rounded-full bg-muted px-4 py-3',
                pressed && 'bg-pressed',
              )
            }
          >
            <Box twClassName="w-full flex-col items-center">
              <Text
                variant={TextVariant.BodyMd}
                fontWeight={FontWeight.Medium}
                twClassName="text-center"
              >
                {screen.label}
              </Text>
              <Text
                variant={TextVariant.BodySm}
                color={TextColor.TextAlternative}
                twClassName="text-center"
              >
                {screen.component}
              </Text>
            </Box>
          </ButtonBase>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

const VbaDevScreenPreview = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const route =
    useRoute<
      RouteProp<VbaOnboardingParamList, typeof VbaOnboardingRoutes.DEV_SCREEN>
    >();
  const screen = VBA_DEV_SCREENS.find(
    (option) => option.id === route.params.screenId,
  );

  return (
    <Box twClassName="flex-1" testID={VbaDevScreenSelectorsIDs.PREVIEW}>
      <VbaDevScreenBody screenId={route.params.screenId} />
      {screen?.ownsHeader ? null : (
        <Box twClassName="absolute left-2 top-12">
          <Button
            variant={ButtonVariant.Tertiary}
            size={ButtonSize.Md}
            testID={VbaDevScreenSelectorsIDs.BACK}
            onPress={() => navigation.goBack()}
          >
            Back
          </Button>
        </Box>
      )}
    </Box>
  );
};

export default VbaDevScreenPicker;
export { VbaDevScreenPreview };
