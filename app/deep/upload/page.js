import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isAuthed, isOwner, ownerPasswordIsSet } from "../../../lib/deep.js";
import Uploader from "./Uploader.js";
import OwnerLogin from "./OwnerLogin.js";

export const metadata = { title: "16eyes · upload", robots: { index: false, follow: false } };

export default async function UploadPage() {
  const jar = await cookies();
  if (!isAuthed(jar)) redirect("/deep");
  // fans who know the room password still can't fill it: this page needs the owner password too
  if (!isOwner(jar)) return <OwnerLogin ready={ownerPasswordIsSet()} />;
  return <Uploader />;
}
