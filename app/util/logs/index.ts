import Engine from '../../core/Engine';
import {
  getApplicationName,
  getBuildNumber,
  getVersion,
} from 'react-native-device-info';
import Share from 'react-native-share'; // eslint-disable-line  import/default
import RNFS from 'react-native-fs';
// eslint-disable-next-line import/no-nodejs-modules
import { Buffer } from 'buffer';
import Logger from '../../util/Logger';
import { RootState } from '../../reducers';
import Device from '../../util/device';

// TODO: Replace "any" with type
// eslint-disable-next-line @typescript-eslint/no-explicit-any, import/prefer-default-export
export const generateStateLogs = (state: any, loggedIn = true): string => {
  const fullState = JSON.parse(JSON.stringify(state));

  delete fullState.engine.backgroundState.NftController;
  delete fullState.engine.backgroundState.TokensController;
  delete fullState.engine.backgroundState.TokenDetectionController;
  delete fullState.engine.backgroundState.NftDetectionController;
  delete fullState.engine.backgroundState.PhishingController;
  delete fullState.engine.backgroundState.AssetsContractController;

  // Remove encrypted vault from logs
  delete fullState.engine.backgroundState.KeyringController.vault;

  if (!loggedIn) {
    return JSON.stringify(fullState);
  }
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { KeyringController } = Engine.context as any;
  const newState = {
    ...fullState,
    engine: {
      ...fullState.engine,
      backgroundState: {
        ...fullState.engine.backgroundState,
        KeyringController: {
          ...fullState.engine.backgroundState.KeyringController,
          keyrings: KeyringController.state.keyrings,
        },
      },
    },
  };

  return JSON.stringify(newState);
};

export const downloadStateLogs = async (
  fullState: RootState,
  loggedIn = true,
) => {
  const appName = await getApplicationName();
  const appVersion = await getVersion();
  const buildNumber = await getBuildNumber();
  const path =
    RNFS.DocumentDirectoryPath +
    `/state-logs-v${appVersion}-(${buildNumber}).json`;
  // A not so great way to copy objects by value

  try {
    const stateLogsWithReleaseDetails = generateStateLogs(
      {
        ...fullState,
        appVersion,
        buildNumber,
      },
      loggedIn,
    );

    let url = `data:text/plain;base64,${new Buffer(
      stateLogsWithReleaseDetails,
    ).toString('base64')}`;
    // // Android accepts attachements as BASE64
    if (Device.isIos()) {
      await RNFS.writeFile(path, stateLogsWithReleaseDetails, 'utf8');
      url = path;
    }

    await Share.open({
      subject: `${appName} State logs -  v${appVersion} (${buildNumber})`,
      title: `${appName} State logs -  v${appVersion} (${buildNumber})`,
      url,
    });
  } catch (err) {
    const e = err as Error;
    Logger.error(e, 'State log error');
  }
};
