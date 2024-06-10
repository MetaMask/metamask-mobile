import { Suspense, useEffect, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber/native';
import { ActivityIndicator, Button, View } from 'react-native';
// import Model from './model';
import { useGLTF, useAnimations } from '@react-three/drei/native';
import { useFrame } from '@react-three/fiber/native';
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
    // console.log('x', x, y, z);
    // ref.current.rotation.y += y; //0.01; // Adjust the speed as needed
    // ref.current.rotation.x += x;
    // ref.current.rotation.z += z;
  });

  // console.warn(gltf.animations);

  return (
    <group ref={group}>
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
      <Canvas>
        <ambientLight />
        <Suspense fallback={null}>
          <Model />
        </Suspense>
      </Canvas>
    </View>
  );
}
