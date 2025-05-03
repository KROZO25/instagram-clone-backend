import { app } from "./firebase-init.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";

const auth = getAuth(app);

// — DOM references (may be null on some pages)
const emailEl    = document.getElementById("email");
const passEl     = document.getElementById("password");
const btnIn      = document.getElementById("btn-signin");
const btnUp      = document.getElementById("btn-signup");
const btnOut     = document.getElementById("btn-signout");
const postForm   = document.getElementById("post-form");
const btnProfile = document.getElementById("btn-profile");
const btnFeed    = document.getElementById("btn-feed");

// Sign‑Up → also call backend to create User doc
if (btnUp) btnUp.addEventListener("click", () => {
  createUserWithEmailAndPassword(auth, emailEl.value, passEl.value)
    .then(userCred =>
      fetch("/users/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uid:   userCred.user.uid,
          email: userCred.user.email
        })
      })
    )
    .then(res => {
      if (!res.ok) throw new Error("Backend signup failed");
      alert("Signup OK! Now click Sign In");
      return signOut(auth);
    })
    .catch(e => alert("Sign‑up error: " + e.message));
});

// Sign‑In → also notify backend to init on first login
if (btnIn) btnIn.addEventListener("click", () => {
  signInWithEmailAndPassword(auth, emailEl.value, passEl.value)
    .then(userCred =>
      fetch("/users/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uid:   userCred.user.uid,
          email: userCred.user.email
        })
      })
    )
    .catch(e => alert("Sign‑in error: " + e.message));
});

// Sign‑Out
if (btnOut) btnOut.addEventListener("click", () => signOut(auth));

// React to auth state changes
onAuthStateChanged(auth, user => {
  if (user) {
    // hide email/password & sign‑in / sign‑up
    emailEl?.classList.add("d-none");
    passEl?.classList.add("d-none");
    btnIn?.classList.add("d-none");
    btnUp?.classList.add("d-none");

    // show sign‑out & post form
    btnOut?.classList.remove("d-none");
    postForm?.classList.remove("d-none");

    // show Feed link
    if (btnFeed) {
      btnFeed.classList.remove("d-none");
      btnFeed.setAttribute("href", "/feed");
    }

    // show My Profile link and set its URL
    if (btnProfile) {
      btnProfile.classList.remove("d-none");
      btnProfile.setAttribute("href", `/profile?uid=${user.uid}`);
    }
  } else {
    // show email/password & sign‑in / sign‑up
    emailEl?.classList.remove("d-none");
    passEl?.classList.remove("d-none");
    btnIn?.classList.remove("d-none");
    btnUp?.classList.remove("d-none");

    // hide sign‑out, post form, profile & feed
    btnOut?.classList.add("d-none");
    postForm?.classList.add("d-none");
    btnProfile?.classList.add("d-none");
    btnFeed?.classList.add("d-none");
  }
});
