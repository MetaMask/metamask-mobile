import { rpcErrors } from '@metamask/rpc-errors';
import sendMetadata from './index';
import { MESSAGE_TYPE } from '../../createTracingMiddleware';

describe('sendMetadata', () => {
    const mockNext = jest.fn();
    const mockEnd = jest.fn();
    const mockAddSubjectMetadata = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('defines correct properties', () => {
        expect(sendMetadata).toHaveProperty('methodNames', [MESSAGE_TYPE.SEND_METADATA]);
        expect(sendMetadata).toHaveProperty('implementation');
        expect(sendMetadata).toHaveProperty('hookNames');
        expect(sendMetadata.hookNames).toEqual({
            addSubjectMetadata: true,
            subjectType: true,
        });
    });

    describe('implementation (sendMetadataHandler)', () => {
        const mockOrigin = 'https://test.com';
        const mockSubjectType = 'website';
        const options = {
            addSubjectMetadata: mockAddSubjectMetadata,
            subjectType: mockSubjectType,
        };

        describe('when params are valid', () => {
            it('processes metadata and calls addSubjectMetadata with all fields', () => {
                // Arrange
                const req = {
                    origin: mockOrigin,
                    params: {
                        name: 'Test Dapp',
                        icon: 'https://test.com/icon.png',
                        description: 'Test description',
                    },
                };
                const res = { result: null };

                // Act
                sendMetadata.implementation(req, res, mockNext, mockEnd, options);

                // Assert
                expect(mockAddSubjectMetadata).toHaveBeenCalledWith({
                    description: 'Test description',
                    iconUrl: 'https://test.com/icon.png',
                    name: 'Test Dapp',
                    subjectType: mockSubjectType,
                    origin: mockOrigin,
                });
                expect(res.result).toBe(true);
                expect(mockEnd).toHaveBeenCalled();
                expect(mockNext).not.toHaveBeenCalled();
            });

            it('handles null values for optional fields', () => {
                // Arrange
                const req = {
                    origin: mockOrigin,
                    params: {
                        name: null,
                        icon: null,
                        description: 'Test description',
                    },
                };
                const res = { result: null };

                // Act
                sendMetadata.implementation(req, res, mockNext, mockEnd, options);

                // Assert
                expect(mockAddSubjectMetadata).toHaveBeenCalledWith({
                    description: 'Test description',
                    iconUrl: null,
                    name: null,
                    subjectType: mockSubjectType,
                    origin: mockOrigin,
                });
                expect(res.result).toBe(true);
                expect(mockEnd).toHaveBeenCalled();
            });

            it('processes metadata with only custom fields', () => {
                // Arrange
                const req = {
                    origin: mockOrigin,
                    params: {
                        // No name or icon provided, but still a valid object
                        customField: 'custom value',
                    },
                };
                const res = { result: null };

                // Act
                sendMetadata.implementation(req, res, mockNext, mockEnd, options);

                // Assert
                expect(mockAddSubjectMetadata).toHaveBeenCalledWith({
                    customField: 'custom value',
                    iconUrl: null,
                    name: null,
                    subjectType: mockSubjectType,
                    origin: mockOrigin,
                });
                expect(res.result).toBe(true);
                expect(mockEnd).toHaveBeenCalled();
            });
        });

        describe('when params are invalid', () => {
            it('returns an error for null params', () => {
                // Arrange
                const req = {
                    origin: mockOrigin,
                    params: null,
                };
                const res = { result: null };

                // Act
                sendMetadata.implementation(req, res, mockNext, mockEnd, options);

                // Assert
                expect(mockAddSubjectMetadata).not.toHaveBeenCalled();
                expect(mockEnd).toHaveBeenCalledWith(expect.any(Error));
                expect(mockEnd.mock.calls[0][0].code).toBe(rpcErrors.invalidParams().code);
            });

            it('returns an error for array params', () => {
                // Arrange
                const req = {
                    origin: mockOrigin,
                    params: ['invalid', 'array', 'params'],
                };
                const res = { result: null };

                // Act
                sendMetadata.implementation(req, res, mockNext, mockEnd, options);

                // Assert
                expect(mockAddSubjectMetadata).not.toHaveBeenCalled();
                expect(mockEnd).toHaveBeenCalledWith(expect.any(Error));
                expect(mockEnd.mock.calls[0][0].code).toBe(rpcErrors.invalidParams().code);
            });

            it('returns an error for string params', () => {
                // Arrange
                const req = {
                    origin: mockOrigin,
                    params: 'invalid string params',
                };
                const res = { result: null };

                // Act
                sendMetadata.implementation(req, res, mockNext, mockEnd, options);

                // Assert
                expect(mockAddSubjectMetadata).not.toHaveBeenCalled();
                expect(mockEnd).toHaveBeenCalledWith(expect.any(Error));
                expect(mockEnd.mock.calls[0][0].code).toBe(rpcErrors.invalidParams().code);
            });

            it('returns an error for undefined params', () => {
                // Arrange
                const req = {
                    origin: mockOrigin,
                    // No params
                };
                const res = { result: null };

                // Act
                sendMetadata.implementation(req, res, mockNext, mockEnd, options);

                // Assert
                expect(mockAddSubjectMetadata).not.toHaveBeenCalled();
                expect(mockEnd).toHaveBeenCalledWith(expect.any(Error));
                expect(mockEnd.mock.calls[0][0].code).toBe(rpcErrors.invalidParams().code);
            });
        });
    });
}); 