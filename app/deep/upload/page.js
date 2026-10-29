import { cookies } from "next/headers";
import { isOwner, ownerPasswordIsSet } from "../../../lib/deep.js";
import Uploader from "./Uploader.js";
import OwnerLogin from "./OwnerLogin.js";

export const metadata = { title: "16eyes · upload", robots: { index: false, follow: false } };

export default async function UploadPage() {
  const jar = await cookies();
  // only Vince can fill the room: this page needs the owner password
  if (!isOwner(jar)) return <OwnerLogin ready={ownerPasswordIsSet()} />;
  return <Uploader />;
}
