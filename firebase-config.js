// firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyC2UfAbjBjXVfS931duYX7pySiSsfiFDzk",
  authDomain: "banco-nexus-site.firebaseapp.com",
  projectId: "banco-nexus-site",
  storageBucket: "banco-nexus-site.appspot.com",
  messagingSenderId: "739524856154",
  appId: "1:739524856154:web:13d0828fd2729e8a794b63"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };
