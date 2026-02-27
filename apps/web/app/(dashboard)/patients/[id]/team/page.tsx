"use client";

import { leaveTeamAction } from "@/actions/leave-team-action";
import { ConfirmModal } from "@/components/shared/confirm-modal";
import { EmptyState } from "@/components/shared/empty-state";
import { LoadingPatientTeam } from "@/components/shared/loading-state";
import TeamMemberCard from "@/components/shared/team-member-card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import InviteProfessionalModal from "@/modals/invite-professional-modal";
import type { ProfessionalType, TeamMember } from "@/types";
import type { Tables } from "@nascere/supabase/types";
import { UserMinus, UserPlus, Users } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function PatientTeamPage() {
  const params = useParams();
  const { user } = useAuth();
  const patientId = params.id as string;

  const [patient, setPatient] = useState<Tables<"patients"> | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);

  useEffect(() => {
    async function fetchData() {
      const [patientRes, teamRes] = await Promise.all([
        fetch(`/api/patients/${patientId}`),
        fetch(`/api/patients/${patientId}/team`),
      ]);
      const [patientData, teamData] = await Promise.all([patientRes.json(), teamRes.json()]);
      setPatient(patientData.patient ?? null);
      setTeamMembers(teamData.teamMembers ?? []);
      setLoading(false);
    }
    fetchData();
  }, [patientId]);

  const { execute: executeLeaveTeam, status: leaveStatus } = useAction(leaveTeamAction, {
    onSuccess: () => {
      toast.success("Você saiu da equipe");
      window.location.href = "/patients";
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? "Erro ao sair da equipe");
      setLeaveDialogOpen(false);
    },
  });

  const isLeaving = leaveStatus === "executing";

  function handleLeaveTeam() {
    if (!user?.id) return;
    executeLeaveTeam({ patientId });
  }

  if (loading) return <LoadingPatientTeam />;
  if (!patient) return null;

  const usedTypes = teamMembers.map((m) => m.professional_type);
  const availableTypes = (["obstetra", "enfermeiro", "doula"] as ProfessionalType[]).filter(
    (t) => !usedTypes.includes(t),
  );
  const isUserInTeam = teamMembers.some((m) => m.professional_id === user?.id);

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-lg">Equipe de Cuidado</h2>
          <div className="flex gap-2">
            {isUserInTeam && (
              <Button variant="outline" onClick={() => setLeaveDialogOpen(true)}>
                <UserMinus className="mr-2 h-4 w-4" />
                <span className="hidden sm:block">Sair da Equipe</span>
                <span className="block sm:hidden">Sair</span>
              </Button>
            )}
            {availableTypes.length > 0 && (
              <>
                <Button
                  size="icon"
                  className="gradient-primary flex md:hidden"
                  onClick={() => setIsInviteOpen(true)}
                >
                  <UserPlus />
                </Button>
                <Button
                  className="gradient-primary hidden md:flex"
                  onClick={() => setIsInviteOpen(true)}
                >
                  <UserPlus className="h-4 w-4" />
                  <span className="ml-2">Convidar</span>
                </Button>
              </>
            )}
          </div>
        </div>

        {teamMembers.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Equipe vazia"
            description="Nenhum profissional está associado a esta paciente ainda."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {teamMembers.map((member) => (
              <TeamMemberCard key={member.id} member={member} />
            ))}
          </div>
        )}
      </div>

      <ConfirmModal
        open={leaveDialogOpen}
        onOpenChange={setLeaveDialogOpen}
        title="Sair da equipe"
        description="Tem certeza que deseja sair da equipe desta paciente? Você perderá acesso aos dados e agendamentos."
        confirmLabel="Sair"
        variant="destructive"
        loading={isLeaving}
        onConfirm={handleLeaveTeam}
      />

      <InviteProfessionalModal
        patient={patient}
        isOpen={isInviteOpen}
        setIsOpen={setIsInviteOpen}
      />
    </>
  );
}
