import { useState, useEffect, useCallback, useRef } from 'react';
import { useRewardsSeason } from './useRewardsSeason';
import { CursorPaginatedResultsDto, PointsEventDto } from '../types';
import { useGetPointsEventsQuery } from '../services';

// Enhanced page type that tracks the cursor used to fetch it
type PageWithCursor = CursorPaginatedResultsDto<PointsEventDto> & {
  fetchCursor?: string; // The cursor that was used to fetch this page
};

export const useRewardsPointsEvents = () => {
  const { seasonData } = useRewardsSeason();
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [pages, setPages] = useState<PageWithCursor[]>([]);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [isFetchingNextPage, setIsFetchingNextPage] = useState(false);

  // Track cursors that are currently being fetched to prevent duplicates
  const fetchingCursors = useRef(new Set<string | undefined>());
  // Track pending promises for fetchNextPage calls
  const pendingFetches = useRef(
    new Map<
      string | undefined,
      { resolve: (value: unknown) => void; reject: (error: unknown) => void }
    >(),
  );

  // Store previous season ID to detect changes
  const previousSeasonIdRef = useRef<string | undefined>(undefined);

  // Reset function to clear all pages and start fresh
  const reset = useCallback(() => {
    setPages([]);
    setCursor(undefined);
    setHasNextPage(false);
    setIsFetchingNextPage(false);
    fetchingCursors.current.clear();
    pendingFetches.current.clear();
  }, []);

  // Reset pagination when season changes
  useEffect(() => {
    const currentSeasonId = seasonData?.id;
    if (
      currentSeasonId !== previousSeasonIdRef.current &&
      previousSeasonIdRef.current !== undefined
    ) {
      // Season ID changed, reset pagination state
      reset();
    }
    previousSeasonIdRef.current = currentSeasonId;
  }, [seasonData?.id, reset]);

  // Query the current page of data
  const {
    data: currentPageData,
    isSuccess,
    isFetching,
    isError,
    error,
    ...rest
  } = useGetPointsEventsQuery(
    { seasonId: seasonData?.id || '', cursor },
    {
      skip: !seasonData?.id,
      refetchOnMountOrArgChange: 30,
    },
  );

  // Update pages when new data is fetched or when there's an error
  useEffect(() => {
    if (isSuccess && currentPageData) {
      setPages((prev) => {
        // Create enhanced page with fetch cursor
        const enhancedPage: PageWithCursor = {
          ...currentPageData,
          fetchCursor: cursor,
        };

        // If this is the first page (cursor is undefined), reset pages
        if (cursor === undefined) {
          return currentPageData.results.length > 0 ? [enhancedPage] : [];
        }

        // Check if we already have a page fetched with this cursor
        const existingPageIndex = prev.findIndex(
          (page) => page.fetchCursor === cursor,
        );

        if (existingPageIndex >= 0) {
          // Replace existing page with updated data
          const updatedPages = [...prev];
          updatedPages[existingPageIndex] = enhancedPage;
          return updatedPages;
        }

        // Append new page to the end
        return [...prev, enhancedPage];
      });

      setHasNextPage(currentPageData.has_more);

      // Remove cursor from fetching set and resolve pending promise
      fetchingCursors.current.delete(cursor);
      setIsFetchingNextPage(false);

      const pendingFetch = pendingFetches.current.get(cursor);
      if (pendingFetch) {
        pendingFetch.resolve({ success: true, data: currentPageData });
        pendingFetches.current.delete(cursor);
      }
    } else if (isError) {
      // Handle error case - clean up cursor and reject pending promise
      fetchingCursors.current.delete(cursor);
      setIsFetchingNextPage(false);

      const pendingFetch = pendingFetches.current.get(cursor);
      if (pendingFetch) {
        pendingFetch.reject(error);
        pendingFetches.current.delete(cursor);
      }
    }
  }, [currentPageData, isSuccess, isError, error, cursor]);

  // Function to fetch the next page
  const fetchNextPage = useCallback(() => {
    // Get the cursor from the last page
    const lastPage = pages[pages.length - 1];
    const nextCursor = lastPage?.cursor;

    // Check if we can fetch next page
    if (
      !hasNextPage ||
      !nextCursor ||
      fetchingCursors.current.has(nextCursor)
    ) {
      return Promise.resolve({
        success: false,
        message: 'No more pages available or already fetching',
      });
    }

    // Return a promise that will be resolved/rejected when the fetch completes
    return new Promise((resolve, reject) => {
      // Store the promise resolvers
      pendingFetches.current.set(nextCursor, { resolve, reject });

      // Mark cursor as being fetched
      fetchingCursors.current.add(nextCursor);
      setIsFetchingNextPage(true);
      setCursor(nextCursor);
    });
  }, [pages, hasNextPage]);

  return {
    data: pages.length > 0 ? { pages } : undefined,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isSuccess,
    isFetching,
    reset,
    ...rest,
  };
};
