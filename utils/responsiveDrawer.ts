// utils/responsiveDrawer.ts
import { Dimensions, Platform } from 'react-native';

export const getDrawerWidth = () => {
  const { width, height } = Dimensions.get('window');
  
  // Check if it's a tablet (common tablet detection logic)
  const isTablet = 
    (Platform.OS === 'ios' && Platform.isPad) ||
    (Platform.OS === 'android' && (width >= 600 || height >= 600)) ||
    width >= 768;
  
  if (isTablet) {
    // For tablets - show more content
    return Math.min(400, width * 0.3); // 30% of screen or max 400px
  } else {
    // For phones - wider drawer
    return width * 0.85; // 85% of screen
  }
};