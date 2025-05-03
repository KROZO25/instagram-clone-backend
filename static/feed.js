// static/feed.js

import { app } from "./firebase-init.js";
import { getAuth, onAuthStateChanged } 
  from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";

const auth = getAuth(app);

const container = document.getElementById("feed-container");
const noFeed    = document.getElementById("no-feed");

// helper to create an element with classes
function elt(tag, classes="", innerHTML="") {
  const e = document.createElement(tag);
  if (classes) e.className = classes;
  if (innerHTML) e.innerHTML = innerHTML;
  return e;
}

onAuthStateChanged(auth, async user => {
  if (!user) return window.location.href = "/";

  const res = await fetch(`/api/feed?uid=${user.uid}`);
  if (!res.ok) {
    console.error("Feed error:", await res.text());
    noFeed.textContent = "Error loading feed.";
    noFeed.classList.remove("d-none");
    return;
  }

  const posts = await res.json();
  if (posts.length === 0) {
    noFeed.classList.remove("d-none");
    return;
  }

  for (const p of posts) {
    const col = elt("div","col-12");
    const card = elt("div","card mb-3");
    col.appendChild(card);

    // header + image + body
    card.innerHTML = `
      <div class="card-header"><strong>${p.username}</strong></div>
      <img src="${p.imageUrl}" class="card-img-top" alt="Post image">
      <div class="card-body">
        <p class="card-text">${p.caption||""}</p>
        <small class="text-muted">${new Date(p.date).toLocaleString()}</small>
      </div>
    `;

    // comments container
    const commentsDiv = elt("div","card-body pt-0");
    card.appendChild(commentsDiv);

    // function to load comments (optionally all)
    let allComments = [];
    async function loadComments(showAll=false) {
      // fetch from API
      const cRes = await fetch(`/api/comments?postId=${p.postId}`);
      if (!cRes.ok) return;
      allComments = await cRes.json();
      renderComments(showAll);
    }

    function renderComments(showAll) {
      commentsDiv.innerHTML = ""; 
      const toShow = showAll ? allComments : allComments.slice(0,5);
      // list comments
      toShow.forEach(c => {
        const cEl = elt("div","mb-2",`
          <strong>${c.username}</strong> ${c.text}
          <div><small class="text-muted">${new Date(c.date).toLocaleString()}</small></div>
        `);
        commentsDiv.appendChild(cEl);
      });
      // "show more" button
      if (!showAll && allComments.length > 5) {
        const btn = elt("button","btn btn-link btn-sm","Show more comments…");
        btn.onclick = () => renderComments(true);
        commentsDiv.appendChild(btn);
      }
      // add‑comment form
      const formDiv = elt("div","mt-3");
      const input = elt("textarea","form-control mb-2");
      input.rows = 2;
      input.maxLength = 200;
      input.placeholder = "Add a comment… (max 200 chars)";
      const btn = elt("button","btn btn-primary btn-sm","Post");
      btn.onclick = async () => {
        const text = input.value.trim();
        if (!text) return;
        if (text.length>200) {
          alert("Comment must be ≤200 characters");
          return;
        }
        const post = await fetch("/api/comments", {
          method:"POST",
          headers:{"Content-Type":"application/json"},
          body: JSON.stringify({
            postId: p.postId,
            uid: user.uid,
            text
          })
        });
        if (post.ok) {
          input.value = "";
          await loadComments(true);
        } else {
          alert("Failed to post comment");
        }
      };
      formDiv.appendChild(input);
      formDiv.appendChild(btn);
      commentsDiv.appendChild(formDiv);
    }

    // initial load only first 5
    await loadComments(false);

    container.appendChild(col);
  }
});
