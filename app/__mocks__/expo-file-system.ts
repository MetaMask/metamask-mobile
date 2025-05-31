export const documentDirectory = '';
export const cacheDirectory = '';
export const bundleDirectory = '';
export const temporaryDirectory = '';
export const applicationDirectory = '';
export const applicationSupportDirectory = '';
export const libraryDirectory = '';
export const sharedDirectory = '';

// File operations
export const readAsStringAsync = jest.fn();
export const writeAsStringAsync = jest.fn();
export const deleteAsync = jest.fn();
export const moveAsync = jest.fn();
export const copyAsync = jest.fn();
export const makeDirectoryAsync = jest.fn();
export const readDirectoryAsync = jest.fn();
export const getInfoAsync = jest.fn();

// Network operations
export const downloadAsync = jest.fn();
export const uploadAsync = jest.fn();

// Asset operations
export const createAssetAsync = jest.fn();
export const getContentUriAsync = jest.fn();

// Storage info
export const getFreeDiskStorageAsync = jest.fn();
export const getTotalDiskCapacityAsync = jest.fn();

// Constants
export const FileSystemUploadType = {
  BINARY_CONTENT: '',
  MULTIPART: '',
};

export const FileSystemUploadOptions = {
  uploadType: '',
  httpMethod: '',
  headers: {},
  fieldName: '',
  mimeType: '',
  parameters: {},
};

export const FileSystemDownloadOptions = {
  md5: false,
  cache: true,
};
