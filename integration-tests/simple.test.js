import { act, screen } from '@testing-library/react-native';
import FixtureBuilder from '../e2e/fixtures/fixture-builder';
import { renderIntegrationTest } from './helper-render';

describe('Simple test', () => {
  it('should be true', async () => {
    const preloadedState = new FixtureBuilder().withDefaultFixture().build().state;
    await act(async () => {
      await renderIntegrationTest({ preloadedState });
    });
    expect(screen.toJSON()).toMatchSnapshot();
  });
});
