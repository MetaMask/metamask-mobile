import { Suspense, useEffect, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber/native';
import { ActivityIndicator, Button, View } from 'react-native';
// import Model from './model';
import { useGLTF, useAnimations } from '@react-three/drei/native';
import { useFrame } from '@react-three/fiber/native';
import { MathUtils } from 'three';
import { useAnimatedSensor, SensorType } from 'react-native-reanimated';

// const modelPath = require('./mazda.glb');

// console.log('WELP', useGLTF);

// const Loading = () => <ActivityIndicator color={'blue'} size={'large'} />;

function Model(props) {
  const animatedSensor = useAnimatedSensor(SensorType.GYROSCOPE, {
    interval: 100,
  });
  // console.log('x', x, y, z);
  const animationRef = useRef();
  const countRef = useRef(0);
  const ref = useRef(); // Add this line to create a reference to your model
  const group = useRef();
  const gltf = useGLTF(require('./skeleton.glb'));
  const { actions, names } = useAnimations(gltf.animations, group);

  // console.warn(actions, names);

  const playAnimation = () => {
    // console.warn(Object.keys(actions).length);
    if (animationRef.current) {
      animationRef.current.fadeOut(0.5);
    }
    let animation = actions[names[countRef.current]];

    if (!animation) {
      countRef.current = 0;
      animation = actions[names[countRef.current]];
    }

    animationRef.current = animation;

    // actions[names[countRef.current]]?.fadeOut(0.5);

    animation.fadeIn(0.5).play();

    countRef.current++;
  };

  // Use the useFrame hook to rotate the model
  useFrame((state, delta) => {
    let { x, y, z } = animatedSensor.sensor.value;
    x = ~~(x * 100) / 5000;
    y = ~~(y * 100) / 5000;

    // Threshold for when to start rotating back to the original position
    const threshold = 0.001;
    const recoveryFactor = 3;
    const startingX = 0;
    const startingY = 0;

    if (Math.abs(x) < threshold && Math.abs(y) < threshold) {
      // Interpolate back to original position if sensor values are very small
      ref.current.rotation.x = MathUtils.lerp(
        ref.current.rotation.x,
        startingX,
        delta * recoveryFactor,
      ); // Adjust the 5 multiplier to control the speed
      ref.current.rotation.y = MathUtils.lerp(
        ref.current.rotation.y,
        startingY,
        delta * recoveryFactor,
      );
    } else {
      // Calculate the new rotation values
      const newXRotation = ref.current.rotation.x + x;
      const newYRotation = ref.current.rotation.y + y;

      ref.current.rotation.x = MathUtils.clamp(
        newXRotation,
        -Math.PI / 6,
        Math.PI / 6,
      );
      ref.current.rotation.y = MathUtils.clamp(
        newYRotation,
        -Math.PI / 6,
        Math.PI / 6,
      );
    }
  });

  // console.warn(gltf.animations);

  return (
    <group ref={group} scale={5}>
      <primitive
        onClick={(e) => {
          // count++;
          // console.log('HELLO', count);
          playAnimation();
          // if (count > 0) {
          //   actions[names[count - 1]].fadeOut(0.5);
          // }
          e.stopPropagation();
        }}
        // onPointerUp={() => {
        //   count++;
        //   console.log('HELLO', count);
        // }}
        ref={ref}
        {...props}
        object={gltf.scene}
      />
    </group>
  );
}

export default function App() {
  return (
    <View style={{ flex: 1, backgroundColor: 'white' }}>
      <Canvas
        onCreated={(state) => {
          const gl = state.gl.getContext();
          const pixelStorei = gl.pixelStorei.bind(gl);
          gl.pixelStorei = (...args) => {
            const [parameter] = args;
            switch (parameter) {
              case gl.UNPACK_FLIP_Y_WEBGL:
                return pixelStorei(...args);
            }
          };
        }}
      >
        <ambientLight />
        <Suspense fallback={null}>
          <Model />
        </Suspense>
      </Canvas>
    </View>
  );
}
