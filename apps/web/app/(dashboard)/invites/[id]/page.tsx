import InviteDetailsScreen from "@/screens/invite-details-screen";
import { getCurrentUser } from "@/services";
import { getPendingInviteById } from "@/services/invite";

export default async function InviteDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user } = await getCurrentUser();
  let selfInvite = false;

  const { data: invite } = await getPendingInviteById(id);

  if (invite?.inviter?.id === user?.id) {
    selfInvite = true;
  }

  return <InviteDetailsScreen invite={selfInvite ? undefined : invite} />;
}
