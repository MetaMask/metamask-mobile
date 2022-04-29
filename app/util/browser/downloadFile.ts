import Share, { ShareOptions } from 'react-native-share';
import { ShareOpenResult } from 'react-native-share/lib/typescript/types';
import RNFetchBlob, { FetchBlobResponse } from 'rn-fetch-blob';
import { strings } from '../../../locales/i18n';

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

const downloadFile = async (downloadUrl: string): Promise<DownloadResult> => {
  const { config } = RNFetchBlob;
  const response: FetchBlobResponse = await config({ fileCache: true }).fetch(
    'GET',
    downloadUrl,
  );
  if (response.path()) {
    try {
      const shareResponse: ShareOpenResult = await shareFile(response.path());
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
