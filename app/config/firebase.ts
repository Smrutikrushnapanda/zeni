import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyDTUrj8YGXzLlm-HVxd4SkRnkyOBlTRYng",
  authDomain: "zeni-17b45.firebaseapp.com",
  projectId: "zeni-17b45",
  storageBucket: "zeni-17b45.firebasestorage.app",
  messagingSenderId: "144446056676",
  appId: "1:144446056676:web:4579390fe337c598b5a4f1",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);