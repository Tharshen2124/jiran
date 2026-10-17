import Link from "next/link";
import { PageHeader } from "../../ui";

export default function Page() {
  return (
    <>
      <PageHeader title="Sign-in failed">Google sign-in didn&apos;t complete. Please try again.</PageHeader>
      <Link href="/" className="font-semibold underline">
        Back to open favours
      </Link>
    </>
  );
}
