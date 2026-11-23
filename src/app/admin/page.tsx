import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import AdminDashboard from "@/components/AdminDashboard";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Admin dashboard" };

export default function AdminPage() {
  if (getSession()?.role !== "admin") redirect("/account?next=%2Fadmin");
  return <AdminDashboard />;
}
