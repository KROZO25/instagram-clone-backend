// static/search.js

// no firebase‑init/import needed here — just plain fetch to your new endpoint
const input = document.getElementById("user-search");
const list  = document.getElementById("search-results");

input.addEventListener("input", async e => {
  const q = e.target.value.trim();
  if (!q) {
    list.innerHTML = "";
    return;
  }

  try {
    // hit /api/search_users?q=…
    const resp = await fetch(`/api/search_users?q=${encodeURIComponent(q)}`);
    if (!resp.ok) throw new Error(await resp.text());
    const users = await resp.json();

    list.innerHTML = users.map(u =>
      `<li class="list-group-item clickable" data-uid="${u.uid}">` +
         `${u.username}` +
       `</li>`
    ).join("");

    // attach click handlers so each name navigates to that profile
    list.querySelectorAll("li").forEach(li =>
      li.addEventListener("click", () => {
        window.location.href = `/profile?uid=${li.dataset.uid}`;
      })
    );

  } catch (err) {
    console.error("Search error:", err);
  }
});
