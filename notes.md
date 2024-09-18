# Types to deduce

## Immediately deducible types
- [ ] `props` in `GenericButton` function parameter: React.FC props object
- [ ] `onPress` in `TouchableNativeFeedback`: () => void
- [ ] `style` in `View`: React.CSSProperties | undefined

## Types requiring information gathering
- [ ] `children` (currently `PropTypes.any`): Needs investigation to determine specific React node types
- [ ] `style` in propTypes (currently `ViewPropTypes.style`): Need to check if ViewPropTypes is still valid in React Native
- [ ] `onPress` in propTypes (currently `PropTypes.func`): Confirm if it should be optional or required

## Notes
- Remove `PropTypes` usage after conversion
- Update component to use `interface` for props
- Consider adding `React.FC` type to the component
- Investigate if `TouchableNativeFeedback.SelectableBackground()` needs type annotation
