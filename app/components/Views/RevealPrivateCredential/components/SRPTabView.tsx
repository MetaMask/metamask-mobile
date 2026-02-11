import React from 'react';
import { Dimensions, ScrollView, View } from 'react-native';
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomTabView = ScrollView as any;

const SRPTabView = ({
  clipboardPrivateCredential,
  showSeedPhrase,
  clipboardEnabled,
  onRevealSeedPhrase,
  onCopyToClipboard,
  onTabChange,
  styles,
}: SRPTabViewProps) => {
  const { colors } = useTheme();
  const words = clipboardPrivateCredential.split(' ');

  const renderTabBar = () => <TabBar />;

  return (
    <View style={styles.tabContainer}>
      <ScrollableTabView
        renderTabBar={() => renderTabBar()}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onChangeTab={(event: any) => onTabChange(event)}
        style={styles.tabContentContainer}
      >
        <CustomTabView
          tabLabel={strings(`reveal_credential.text`)}
          testID={RevealSeedViewSelectorsIDs.TAB_SCROLL_VIEW_TEXT}
        >
          <View style={styles.seedPhraseView}>
            {showSeedPhrase ? (
              <SeedPhraseDisplay
                words={words}
                clipboardEnabled={clipboardEnabled}
                onCopyToClipboard={onCopyToClipboard}
                styles={styles}
              />
            ) : (
              <SeedPhraseConcealer
                onReveal={onRevealSeedPhrase}
                styles={styles}
              />
            )}
          </View>
        </CustomTabView>
        <CustomTabView
          tabLabel={strings(`reveal_credential.qr_code`)}
          testID={RevealSeedViewSelectorsIDs.TAB_SCROLL_VIEW_QR_CODE}
        >
          <View
            style={styles.qrCodeWrapper}
            testID={
              RevealSeedViewSelectorsIDs.REVEAL_CREDENTIAL_QR_CODE_IMAGE_ID
            }
          >
            <QRCode
              value={clipboardPrivateCredential}
              size={Dimensions.get('window').width - 200}
              logo={logo}
              logoSize={50}
              backgroundColor={colors.background.default}
              color={colors.text.default}
            />
          </View>
        </CustomTabView>
      </ScrollableTabView>
    </View>
  );
};

export default SRPTabView;
