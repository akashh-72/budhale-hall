// Firebase Configuration for Web Admin Panel
const firebaseConfig = {
    apiKey: "AIzaSyAvGLlhgSzpnmaKL9Qyg66OdeWBgvBEn4M",
    authDomain: "budhale-halll.firebaseapp.com",
    databaseURL: "https://budhale-halll-default-rtdb.firebaseio.com",
    projectId: "budhale-halll",
    storageBucket: "budhale-halll.firebasestorage.app",
    messagingSenderId: "628751665142",
    appId: "1:628751665142:web:5a2f6b0b6442b5e6c4a9d7"
};

// Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
} else {
    firebase.app(); // if already initialized
}

const db = firebase.database();
