"use client";

import { deletePatientAction, getPaginatedPatientsAction } from "@/actions/patients";
import { formatDate } from "@/lib/utils";
import type { Tables } from "@ventre/supabase";
import { Badge } from "@ventre/ui/badge";
import { DataTable } from "@ventre/ui/shared/data-table";
import { useAction } from "next-safe-action/hooks";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";

type Patient = Tables<"patients"> & { email_confirmed: boolean };

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
            label: "Nascimento",
            name: "date_of_birth",
            callback: (p) => formatDate(p.date_of_birth),
          },
          {
            label: "Cadastrado em",
            name: "created_at",
            callback: (p) => formatDate(p.created_at),
          },
          {
            label: "Confirmado?",
            name: "email_confirmed",
            callback: (p) =>
              p.email_confirmed ? (
                <Badge variant="default">Sim</Badge>
              ) : (
                <Badge variant="secondary">Não</Badge>
              ),
          },
        ],
        actions: ["edit", "delete"],
      }}
    />
  );
}
