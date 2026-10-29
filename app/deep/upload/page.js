import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isAuthed } from "../../../lib/deep.js";
import Uploader from "./Uploader.js";

export const metadata = { title: "16eyes · upload", robots: { index: false, follow: false } };

export default async function UploadPage() {
  if (!isAuthed(await cookies())) redirect("/deep");
  return <Uploader />;
}
