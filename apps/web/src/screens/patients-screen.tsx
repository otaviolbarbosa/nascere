"use client";
import { Header } from "@/components/layouts/header";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { PatientCard } from "@/components/shared/patient-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { calculateGestationalAge } from "@/lib/gestational-age";
import NewPatientModal from "@/modals/new-patient-modal";
import type { Tables } from "@nascere/supabase";
import { Baby, ListFilter, Plus, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

type TrimesterFilter = "1t" | "2t" | "3t" | "termo";

const FILTER_OPTIONS: { key: TrimesterFilter; label: string }[] = [
  { key: "1t", label: "1º Trimestre" },
  { key: "2t", label: "2º Trimestre" },
  { key: "3t", label: "3º Trimestre" },
  { key: "termo", label: "A termo" },
];

function getWeeks(dum: string | null | undefined): number | null {
  const age = calculateGestationalAge(dum);
  return age ? age.weeks : null;
}

function matchesFilter(weeks: number | null, filter: TrimesterFilter): boolean {
  if (weeks === null) return false;
  switch (filter) {
    case "1t":
      return weeks < 14;
    case "2t":
      return weeks >= 14 && weeks < 28;
    case "3t":
      return weeks >= 28;
    case "termo":
      return weeks >= 37;
  }
}

type PatientsScreenProps = {
  patients: Tables<"patients">[];
};

export default function PatientsScreen({ patients }: PatientsScreenProps) {
  const router = useRouter();
  const [showNewPatientModal, setShowNewPatientModal] = useState(false);
  const [activeFilter, setActiveFilter] = useState<TrimesterFilter | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const handleFilterClick = (filter: TrimesterFilter) => {
    setActiveFilter((prev) => (prev === filter ? null : filter));
    setShowFilters(false);
  };

  const filteredPatients = useMemo(() => {
    if (!activeFilter) return patients;
    return patients.filter((p) => matchesFilter(getWeeks(p.dum), activeFilter));
  }, [patients, activeFilter]);

  const activeLabel = FILTER_OPTIONS.find((o) => o.key === activeFilter)?.label;

  return (
    <div>
      <Header title="Minhas Gestantes" />
      <div className="p-4 pt-0 md:p-6">
        <PageHeader
          description="Gerencie suas gestantes"
        >
          <div className="flex gap-2">
            <Button
              size="icon"
              className="gradient-primary flex sm:hidden"
              onClick={() => setShowNewPatientModal(true)}
            >
              <Plus className="size-4" />
              <span className="hidden sm:block">Adicionar</span>
            </Button>
            <Button
              className="gradient-primary hidden sm:flex"
              onClick={() => setShowNewPatientModal(true)}
            >
              <Plus className="size-4" />
              <span className="hidden sm:block">Adicionar</span>
            </Button>
            <Button
              size="icon"
              variant={activeFilter ? "default" : "outline"}
              className="flex"
              onClick={() => setShowFilters((prev) => !prev)}
            >
              <ListFilter className="size-4" />
            </Button>
          </div>
        </PageHeader>

        {showFilters && (
          <div className="mb-4 flex flex-wrap gap-2">
            {FILTER_OPTIONS.map((option) => (
              <Badge
                key={option.key}
                variant={activeFilter === option.key ? "default" : "outline"}
                className="cursor-pointer px-3 py-1.5 text-sm"
                onClick={() => handleFilterClick(option.key)}
              >
                {option.label}
              </Badge>
            ))}
          </div>
        )}

        {activeFilter && !showFilters && (
          <div className="mb-4 flex items-center gap-2">
            <Badge variant="default" className="gap-1 px-3 py-1.5 text-sm">
              {activeLabel}
              <button type="button" onClick={() => setActiveFilter(null)}>
                <X className="size-3" />
              </button>
            </Badge>
          </div>
        )}

        {filteredPatients.length === 0 ? (
          activeFilter ? (
            <EmptyState
              icon={Baby}
              title="Nenhuma gestante encontrada"
              description={`Nenhuma gestante no filtro "${activeLabel}".`}
            />
          ) : (
            <EmptyState
              icon={Baby}
              title="Nenhuma paciente cadastrada"
              description="Comece cadastrando sua primeira paciente para acompanhar a gestação."
            >
              <Button onClick={() => setShowNewPatientModal(true)}>
                <Plus className="mr-2 size-4" />
                Cadastrar Paciente
              </Button>
            </EmptyState>
          )
        ) : (
          <div className="space-y-3">
            {filteredPatients.map((patient) => {
              const weekInfo = calculateGestationalAge(patient?.dum);
              return (
                <Link key={patient.id} href={`/patients/${patient.id}`} className="block">
                  <div className="rounded-xl border">
                    <PatientCard
                      patient={{
                        ...patient,
                        weeks: weekInfo?.weeks ?? 0,
                        days: weekInfo?.days ?? 0,
                        remainingDays: 280 - (weekInfo?.totalDays ?? 0),
                        progress: ((weekInfo?.totalDays ?? 0) * 100) / 280,
                      }}
                    />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <NewPatientModal
        showModal={showNewPatientModal}
        setShowModal={setShowNewPatientModal}
        callback={() => router.refresh()}
      />
    </div>
  );
}
