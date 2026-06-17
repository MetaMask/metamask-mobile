/** Whether `rank` is a podium position (1, 2 or 3). */
export const isTopRank = (rank: number): boolean => rank >= 1 && rank <= 3;
