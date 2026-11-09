import { withPortfolioBalanceProviders } from './shared/withPortfolioBalanceProviders';
import { withSocialAccountGate } from './shared/withSocialAccountGate';
import SocialV0ViewScreen from './SocialV0View';
import SocialV1ViewScreen from './SocialV1View';
import SocialPostComposerViewScreen from './SocialPostComposerView/SocialPostComposerView';
import MyProfileViewScreen from './MyProfileView';
import FollowConnectionsViewScreen from './FollowConnectionsView';
import ProfilesToFollowViewScreen from './ProfilesToFollowView';
import ManageProfileViewScreen, {
  ManageProfileTextEditorView as ManageProfileTextEditorViewScreen,
  ManageProfileTradingActivityView as ManageProfileTradingActivityViewScreen,
  ManageProfileLinkedAccountView as ManageProfileLinkedAccountViewScreen,
  EditProfileAvatarView as EditProfileAvatarViewScreen,
} from './ManageProfileView';
import TraderProfileViewScreen from './TraderProfileView';
import TraderPositionViewScreen from './TraderPositionView';
import SocialLeaderboardOnboardingScreen from './Onboarding';
import SocialProfileOnboardingViewScreen from './ProfileOnboarding';

// Every social screen is gated: a viewer whose account the moderation team
// disabled sees only the disabled-account notice.
export const SocialV0View = withSocialAccountGate(SocialV0ViewScreen);
export const SocialV1View = withSocialAccountGate(SocialV1ViewScreen);
export const SocialPostComposerView = withSocialAccountGate(
  SocialPostComposerViewScreen,
);
export const MyProfileView = withSocialAccountGate(MyProfileViewScreen);
export const FollowConnectionsView = withSocialAccountGate(
  FollowConnectionsViewScreen,
);
export const ProfilesToFollowView = withSocialAccountGate(
  ProfilesToFollowViewScreen,
);
export const ManageProfileView = withSocialAccountGate(
  withPortfolioBalanceProviders(ManageProfileViewScreen),
);
export const ManageProfileTextEditorView = withSocialAccountGate(
  ManageProfileTextEditorViewScreen,
);
export const ManageProfileTradingActivityView = withSocialAccountGate(
  ManageProfileTradingActivityViewScreen,
);
export const ManageProfileLinkedAccountView = withSocialAccountGate(
  withPortfolioBalanceProviders(ManageProfileLinkedAccountViewScreen),
);
export const EditProfileAvatarView = withSocialAccountGate(
  EditProfileAvatarViewScreen,
);
export const TraderProfileView = withSocialAccountGate(TraderProfileViewScreen);
export const TraderPositionView = withSocialAccountGate(
  TraderPositionViewScreen,
);
export const SocialLeaderboardOnboarding = withSocialAccountGate(
  SocialLeaderboardOnboardingScreen,
);
export const SocialProfileOnboardingView = withSocialAccountGate(
  SocialProfileOnboardingViewScreen,
);

export { default as TopTradersView } from './TopTradersView';
export { default as FeedView } from './FeedView';
export { default as PositionDetailsSheet } from './PositionDetailsSheet';
export { default as TradingSignalsSetupBottomSheet } from './components/TradingSignalsSetupBottomSheet';
