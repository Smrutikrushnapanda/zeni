// app/auth/LoginScreen.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { signInWithGoogle } from '@/app/services/auth';
import { useAuthStore } from '@/store/authStore';
import { useThemeStore } from '@/store/theme.store';
import {
  horizontalScale,
  moderateScale,
  verticalScale,
} from '@/utils/metrics';

export default function LoginScreen() {
  const [loading, setLoading] = useState(false);
  const { setUser, setGuest } = useAuthStore();
  const { theme } = useThemeStore();

  const handleGoogleSignIn = async () => {
    setLoading(true);
    const result = await signInWithGoogle();
    setLoading(false);

    if (result.success && result.user) {
      setUser(result.user);
      Alert.alert('Success', `Welcome, ${result.user.displayName}!`);
      router.replace('/');
    } else {
      Alert.alert('Error', result.error || 'Sign in failed');
    }
  };

  const handleContinueAsGuest = () => {
    setGuest(true);
    router.replace('/');
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.background} />
      
      {/* Logo/Icon Section */}
      <View style={styles.logoContainer}>
        <View
          style={[
            styles.logoCircle,
            { backgroundColor: theme.primary + '20' },
          ]}
        >
          <Ionicons
            name="chatbubbles"
            size={moderateScale(60)}
            color={theme.primary}
          />
        </View>
        <Text style={[styles.title, { color: theme.text }]}>
          Zeni AI
        </Text>
        <Text style={[styles.subtitle, { color: theme.mutedText }]}>
          Your intelligent AI assistant
        </Text>
      </View>

      {/* Buttons Section */}
      <View style={styles.buttonContainer}>
        {/* Google Sign In Button */}
        <TouchableOpacity
          style={[
            styles.googleButton,
            loading && styles.buttonDisabled,
          ]}
          onPress={handleGoogleSignIn}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Ionicons
                name="logo-google"
                size={moderateScale(24)}
                color="#fff"
                style={styles.buttonIcon}
              />
              <Text style={styles.googleButtonText}>
                Continue with Google
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* Divider */}
        <View style={styles.dividerContainer}>
          <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
          <Text style={[styles.dividerText, { color: theme.mutedText }]}>
            or
          </Text>
          <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
        </View>

        {/* Guest Button */}
        <TouchableOpacity
          style={[
            styles.guestButton,
            { borderColor: theme.border },
            loading && styles.buttonDisabled,
          ]}
          onPress={handleContinueAsGuest}
          disabled={loading}
          activeOpacity={0.8}
        >
          <Ionicons
            name="person-outline"
            size={moderateScale(24)}
            color={theme.text}
            style={styles.buttonIcon}
          />
          <Text style={[styles.guestButtonText, { color: theme.text }]}>
            Continue as Guest
          </Text>
        </TouchableOpacity>

        {/* Info Text */}
        <Text style={[styles.infoText, { color: theme.mutedText }]}>
          Sign in to save your chat history and sync across devices
        </Text>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={[styles.footerText, { color: theme.mutedText }]}>
          By continuing, you agree to our{' '}
          <Text style={{ color: theme.primary }}>Terms of Service</Text>
          {' '}and{' '}
          <Text style={{ color: theme.primary }}>Privacy Policy</Text>
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: horizontalScale(24),
  },
  logoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: verticalScale(60),
  },
  logoCircle: {
    width: moderateScale(120),
    height: moderateScale(120),
    borderRadius: moderateScale(60),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: verticalScale(24),
  },
  title: {
    fontSize: moderateScale(36),
    fontWeight: '700',
    marginBottom: verticalScale(8),
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: moderateScale(16),
    textAlign: 'center',
    lineHeight: verticalScale(24),
  },
  buttonContainer: {
    width: '100%',
    paddingBottom: verticalScale(40),
  },
  googleButton: {
    backgroundColor: '#4285F4',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: verticalScale(16),
    paddingHorizontal: horizontalScale(24),
    borderRadius: moderateScale(12),
    marginBottom: verticalScale(16),
    shadowColor: '#4285F4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  googleButtonText: {
    color: '#fff',
    fontSize: moderateScale(16),
    fontWeight: '600',
  },
  guestButton: {
    backgroundColor: 'transparent',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: verticalScale(16),
    paddingHorizontal: horizontalScale(24),
    borderRadius: moderateScale(12),
    borderWidth: 1.5,
    marginBottom: verticalScale(16),
  },
  guestButtonText: {
    fontSize: moderateScale(16),
    fontWeight: '600',
  },
  buttonIcon: {
    marginRight: horizontalScale(12),
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: verticalScale(8),
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    marginHorizontal: horizontalScale(16),
    fontSize: moderateScale(14),
    fontWeight: '500',
  },
  infoText: {
    fontSize: moderateScale(13),
    textAlign: 'center',
    lineHeight: verticalScale(20),
    paddingHorizontal: horizontalScale(16),
  },
  footer: {
    paddingBottom: verticalScale(24),
    paddingHorizontal: horizontalScale(16),
  },
  footerText: {
    fontSize: moderateScale(12),
    textAlign: 'center',
    lineHeight: verticalScale(18),
  },
});