import type { Metadata } from "next";
import AccountForm from "@/components/AccountForm";

export const metadata: Metadata = { title: "Account" };

export default function AccountPage({ searchParams }: { searchParams: { next?: string } }) {
  return (
    <div className="container page">
      <AccountForm nextPath={searchParams.next ?? ""} />
    </div>
  );
}
