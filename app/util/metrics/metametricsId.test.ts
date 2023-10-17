import {generateMetametricsId} from "./metametricsId"; // replace with your actual file path

describe('generateMetametricsId', () => {
    const originalRandom = Math.random;
    const originalDateNow = Date.now;

    beforeEach(() => {
        Math.random = () => 0.5;
        Date.now = jest.fn(() => new Date('2021-01-01T00:00:00Z').getTime());
    });

    afterEach(() => {
        Math.random = originalRandom;
        Date.now = originalDateNow;
    });

    it('generates same id from same random number and date', () => {
        const id1 = generateMetametricsId();
        const id2 = generateMetametricsId();
        expect(id1).toEqual(id2);
    });

    it('generates a different id for different random numbers', () => {
        const initialId = generateMetametricsId();
        const newRandom = Math.random() + 0.1;
        Math.random = () => newRandom;
        expect(initialId).not.toEqual(generateMetametricsId());
    });

    it('generates a different id with different date', () => {
        const initialId = generateMetametricsId();
        const newDate = new Date(Date.now() + 1);
        Date.now = jest.fn(() => newDate.getTime());
        expect(initialId).not.toEqual(generateMetametricsId())
    });

    it('produces the same id with same time and random number', () => {
        const expectedId = '0x95ef5baf42e61643a78ad62fd8e628a480d2b93abb20f2c299013c8ba1fa7850';
        Math.random = () => 0.5;
        const id = generateMetametricsId();
        expect(id).toEqual(expectedId);
    });
});
