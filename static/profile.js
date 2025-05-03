// static/profile.js

import { app } from "./firebase-init.js";
import { renderLoginUI } from "./firebase-auth.js";

import { getAuth, onAuthStateChanged } 
  from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import {
  getFirestore, doc, getDoc, updateDoc, arrayUnion, arrayRemove
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

const auth = getAuth(app);
const db   = getFirestore(app);

// Render the existing sign‑in/sign‑up controls
renderLoginUI(document.getElementById("auth-controls"));

// Read the profile UID from the URL
const params     = new URLSearchParams(window.location.search);
const profileUid = params.get("uid");

// DOM references
const eProfile   = document.getElementById("profile-email");
const btnFollow  = document.getElementById("btn-follow");
const eFollowers = document.getElementById("followers-count");
const eFollowing = document.getElementById("following-count");
const ePosts     = document.getElementById("posts-container");
const eNoPosts   = document.getElementById("no-posts");

let meUid, isFollowing;

onAuthStateChanged(auth, async user => {
  if (!user) return window.location.href = "/";
  meUid = user.uid;

  // Load the profile user’s data
  const profRef  = doc(db, "User", profileUid);
  const profSnap = await getDoc(profRef);
  if (!profSnap.exists()) {
    eProfile.textContent = "Unknown user";
    return;
  }
  const data = profSnap.data();

  // Display username/email
  eProfile.textContent = data.Username;

  // Followers / Following counts
  const follArr = data.Followers || [];
  const ingArr  = data.Following || [];
  eFollowers.textContent = `${follArr.length} Followers`;
  eFollowing.textContent = `${ingArr.length} Following`;
  eFollowers.classList.remove("d-none");
  eFollowing.classList.remove("d-none");
  eFollowers.onclick = () => window.location.href = `/followers?uid=${profileUid}`;
  eFollowing.onclick = () => window.location.href = `/following?uid=${profileUid}`;

  // Show follow/unfollow button if not own profile
  if (meUid !== profileUid) {
    isFollowing = follArr.includes(meUid);
    btnFollow.textContent = isFollowing ? "Unfollow" : "Follow";
    btnFollow.classList.remove("d-none");
    btnFollow.onclick = async () => {
      if (isFollowing) {
        await updateDoc(profRef,  { Followers: arrayRemove(meUid) });
        await updateDoc(doc(db, "User", meUid), { Following: arrayRemove(profileUid) });
        isFollowing = false;
        btnFollow.textContent = "Follow";
        eFollowers.textContent = `${follArr.length - 1} Followers`;
      } else {
        await updateDoc(profRef,  { Followers: arrayUnion(meUid) });
        await updateDoc(doc(db, "User", meUid), { Following: arrayUnion(profileUid) });
        isFollowing = true;
        btnFollow.textContent = "Unfollow";
        eFollowers.textContent = `${follArr.length + 1} Followers`;
      }
    };
  }

  // Fetch and render posts via REST API
  const resp = await fetch(`/api/posts?uid=${profileUid}`);
  if (!resp.ok) {
    eNoPosts.textContent = "Error loading posts.";
    eNoPosts.classList.remove("d-none");
    return;
  }
  const posts = await resp.json();
  if (posts.length === 0) {
    eNoPosts.classList.remove("d-none");
    return;
  }
  posts.forEach(p => {
    const col = document.createElement("div");
    col.className = "col-12 mb-4";
    col.innerHTML = `
      <div class="card">
        <img src="${p.imageUrl}" class="card-img-top" alt="Post image">
        <div class="card-body">
          <p class="card-text">${p.caption || ""}</p>
          <small class="text-muted">${new Date(p.date).toLocaleString()}</small>
        </div>
      </div>`;
    ePosts.appendChild(col);
  });
});
