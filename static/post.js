// static/post.js
import { app } from "./firebase-init.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import {
  getStorage,
  ref as storageRef,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-storage.js";

const auth    = getAuth(app);
const storage = getStorage(app);

const imageInput   = document.getElementById("image-input");
const captionInput = document.getElementById("caption-input");
const uploadBtn    = document.getElementById("upload-button");

uploadBtn.addEventListener("click", async (e) => {
  e.preventDefault();
  const user = auth.currentUser;
  if (!user) return alert("Please sign in first");

  const file = imageInput.files[0];
  if (!file) return alert("Select a file");

  // 1) upload to Storage
  const fileRef = storageRef(storage, `posts/${user.uid}/${Date.now()}_${file.name}`);
  await uploadBytes(fileRef, file);
  const url = await getDownloadURL(fileRef);

  // 2) notify your Flask backend
  const resp = await fetch("/post", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: user.email,
      caption:  captionInput.value,
      imageUrl: url
    })
  });
  if (!resp.ok) {
    const err = await resp.json();
    return alert("Post failed: " + err.error);
  }
  alert("Post uploaded!");
  imageInput.value   = "";
  captionInput.value = "";
});
