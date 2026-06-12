import React from 'react';

interface TopRankAvatarProps {
  children: React.ReactNode;
}

const TopRankAvatar: React.FC<TopRankAvatarProps> = ({ children }) => (
  <>{children}</>
);

export default TopRankAvatar;
