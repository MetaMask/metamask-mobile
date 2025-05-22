const FileSystem = {
  // Directory paths
  documentDirectory: '',
  cacheDirectory: '',
  bundleDirectory: '',
  temporaryDirectory: '',
  applicationDirectory: '',
  applicationSupportDirectory: '',
  libraryDirectory: '',
  sharedDirectory: '',

  // File operations
  readAsStringAsync: jest.fn(),
  writeAsStringAsync: jest.fn(),
  deleteAsync: jest.fn(),
  moveAsync: jest.fn(),
  copyAsync: jest.fn(),
  makeDirectoryAsync: jest.fn(),
  readDirectoryAsync: jest.fn(),
  getInfoAsync: jest.fn(),

  // Network operations
  downloadAsync: jest.fn(),
  uploadAsync: jest.fn(),

  // Asset operations
  createAssetAsync: jest.fn(),
  getContentUriAsync: jest.fn(),

  // Storage info
  getFreeDiskStorageAsync: jest.fn(),
  getTotalDiskCapacityAsync: jest.fn(),

  // Constants
  FileSystemUploadType: {
    BINARY_CONTENT: '',
    MULTIPART: '',
  },
  FileSystemUploadOptions: {
    uploadType: '',
    httpMethod: '',
    headers: {},
    fieldName: '',
    mimeType: '',
    parameters: {},
  },
  FileSystemDownloadOptions: {
    md5: false,
    cache: true,
  },
};

export default FileSystem;
