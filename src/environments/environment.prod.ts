export const environment = {
  production: true,
  apiUrl: 'https://localhost:7001/api',
  firebase: {
    apiKey: "AIzaSyBbd8jX_UvZGQwNuZEhOmR4U4sfQdJK9-8",
    authDomain: "conoteqlogin-9fe7e.firebaseapp.com",
    projectId: "conoteqlogin-9fe7e",
    storageBucket: "conoteqlogin-9fe7e.firebasestorage.app",
    messagingSenderId: "990143392930",
    appId: "1:990143392930:web:7e02c7914cb1de15e4bbfb",
    measurementId: "G-93P0EQMWKZ"
  },
  grokApi: {
    url: 'https://api.x.ai/v1/chat/completions',
    key: ''  // Add your Groq API key here or use environment variable
  }
};