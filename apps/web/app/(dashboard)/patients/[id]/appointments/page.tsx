"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Plus, Calendar, Clock, MapPin } from "lucide-react";
import { dayjs } from "@/lib/dayjs";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { LoadingTable } from "@/components/shared/loading-state";
import type { Tables } from "@nascere/supabase/types";

type Appointment = Tables<"appointments"> & {
  professional: { name: string; professional_type: string } | null;
};

const statusLabels: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" }
> = {
  agendada: { label: "Agendada", variant: "default" },
  realizada: { label: "Realizada", variant: "secondary" },
  cancelada: { label: "Cancelada", variant: "destructive" },
};

const typeLabels: Record<string, string> = {
  consulta: "Consulta",
  encontro: "Encontro",
};

export default function PatientAppointmentsPage() {
  const params = useParams();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  const patientId = params.id as string;

  useEffect(() => {
    async function fetchAppointments() {
      const response = await fetch(`/api/appointments?patient_id=${patientId}`);
      const data = await response.json();
      setAppointments(data.appointments || []);
      setLoading(false);
    }
    fetchAppointments();
  }, [patientId]);

  if (loading) {
    return <LoadingTable />;
  }

  if (appointments.length === 0) {
    return (
      <EmptyState
        icon={Calendar}
        title="Nenhum agendamento"
        description="Ainda não há agendamentos para esta paciente."
      >
        <Link href={`/patients/${patientId}/appointments/new`}>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Novo Agendamento
          </Button>
        </Link>
      </EmptyState>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Agendamentos</h2>
        <Link href={`/patients/${patientId}/appointments/new`}>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Novo Agendamento
          </Button>
        </Link>
      </div>

      <div className="space-y-3">
        {appointments.map((appointment) => {
          const status = statusLabels[appointment.status] ?? {
            label: appointment.status,
            variant: "default" as const,
          };
          return (
            <Card key={appointment.id}>
              <CardContent className="flex items-center gap-4 p-4">
                <div className="flex h-12 w-12 flex-col items-center justify-center rounded-lg bg-primary-50 text-primary-700">
                  <span className="text-xs font-medium uppercase">
                    {dayjs(appointment.date).format("MMM")}
                  </span>
                  <span className="text-lg font-bold">{dayjs(appointment.date).format("DD")}</span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium">
                      {typeLabels[appointment.type] ?? appointment.type}
                    </h3>
                    <Badge variant={status.variant}>{status.label}</Badge>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-3 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {appointment.time.slice(0, 5)}
                      {appointment.duration && ` (${appointment.duration}min)`}
                    </span>
                    {appointment.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {appointment.location}
                      </span>
                    )}
                  </div>
                  {appointment.professional && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {appointment.professional.name} - {appointment.professional.professional_type}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
