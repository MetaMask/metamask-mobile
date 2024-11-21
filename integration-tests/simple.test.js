import { screen } from '@testing-library/react-native';
import FixtureBuilder from '../e2e/fixtures/fixture-builder';
import { renderIntegrationTest } from './helper-render';

describe('Simple test', () => {
  it('should be true', () => {
    console.log('testing');
    const preloadedState = new FixtureBuilder().withDefaultFixture().build().state;
    console.log('preloadedState', preloadedState);
    renderIntegrationTest({ preloadedState });
    console.log('screen', screen.toJSON());
    expect(screen.toJSON()).toMatchSnapshot();
  });
});
