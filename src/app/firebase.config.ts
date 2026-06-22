// Alternative Firebase configuration
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyBbd8jX_UvZGQwNuZEhOmR4U4sfQdJK9-8",
  authDomain: "conoteqlogin-9fe7e.firebaseapp.com",
  projectId: "conoteqlogin-9fe7e",
  storageBucket: "conoteqlogin-9fe7e.firebasestorage.app",
  messagingSenderId: "990143392930",
  appId: "1:990143392930:web:7e02c7914cb1de15e4bbfb",
  measurementId: "G-93P0EQMWKZ"
};

// Initialize Firebase
console.log('🔧 Initializing Firebase app...');
const app = initializeApp(firebaseConfig);
console.log('✅ Firebase app initialized:', app);

// Initialize Firebase Authentication and get a reference to the service
console.log('🔧 Initializing Firebase Auth...');
const auth = getAuth(app);
console.log('✅ Firebase Auth initialized:', auth);

export { auth, app };