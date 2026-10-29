// Hands the upload page a short-lived token so files go straight from the browser to Vercel Blob
// (no size limit from our server). Only Vince (the owner key) gets a token, and only for the room's folders.
import { handleUpload } from "@vercel/blob/client";
import { KINDS, isOwner, noStore } from "../../../../lib/deep.js";

const TYPES = ["image/*", "video/*", "audio/*", "application/pdf", "application/octet-stream"];

export async function POST(request) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return Response.json({ error: "Storage isn't switched on yet." }, { status: 503, headers: noStore });
  const owner = isOwner(request);
  const body = await request.json();
  try {
    const result = await handleUpload({
      body, request,
      onBeforeGenerateToken: async pathname => {
        if (!owner) throw new Error("Only the owner can fill the room.");
        const [root, kind] = pathname.split("/");
        if (root !== "deep" || !KINDS.includes(kind)) throw new Error("Unknown folder.");
        return { allowedContentTypes: TYPES, maximumSizeInBytes: 500 * 1024 * 1024, addRandomSuffix: true };
      },
      onUploadCompleted: async () => {},
    });
    return Response.json(result, { headers: noStore });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 400, headers: noStore });
  }
}
