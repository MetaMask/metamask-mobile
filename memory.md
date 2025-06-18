# Memory Log

## App Startup Optimization - Browser Tab Deferred Loading

### Context
The MetaMask Mobile app was experiencing slow startup times because the Browser component (including BrowserTab.tsx) was being initialized immediately on app start, even before user authentication. This caused many IO operations and heavy component initialization during the critical app startup phase.

### Solution Implemented
Created a lazy-loading pattern to defer Browser initialization until after successful user authentication:

1. **LazyBrowserWrapper Component** (`app/components/Views/Browser/LazyBrowserWrapper.tsx`)
   - Uses React.lazy() to defer Browser component loading
   - Checks `userLoggedIn` from Redux store before rendering
   - Shows loading spinner for unauthenticated users
   - Uses Suspense for graceful loading fallback

2. **Navigation Updates** (`app/components/Nav/Main/MainNavigator.js`)
   - Replaced direct Browser import with LazyBrowserWrapper
   - Maintains all existing navigation structure and functionality
   - Browser tab now only loads after authentication

### Key Technical Details
- Browser component was already properly exported as default, so lazy loading works seamlessly
- Uses `selectUserLoggedIn` from `app/reducers/user/selectors.ts` 
- Maintains existing UnmountOnBlur functionality for browser tab
- Loading states use theme colors for consistency

### Performance Benefits
- Eliminates heavy Browser/BrowserTab initialization during app startup
- Reduces IO operations before authentication
- Faster PIN/onboarding screen appearance
- Browser functionality remains unchanged once loaded

### Files Modified
- `app/components/Views/Browser/LazyBrowserWrapper.tsx` (new)
- `app/components/Nav/Main/MainNavigator.js` (import change)

### Testing Notes
- Need to verify authentication flow works correctly
- Ensure browser functionality is intact after lazy loading
- Test app startup performance improvements
- Verify no regressions in browser tab behavior

### Future Considerations
- This pattern could be applied to other heavy components in tab navigation
- Consider similar optimizations for Activity and Settings tabs
- Monitor for any edge cases with deeplinks to browser before authentication 