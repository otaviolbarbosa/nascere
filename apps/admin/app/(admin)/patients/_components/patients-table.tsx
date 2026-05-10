"use client";

import { deletePatientAction, getPaginatedPatientsAction } from "@/actions/patients";
import { formatDate } from "@/lib/utils";
import type { Tables } from "@ventre/supabase";
import { DataTable } from "@ventre/ui/shared/data-table";
import { UserAvatar } from "@ventre/ui/shared/user-avatar";
import { useAction } from "next-safe-action/hooks";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";

type TeamMember = {
  id: string;
  professional: { id: string; name: string; avatar_url: string | null } | null;
};

type Patient = Tables<"patients"> & { team_members: TeamMember[] };

export function PatientsTable() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const lastFetchRef = useRef<{ page: number; size: number }>({ page: 1, size: 10 });

  const { execute: loadPatients } = useAction(getPaginatedPatientsAction, {
    onSuccess: ({ data }) => {
      setPatients(data.data);
      setTotalPages(data.pagination.total_pages);
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? "Erro ao carregar pacientes");
    },
  });

  const { execute: deletePatient } = useAction(deletePatientAction, {
    onSuccess: () => {
      toast.success("Paciente excluído com sucesso!");
      loadPatients(lastFetchRef.current);
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? "Erro ao excluir paciente");
    },
  });

  const fetchData = useCallback(
    (page: number, size: number, order?: { field: string; isAscendent: boolean }) => {
      lastFetchRef.current = { page, size };
      loadPatients({ page, size, order });
    },
    [loadPatients],
  );

  return (
    <DataTable
      data={patients}
      totalPages={totalPages}
      fetchData={fetchData}
      onDeleteAction={(id) => deletePatient({ id })}
      options={{
        modelName: "Paciente",
        path: "patients",
        fieldsToSearch: ["name", "email", "phone"],
        columns: [
          { label: "Nome", name: "name" },
          { label: "E-mail", name: "email", callback: (p) => p.email ?? "—" },
          { label: "Telefone", name: "phone" },
          {
            label: "Cadastrado em",
            name: "created_at",
            callback: (p) => formatDate(p.created_at),
          },
          {
            label: "Equipe",
            name: "team_members",
            callback: (p) =>
              p.team_members.length === 0 ? (
                <span className="text-neutral-400 text-xs">—</span>
              ) : (
                <div className="flex flex-row-reverse justify-end gap-1">
                  {p.team_members.map((m) =>
                    m.professional ? (
                      <div key={m.id} title={m.professional.name} className="h-8 w-8 rounded-full">
                        <UserAvatar user={m.professional} size={8} />
                      </div>
                    ) : null,
                  )}
                </div>
              ),
          },
        ],
        actions: ["edit", "delete"],
      }}
    />
  );
}
