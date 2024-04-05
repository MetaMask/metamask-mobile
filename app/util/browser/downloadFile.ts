import { Linking } from 'react-native';
import Share, { ShareOptions } from 'react-native-share';
import { ShareOpenResult } from 'react-native-share/lib/typescript/types';
import RNFetchBlob, { FetchBlobResponse } from 'rn-fetch-blob';
import { strings } from '../../../locales/i18n';
import Device from '../device';

interface DownloadResult {
  success: boolean;
  message: string;
}

const shareFile = async (filePath: string) => {
  const options: ShareOptions = {
    url: filePath,
    saveToFiles: true,
    failOnCancel: false,
  };
  return await Share.open(options);
};

const checkAppleWalletPass = async (
  response: FetchBlobResponse,
  downloadUrl: string,
) => {
  /**
   * Support native UI for downloading Apple Wallet Passes
   */
  const APPLE_WALLET_PASS_MIME_TYPE = 'application/vnd.apple.pkpass';
  if (
    Device.isIos() &&
    response.respInfo &&
    response.respInfo.headers['Content-Type'] === APPLE_WALLET_PASS_MIME_TYPE
  ) {
    try {
      await Linking.openURL(downloadUrl);
      return {
        success: true,
        message: 'success',
      };
    } catch (err) {
      if (err instanceof Error) {
        return {
          success: false,
          message: err.message.toString(),
        };
      }
      return {
        success: false,
        message: strings('download_files.message'),
      };
    }
  }
};

const downloadFile = async (downloadUrl: string): Promise<DownloadResult> => {
  const { config } = RNFetchBlob;
  const response: FetchBlobResponse = await config({ fileCache: true }).fetch(
    'GET',
    downloadUrl,
  );

  const checkAppleWalletPassResponse = await checkAppleWalletPass(
    response,
    downloadUrl,
  );

  if (checkAppleWalletPassResponse) {
    return checkAppleWalletPassResponse;
  }

  const path = response.path();
  if (path) {
    try {
      const shareResponse: ShareOpenResult = await shareFile(path);
      return {
        success: shareResponse.success,
        message: shareResponse.message,
      };
    } catch (err) {
      if (err instanceof Error) {
        return {
          success: false,
          message: err.message.toString(),
        };
      }
      return {
        success: false,
        message: strings('download_files.message'),
      };
    }
  }
  return {
    success: false,
    message: response.text().toString(),
  };
};

export default downloadFile;
