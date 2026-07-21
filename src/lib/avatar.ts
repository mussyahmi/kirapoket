import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { storage } from "./firebase";

// One fixed object per user — uploading overwrites it, so storage never grows
// beyond a single small avatar per user (no history kept).
const avatarRef = (uid: string) => ref(storage, `avatars/${uid}`);

const MAX_DIM = 256; // avatars render at ≤40px; 256 covers retina with room to spare

/**
 * Downscale + center-crop an image file to a square JPEG blob so every stored
 * avatar stays a few tens of KB regardless of the original.
 */
async function toSquareBlob(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const sx = (bitmap.width - side) / 2;
  const sy = (bitmap.height - side) / 2;

  const canvas = document.createElement("canvas");
  canvas.width = MAX_DIM;
  canvas.height = MAX_DIM;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unsupported");
  ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, MAX_DIM, MAX_DIM);
  bitmap.close?.();

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Encode failed"))),
      "image/jpeg",
      0.85
    );
  });
}

/** Uploads (overwriting) the user's avatar and returns its download URL. */
export async function uploadAvatar(uid: string, file: File): Promise<string> {
  const blob = await toSquareBlob(file);
  await uploadBytes(avatarRef(uid), blob, { contentType: "image/jpeg" });
  return getDownloadURL(avatarRef(uid));
}

/** Deletes the user's stored avatar. Missing object is not an error. */
export async function removeAvatar(uid: string): Promise<void> {
  try {
    await deleteObject(avatarRef(uid));
  } catch (e: unknown) {
    if ((e as { code?: string })?.code !== "storage/object-not-found") throw e;
  }
}
