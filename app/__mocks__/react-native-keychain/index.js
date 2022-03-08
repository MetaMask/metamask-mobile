export const SECURITY_LEVEL_ANY = 'MOCK_SECURITY_LEVEL_ANY';
export const SECURITY_LEVEL_SECURE_SOFTWARE = 'MOCK_SECURITY_LEVEL_SECURE_SOFTWARE';
export const SECURITY_LEVEL_SECURE_HARDWARE = 'MOCK_SECURITY_LEVEL_SECURE_HARDWARE';
export const setGenericPassword = jest.fn().mockResolvedValue();
export const getGenericPassword = jest.fn().mockResolvedValue();
export const resetGenericPassword = jest.fn().mockResolvedValue();
export const getSupportedBiometryType = () => Promise.resolve('FaceId');
