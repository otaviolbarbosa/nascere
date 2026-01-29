"use client";

import { Header } from "@/components/layouts/header";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { dayjs } from "@/lib/dayjs";
import { calculateGestationalAge } from "@/lib/gestational-age";
import type { Tables } from "@nascere/supabase/types";
import { Baby, Calendar } from "lucide-react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { useEffect, useState } from "react";

type Patient = Tables<"patients">;

export default function PatientLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const pathname = usePathname();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);

  const patientId = params.id as string;
  const currentTab = pathname.includes("/appointments")
    ? "appointments"
    : pathname.includes("/team")
      ? "team"
      : "profile";

  useEffect(() => {
    async function fetchPatient() {
      const response = await fetch(`/api/patients/${patientId}`);
      const data = await response.json();
      setPatient(data.patient);
      setLoading(false);
    }
    fetchPatient();
  }, [patientId]);

  if (loading) {
    return (
      <div>
        <Header title="Carregando..." />
        <div className="p-4 md:p-6">
          <div className="mb-6">
            <Skeleton className="mb-2 h-8 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
          <Skeleton className="h-10 w-80" />
          <div className="mt-6">
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div>
        <Header title="Paciente não encontrado" />
        <div className="p-4 md:p-6">
          <p className="text-muted-foreground">O paciente solicitado não foi encontrado.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header title={patient.name} back />
      <div className="p-4 pt-0 md:p-6">
        <PageHeader
          // title={patient.name}
          breadcrumbs={[{ label: "Gestantes", href: "/patients" }, { label: patient.name }]}
        />
        <div className="flex items-stretch gap-2 mb-6">
          <Card className="flex-1">
            <CardHeader className="p-4 pb-0">
              <CardTitle>Idade Gestacional</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="flex gap-2">
                <Baby />
                {calculateGestationalAge(patient.dum)?.label}
              </div>
            </CardContent>
          </Card>
          <Card className="flex-1">
            <CardHeader className="p-4 pb-0">
              <CardTitle>DPP</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="flex gap-2">
                <Calendar />
                {dayjs(patient.due_date).format("DD/MM/YYYY")}
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={currentTab} className="mb-6">
          <TabsList>
            <Link href={`/patients/${patientId}/profile`}>
              <TabsTrigger value="profile">Perfil</TabsTrigger>
            </Link>
            <Link href={`/patients/${patientId}/appointments`}>
              <TabsTrigger value="appointments">Agendamentos</TabsTrigger>
            </Link>
            <Link href={`/patients/${patientId}/team`}>
              <TabsTrigger value="team">Equipe</TabsTrigger>
            </Link>
          </TabsList>
        </Tabs>

        {children}
      </div>
    </div>
  );
}
