import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { signInWithCredential, GoogleAuthProvider, signOut } from 'firebase/auth';
import { auth } from '@/app/config/firebase';

const WEB_CLIENT_ID = "144446056676-j4segjbpbuahb64n7k7kik2keqh8a5t2.apps.googleusercontent.com";

export const configureGoogleSignIn = () => {
  GoogleSignin.configure({
    webClientId: WEB_CLIENT_ID,
    offlineAccess: true,
  });
};

export const signInWithGoogle = async () => {
  try {
    await GoogleSignin.hasPlayServices();
    const userInfo = await GoogleSignin.signIn();
    
    // Try multiple ways to get ID token
    let idToken = userInfo.idToken || 
                  userInfo.user?.idToken || 
                  (await GoogleSignin.getTokens()).idToken;
    
    if (!idToken) {
      throw new Error('No ID token received');
    }

    const credential = GoogleAuthProvider.credential(idToken);
    const result = await signInWithCredential(auth, credential);
    
    return {
      success: true,
      user: result.user
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message
    };
  }
};

export const signOutUser = async () => {
  try {
    await signOut(auth);
    await GoogleSignin.signOut();
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};