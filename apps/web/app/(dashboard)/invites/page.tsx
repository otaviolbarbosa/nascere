"use server";
import InvitesScreen from "@/screens/invites-screen";
import { getMyInvites } from "@/services/invite";

export default async function InvitesPage() {
  const { data: invites } = await getMyInvites();

  return <InvitesScreen invites={invites || []} />;
}
