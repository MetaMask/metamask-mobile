import { useEffect, useRef } from 'react';
import { Accelerometer } from 'expo-sensors';

interface ShakeDetectorProps {
  onShake: () => void;
  sensibility?: number;
}

const ShakeDetector: React.FC<ShakeDetectorProps> = ({
  onShake,
  sensibility = 1.8,
}) => {
  const lastShakeTime = useRef(0);

  useEffect(() => {
    Accelerometer.setUpdateInterval(150);

    const onUpdate = ({ x, y, z }: { x: number; y: number; z: number }) => {
      const acceleration = Math.sqrt(x * x + y * y + z * z);
      if (acceleration >= sensibility) {
        const now = Date.now();
        if (now - lastShakeTime.current > 1000) {
          lastShakeTime.current = now;
          onShake();
        }
      }
    };

    const subscription = Accelerometer.addListener(onUpdate);

    return () => {
      subscription?.remove();
    };
  }, [onShake, sensibility]);

  return null;
};

export default ShakeDetector;
