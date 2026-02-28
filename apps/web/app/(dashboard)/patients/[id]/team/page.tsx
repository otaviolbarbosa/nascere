"use client";

import { getPatientAction } from "@/actions/get-patient-action";
import { getTeamMembersAction } from "@/actions/get-team-members-action";
import { leaveTeamAction } from "@/actions/leave-team-action";
import { ConfirmModal } from "@/components/shared/confirm-modal";
import { EmptyState } from "@/components/shared/empty-state";
import { LoadingPatientTeam } from "@/components/shared/loading-state";
import TeamMemberCard from "@/components/shared/team-member-card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import InviteProfessionalModal from "@/modals/invite-professional-modal";
import type { ProfessionalType } from "@/types";
import { UserMinus, UserPlus, Users } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { redirect, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function PatientTeamPage() {
  const params = useParams();
  const { user } = useAuth();
  const patientId = params.id as string;

  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);

  const {
    execute: fetchPatient,
    result: patientResult,
    status: patientStatus,
  } = useAction(getPatientAction);
  const {
    execute: fetchTeamMembers,
    result: teamResult,
    status: teamStatus,
  } = useAction(getTeamMembersAction);

  // biome-ignore lint/correctness/useExhaustiveDependencies: execute functions are stable
  useEffect(() => {
    fetchPatient({ patientId });
    fetchTeamMembers({ patientId });
  }, [patientId]);

  const { execute: executeLeaveTeam, status: leaveStatus } = useAction(leaveTeamAction, {
    onSuccess: () => {
      toast.success("Você saiu da equipe");
      redirect("/patients");
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? "Erro ao sair da equipe");
      setLeaveDialogOpen(false);
    },
  });

  const patient = patientResult.data?.patient ?? null;
  const teamMembers = teamResult.data?.teamMembers ?? [];
  const loading =
    ["idle", "executing"].includes(patientStatus) || ["idle", "executing"].includes(teamStatus);
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

  console.log(patient.created_by, user?.id);

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
              <TeamMemberCard
                key={member.id}
                member={member}
                isOwner={patient.created_by === member.professional?.id}
              />
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
        availableTypes={availableTypes}
        isOpen={isInviteOpen}
        setIsOpen={setIsInviteOpen}
      />
    </>
  );
}
