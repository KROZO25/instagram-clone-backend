import { getAuth, onAuthStateChanged } 
  from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";

onAuthStateChanged(getAuth(), async user => {
  if (!user) return window.location.href="/";
  const uid = user.uid;

  const resp = await fetch(`/api/feed?uid=${uid}`);
  const feed = await resp.json();
  const tl   = document.getElementById("timeline");
  const nop  = document.getElementById("no-tl");

  if (!feed.length) {
    return nop.classList.remove("d-none");
  }

  feed.forEach(post => {
    const div = document.createElement("div");
    div.className = "entry";
    div.innerHTML = `
      <h5>${post.username}</h5>
      <img src="${post.imageUrl}" class="img-fluid mb-2"/>
      <p>${post.caption}</p>
      <small class="text-muted">${new Date(post.date).toLocaleString()}</small>
    `;
    tl.appendChild(div);
  });
});
