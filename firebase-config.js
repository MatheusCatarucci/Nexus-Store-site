// firebase-config.js

const firebaseConfig = {
  apiKey: "AIzaSyC2UfAbjBjXVfS931duYX7pySiSsfiFDzk",
  authDomain: "banco-nexus-site.firebaseapp.com",
  projectId: "banco-nexus-site",
  storageBucket: "banco-nexus-site.appspot.com",
  messagingSenderId: "739524856154",
  appId: "1:739524856154:web:13d0828fd2729e8a794b63"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
