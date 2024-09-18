# SelectorButton TypeScript Conversion Notes

## Completed Tasks:
- [x] Interface for SelectorButton props (onPress, disabled, children)
- [x] Replace deprecated PropTypes with TypeScript types
- [x] Specific type for children prop (React.ReactNode)

## Types to be immediately defined:
- [ ] Type for createStyles function parameter (colors)

## Types requiring further investigation:
- [ ] Return type of useTheme hook
- [ ] Specific type for spread props (...props)
- [ ] Return type for onPress function

## Additional considerations:
- [ ] Consider updating FontAwesome icon import to use the new Icon component

## Progress:
- Initial TypeScript conversion completed
- yarn tsc ran successfully without errors

## DEVIN_TODOs:
//DEVIN_TODO: Investigate the structure of the colors object returned by useTheme
//DEVIN_TODO: Determine the exact type of the spread props
