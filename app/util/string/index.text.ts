import { sanitizeString } from '.';

describe('sanitizeString', () => {
    it('should escape all occurences of \u202E in text', async () => {
        const result = sanitizeString("test \u202E test \u202E test");
        expect(result).toEqual("test \\u202E test \\u202E test");
    });
});
