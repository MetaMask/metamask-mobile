import type { ReactNode } from 'react';
import './PhoneFrame.css';

type PhoneFrameProps = {
  children: ReactNode;
};

export function PhoneFrame({ children }: PhoneFrameProps) {
  return (
    <div className="stage">
      <div className="phone">
        <div className="phone-notch" aria-hidden />
        <div className="phone-screen">{children}</div>
        <div className="phone-home-indicator" aria-hidden />
      </div>
    </div>
  );
}
