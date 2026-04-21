import React from 'react';
import { ScrollView, Platform, useWindowDimensions } from 'react-native';
import {
  Box,
  BoxJustifyContent,
  BoxAlignItems,
  BoxFlexDirection,
} from '@metamask/design-system-react-native';
import ScrollableTabView from '@tommasini/react-native-scrollable-tab-view';
import QRCode from 'react-native-qrcode-svg';
import TabBar from '../../../../component-library/components-temp/TabBar/TabBar';
import { strings } from '../../../../../locales/i18n';
import { RevealSeedViewSelectorsIDs } from '../RevealSeedView.testIds';
import { useTheme } from '../../../../util/theme';
import logo from '../../../../images/branding/fox.png';
import SeedPhraseDisplay from './SeedPhraseDisplay';
import SeedPhraseConcealer from './SeedPhraseConcealer';
import { SRPTabViewProps } from '../types';
import { useTailwind } from '@metamask/design-system-twrnc-preset';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomTabView = ScrollView as any;

const SRPTabView = ({
  clipboardPrivateCredential,
  showSeedPhrase,
  clipboardEnabled,
  onRevealSeedPhrase,
  onCopyToClipboard,
  onTabChange,
}: SRPTabViewProps) => {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const qrSize = width - 200;
  const trimmedCredential = clipboardPrivateCredential.trim();
  const words = trimmedCredential ? trimmedCredential.split(/\s+/) : [];
  const hasCredential = words.length > 0;

  const renderTabBar = () => <TabBar />;
  const tw = useTailwind();

  return (
    <Box paddingHorizontal={4}>
      <ScrollableTabView
        renderTabBar={() => renderTabBar()}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onChangeTab={(event: any) => onTabChange(event)}
        style={tw.style(
          `min-h-[${Platform.OS === 'android' ? width : 0}px] flex-grow flex-shrink-0 mb-[${Platform.OS === 'android' ? 20 : 0}px]`,
        )}
      >
        <CustomTabView
          tabLabel={strings(`reveal_credential.text`)}
          testID={RevealSeedViewSelectorsIDs.TAB_SCROLL_VIEW_TEXT}
        >
          <Box marginTop={4} twClassName="flex-1 w-full h-full min-h-[232px]">
            {showSeedPhrase ? (
              <SeedPhraseDisplay
                words={words}
                clipboardEnabled={clipboardEnabled && hasCredential}
                onCopyToClipboard={onCopyToClipboard}
                showSeedPhrase={showSeedPhrase}
              />
            ) : (
              <SeedPhraseConcealer onReveal={onRevealSeedPhrase} />
            )}
          </Box>
        </CustomTabView>
        <CustomTabView
          tabLabel={strings(`reveal_credential.qr_code`)}
          testID={RevealSeedViewSelectorsIDs.TAB_SCROLL_VIEW_QR_CODE}
        >
          <Box
            flexDirection={BoxFlexDirection.Column}
            alignItems={BoxAlignItems.Center}
            justifyContent={BoxJustifyContent.Center}
            marginTop={4}
            testID={
              RevealSeedViewSelectorsIDs.REVEAL_CREDENTIAL_QR_CODE_IMAGE_ID
            }
          >
            {hasCredential ? (
              <Box
                twClassName="rounded-2xl overflow-hidden p-3"
                style={{ backgroundColor: colors.text.default }}
              >
                <QRCode
                  value={clipboardPrivateCredential}
                  size={qrSize}
                  color={colors.background.default}
                  backgroundColor={colors.text.default}
                  logo={logo}
                  logoSize={Math.round(qrSize * 0.2)}
                  logoBackgroundColor={colors.text.default}
                  logoMargin={4}
                />
              </Box>
            ) : null}
          </Box>
        </CustomTabView>
      </ScrollableTabView>
    </Box>
  );
};

export default SRPTabView;
