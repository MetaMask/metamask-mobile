import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { RootStackParamList } from '../../../core/NavigationService/types';

/**
 * Typed Stack Navigator pre-configured with RootStackParamList.
 * Use this instead of createStackNavigator() for type-safe navigation.
 */
export const Stack = createStackNavigator<RootStackParamList>();

/**
 * Typed Bottom Tab Navigator pre-configured with RootStackParamList.
 * Use this instead of createBottomTabNavigator() for type-safe navigation.
 */
export const Tab = createBottomTabNavigator<RootStackParamList>();

/**
 * Re-export the navigator types for convenience.
 */
export type { RootStackParamList };
