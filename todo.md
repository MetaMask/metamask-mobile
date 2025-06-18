# Todo List

## Current Tasks

### 🚀 App Startup Optimization - Defer BrowserTab Initialization
**Status:** In Progress  
**Priority:** High  
**Description:** Optimize app startup by deferring BrowserTab initialization until after user enters PIN and successfully signs in.

**Current Issue:** 
- BrowserTab component is loaded immediately on app start even before authentication
- This causes many IO operations during app startup which slows down the overall app start time
- User experiences delays in reaching PIN screen or onboarding screen

**Solution Approach:**
1. Create a lazy-loaded BrowserTab wrapper component
2. Implement conditional rendering based on authentication state
3. Use React.lazy and Suspense for deferred loading
4. Ensure proper cleanup and state management

**Files to Modify:**
- `app/components/Nav/Main/MainNavigator.js` - HomeTabs browser tab configuration
- `app/components/Views/Browser/index.js` - Browser component wrapper
- Create new lazy wrapper for BrowserTab component

**Technical Details:**
- Current: Browser tab is always rendered in HomeTabs with UnmountOnBlur
- Target: Only initialize BrowserTab after successful authentication
- Use authentication state from Redux store to control rendering
- Maintain existing functionality once loaded

**Progress:**
- [x] Analyze current app structure and navigation flow
- [x] Identify BrowserTab initialization points
- [x] Implement lazy-loaded BrowserTab wrapper (`LazyBrowserWrapper.tsx`)
- [x] Update HomeTabs to use conditional rendering (modified `MainNavigator.js`)
- [ ] Test authentication flow works correctly
- [ ] Verify browser functionality after authentication
- [ ] Test app startup performance improvements

**Implementation Details:**
- Created `LazyBrowserWrapper.tsx` that uses React.lazy to defer Browser loading
- Component checks `userLoggedIn` from Redux store before rendering Browser
- Shows loading spinner while unauthenticated or while lazy-loading
- Updated `MainNavigator.js` to use `LazyBrowserWrapper` instead of direct `Browser`
- Maintains all existing functionality and navigation structure

---

## Completed Tasks
(None yet)

## Future Tasks
(To be added) 