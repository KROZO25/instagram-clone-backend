import os
from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
import firebase_admin
from firebase_admin import credentials, firestore

# ── Flask setup ───────────────────────────
app = Flask(
    __name__,
    static_folder="static",
    template_folder="templates"
)
CORS(app)

# ── Firebase Admin SDK init ────────────
cred = credentials.Certificate("serviceAccountKey.json")
firebase_admin.initialize_app(cred)
db = firestore.client()

# ── Routes ───────────────

# 1) Login page
@app.route("/", methods=["GET"])
def index():
    return render_template("index.html")

# 2) Feed page
@app.route("/feed", methods=["GET"])
def feed():
    return render_template("feed.html")

# 3) Profile page
@app.route("/profile", methods=["GET"])
def profile():
    uid = request.args.get("uid", "")
    return render_template("profile.html", uid=uid)

# 4) Followers list page
@app.route("/followers", methods=["GET"])
def followers_page():
    return render_template("followers.html")

# 5) Following list page
@app.route("/following", methods=["GET"])
def following_page():
    return render_template("following.html")

# 6) Create-post page
@app.route("/post", methods=["GET"])
def post_form():
    return render_template("post.html")

# 7) Signup initialization
@app.route("/users/signup", methods=["POST"])
def signup_user():
    data = request.get_json() or {}
    uid, email = data.get("uid"), data.get("email")
    if not uid or not email:
        return jsonify({"error": "missing uid or email"}), 400

    db.collection("User").document(uid).set({
        "Username": email,
        "Followers": [],
        "Following": []
    })
    return ("", 204)

# 8) Login initialization
@app.route("/users/login", methods=["POST"])
def login_user():
    data = request.get_json() or {}
    uid, email = data.get("uid"), data.get("email")
    if not uid or not email:
        return jsonify({"error": "missing uid or email"}), 400

    user_ref = db.collection("User").document(uid)
    if not user_ref.get().exists:
        user_ref.set({
            "Username": email,
            "Followers": [],
            "Following": []
        })
    return ("", 204)

# 9) Follow / Unfollow
@app.route("/users/follow", methods=["POST"])
def follow():
    data = request.get_json() or {}
    uid, target = data.get("uid"), data.get("targetUid")
    if not uid or not target:
        return jsonify({"error": "missing uid or targetUid"}), 400

    db.collection("User").document(uid).update({
        "Following": firestore.ArrayUnion([target])
    })
    db.collection("User").document(target).update({
        "Followers": firestore.ArrayUnion([uid])
    })
    return ("", 204)

@app.route("/users/unfollow", methods=["POST"])
def unfollow():
    data = request.get_json() or {}
    uid, target = data.get("uid"), data.get("targetUid")
    if not uid or not target:
        return jsonify({"error": "missing uid or targetUid"}), 400

    db.collection("User").document(uid).update({
        "Following": firestore.ArrayRemove([target])
    })
    db.collection("User").document(target).update({
        "Followers": firestore.ArrayRemove([uid])
    })
    return ("", 204)

# 10) Create a Post
@app.route("/post", methods=["POST"])
def create_post():
    data = request.get_json() or {}
    username = data.get("username")
    caption = data.get("caption")
    image_url = data.get("imageUrl")
    if not username:
        return jsonify({"error": "missing username"}), 400

    db.collection("Post").add({
        "Username": username,
        "Date": firestore.SERVER_TIMESTAMP,
        "Caption": caption,
        "ImageURL": image_url
    })
    return jsonify({"success": True}), 200

# 11) API: fetch a user's posts (reverse-chron)
@app.route("/api/posts", methods=["GET"])
def api_posts():
    uid = request.args.get("uid", "")
    if not uid:
        return jsonify({"error": "missing uid"}), 400

    user_doc = db.collection("User").document(uid).get()
    if not user_doc.exists:
        return jsonify({"error": "user not found"}), 404
    username = user_doc.to_dict().get("Username")

    posts_q = (
        db.collection("Post")
          .where("Username", "==", username)
          .order_by("Date", direction=firestore.Query.DESCENDING)
    )
    posts = []
    for doc in posts_q.stream():
        d = doc.to_dict()
        ts = d.get("Date")
        posts.append({
            "postId": doc.id,
            "imageUrl": d.get("ImageURL"),
            "caption": d.get("Caption"),
            "date": ts.isoformat() if hasattr(ts, "isoformat") else None
        })
    return jsonify(posts), 200

# 12) API: search users by prefix
@app.route("/api/search_users", methods=["GET"])
def api_search_users():
    q = request.args.get("q", "").strip()
    if not q:
        return jsonify([]), 200

    users_ref = (
        db.collection("User")
          .order_by("Username")
          .start_at([q])
          .end_at([q + "\uf8ff"])
          .limit(20)
    )
    results = []
    for u in users_ref.stream():
        data = u.to_dict()
        results.append({"uid": u.id, "username": data.get("Username")})
    return jsonify(results), 200

# 13) API: feed timeline (own + following)
@app.route("/api/feed", methods=["GET"])
def api_feed():
    uid = request.args.get("uid", "")
    if not uid:
        return jsonify({"error": "missing uid"}), 400

    user_doc = db.collection("User").document(uid).get()
    if not user_doc.exists:
        return jsonify({"error": "user not found"}), 404
    user_data = user_doc.to_dict()

    uids = [uid] + user_data.get("Following", [])
    usernames = []
    for u in uids:
        snap = db.collection("User").document(u).get()
        if snap.exists:
            usernames.append(snap.to_dict().get("Username"))

    if not usernames:
        return jsonify([]), 200

    posts_q = (
        db.collection("Post")
          .where("Username", "in", usernames)
          .order_by("Date", direction=firestore.Query.DESCENDING)
          .limit(50)
    )
    feed = []
    for doc in posts_q.stream():
        d = doc.to_dict()
        ts = d.get("Date")
        feed.append({
            "postId": doc.id,
            "username": d.get("Username"),
            "imageUrl": d.get("ImageURL"),
            "caption": d.get("Caption"),
            "date": ts.isoformat() if hasattr(ts, "isoformat") else None
        })
    return jsonify(feed), 200

# 14) API: add a comment (max 200 chars)
@app.route("/api/comments", methods=["POST"])
def add_comment():
    data = request.get_json() or {}
    post_id = data.get("postId")
    uid = data.get("uid")
    text = (data.get("text") or "").strip()
    if not post_id or not uid or not text or len(text) > 200:
        return jsonify({"error": "invalid input"}), 400

    user_doc = db.collection("User").document(uid).get()
    if not user_doc.exists:
        return jsonify({"error": "user not found"}), 404
    username = user_doc.to_dict().get("Username")

    db.collection("Post").document(post_id) \
      .collection("Comments").add({
        "uid": uid,
        "username": username,
        "text": text,
        "timestamp": firestore.SERVER_TIMESTAMP
      })
    return jsonify({"success": True}), 200

# 15) API: fetch comments (reverse-chron)
@app.route("/api/comments", methods=["GET"])
def get_comments():
    post_id = request.args.get("postId", "")
    if not post_id:
        return jsonify({"error": "missing postId"}), 400

    comments_q = (
        db.collection("Post").document(post_id)
          .collection("Comments")
          .order_by("timestamp", direction=firestore.Query.DESCENDING)
    )
    comments = []
    for doc in comments_q.stream():
        c = doc.to_dict()
        ts = c.get("timestamp")
        comments.append({
            "username": c.get("username"),
            "text": c.get("text"),
            "date": ts.isoformat() if hasattr(ts, "isoformat") else None
        })
    return jsonify(comments), 200

# Run
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)
