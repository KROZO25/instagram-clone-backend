// static/firebase-init.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";

// initializeApp will pick up window.firebaseConfig from env.js
export const app = initializeApp(window.firebaseConfig);
