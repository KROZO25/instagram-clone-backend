// static/follow-utils.js
import {
    getFirestore,
    doc,
    updateDoc,
    arrayUnion,
    arrayRemove
  } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";
  import { app } from "./firebase-init.js";
  
  const db = getFirestore(app);
  
  /**
   * currentUid follows targetUid
   */
  export async function follow(targetUid, currentUid) {
    await updateDoc(doc(db, "User", currentUid), {
      Following: arrayUnion(targetUid)
    });
    await updateDoc(doc(db, "User", targetUid), {
      Followers: arrayUnion(currentUid)
    });
  }
  
  /**
   * currentUid unfollows targetUid
   */
  export async function unfollow(targetUid, currentUid) {
    await updateDoc(doc(db, "User", currentUid), {
      Following: arrayRemove(targetUid)
    });
    await updateDoc(doc(db, "User", targetUid), {
      Followers: arrayRemove(currentUid)
    });
  }
  