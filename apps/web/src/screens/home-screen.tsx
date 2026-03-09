"use client";
import { getHomeDataAction } from "@/actions/get-home-data-action";
import { getHomePatientsAction } from "@/actions/get-home-patients-action";
import { getPatientsAction } from "@/actions/get-patients-action";
import { Header } from "@/components/layouts/header";
import { PatientCard } from "@/components/shared/patient-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { dayjs } from "@/lib/dayjs";
import { calculateGestationalAge } from "@/lib/gestational-age";
import { cn } from "@/lib/utils";
import NewAppointmentModal from "@/modals/new-appointment-modal";
import NewPatientModal from "@/modals/new-patient-modal";
import { MONTH_LABELS_FULL } from "@/services/home";
import type { HomeAppointment } from "@/services/home";
import type { PatientWithGestationalInfo } from "@/types";
import { getFirstName } from "@/utils";
import type { Tables } from "@nascere/supabase";
import {
  Baby,
  CalendarPlus,
  Check,
  Eye,
  ListFilter,
  Search,
  TrendingDown,
  TrendingUp,
  UserPlusIcon,
  X,
} from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import Link from "next/link";
import { redirect } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

type HomeScreenProps = {
  profile: Tables<"users">;
};

type FilterType = "all" | "final" | "recent" | "trim1" | "trim2" | "trim3";

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

function PatientCardSkeleton() {
  return (
    <div className="flex items-center gap-4 border-b p-4 last:border-b-0">
      <Skeleton className="h-12 w-12 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-3 w-56" />
        <Skeleton className="mt-2 h-2 w-full rounded-full" />
      </div>
    </div>
  );
}

function AgendaSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-7 w-20" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-9 rounded-md" />
          <Skeleton className="h-9 w-9 rounded-md" />
        </div>
      </div>
      <Card className="h-fit">
        <CardContent className="space-y-6 py-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex gap-3">
              <div className="relative z-10 mt-1 flex h-5 w-5 shrink-0 items-center justify-center">
                <Skeleton className="h-3 w-3 rounded-full" />
              </div>
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-3 w-28" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function HomeScreenSkeleton({ profile }: { profile: Tables<"users"> }) {
  return (
    <div className="flex h-full flex-col">
      <Header title={`${getGreeting()}, ${getFirstName(profile.name)}!`} />
      <div className="flex flex-1 flex-col space-y-4 px-4 pt-0 pb-28 sm:pb-4 md:px-6">
        {/* DPP cards skeleton */}
        <div className="-mx-4 no-scrollbar flex gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:overflow-visible sm:px-0">
          {[0, 1, 2, 3].map((i) => (
            <Card key={i} className="w-36 shrink-0">
              <CardContent className="flex items-center justify-between p-2.5">
                <div className="space-y-1">
                  <Skeleton className="h-6 w-8" />
                  <Skeleton className="h-3 w-10" />
                </div>
                <Skeleton className="h-10 w-10 rounded-lg" />
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
          {/* Patient list skeleton */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Skeleton className="h-7 w-44" />
              <div className="flex items-center gap-2">
                <Skeleton className="h-9 w-9 rounded-md" />
                <Skeleton className="h-9 w-9 rounded-md" />
                <Skeleton className="hidden h-9 w-36 rounded-md md:block" />
                <Skeleton className="h-9 w-9 rounded-md md:hidden" />
              </div>
            </div>
            <Card>
              <CardContent className="p-0">
                <PatientCardSkeleton />
                <PatientCardSkeleton />
                <PatientCardSkeleton />
                <PatientCardSkeleton />
                <PatientCardSkeleton />
              </CardContent>
            </Card>
          </div>

          {/* Agenda skeleton (desktop) */}
          <div className="hidden lg:block">
            <AgendaSkeleton />
          </div>
        </div>

        {/* Agenda skeleton (mobile) */}
        <div className="lg:hidden">
          <AgendaSkeleton />
        </div>
      </div>
    </div>
  );
}

function AppointmentTimeline({
  appointments,
  onNewAppointment,
}: { appointments: HomeAppointment[]; onNewAppointment: () => void }) {
  const today = dayjs().format("YYYY-MM-DD");

  function formatAppointmentDate(date: string) {
    if (date === today) return "Hoje";
    return dayjs(date).format("DD MMM");
  }

  function getTypeLabel(type: string, dum: string | null) {
    const gestAge = calculateGestationalAge(dum);
    const weeksLabel = gestAge ? ` (${gestAge.weeks} sem)` : "";
    if (type === "consulta") return `Consulta Pré-natal${weeksLabel}`;
    return "Encontro Preparatório";
  }

  const handleOpenAppointments = () => {
    redirect("/appointments");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-poppins font-semibold text-xl">Agenda</h2>
        <div className="flex items-center gap-2">
          <Button size="icon" variant="outline" onClick={handleOpenAppointments}>
            <Eye />
          </Button>
          <Button size="icon" onClick={onNewAppointment} className="gradient-primary">
            <CalendarPlus />
          </Button>
        </div>
      </div>
      <Card className="h-fit">
        <CardContent className="space-y-4">
          {appointments.length === 0 ? (
            <div className="flex flex-col items-center gap-2 text-center">
              <p className="text-muted-foreground text-sm">Sua agenda está livre.</p>
              <p className="text-muted-foreground text-sm">
                Aproveite para adicionar um novo agendamento.
              </p>
              <Button className="gradient-primary mt-4" onClick={onNewAppointment}>
                <CalendarPlus />
                Novo Agendamento
              </Button>
            </div>
          ) : (
            <div className="space-y-0">
              {appointments.map((appointment, index) => (
                <div key={appointment.id} className="relative flex gap-3 pb-6 last:pb-0">
                  {/* Timeline line */}
                  {index < appointments.length - 1 && (
                    <div className="absolute top-5 left-[9px] h-[calc(100%-12px)] w-px bg-border" />
                  )}
                  {/* Timeline dot */}
                  <div className="relative z-10 mt-1 flex h-5 w-5 shrink-0 items-center justify-center">
                    <div
                      className={`h-3 w-3 rounded-full border-2 ${
                        appointment.date === today
                          ? "border-primary bg-primary/20"
                          : "border-muted-foreground/40 bg-background"
                      }`}
                    />
                  </div>
                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <p
                      className={`font-medium text-xs ${
                        appointment.date === today ? "text-primary" : "text-muted-foreground"
                      }`}
                    >
                      {formatAppointmentDate(appointment.date)}, {appointment.time.slice(0, 5)}
                    </p>
                    <p className="font-medium text-sm">{appointment.patient.name}</p>
                    <p className="text-muted-foreground text-xs">
                      {getTypeLabel(appointment.type, appointment.patient.dum)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

const FILTER_LABELS: Record<FilterType, string> = {
  all: "Todas",
  recent: "Adicionadas Recentemente",
  trim1: "1º Trimestre",
  trim2: "2º Trimestre",
  trim3: "3º Trimestre",
  final: "Bebê a Termo",
};

export default function HomeScreen({ profile }: HomeScreenProps) {
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showNewPatient, setShowNewPatient] = useState(false);
  const [showNewAppointment, setShowNewAppointment] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const filterRef = useRef<HTMLDivElement>(null);

  const {
    execute: fetchHomeData,
    result: homeDataResult,
    isPending: isLoadingHome,
  } = useAction(getHomeDataAction);

  const {
    execute: fetchPatients,
    result: patientsResult,
    isPending: isLoadingPatients,
  } = useAction(getHomePatientsAction);

  const { execute: fetchAllPatients, result: allPatientsResult } = useAction(getPatientsAction);

  useEffect(() => {
    fetchHomeData({});
    fetchAllPatients();
  }, [fetchHomeData, fetchAllPatients]);

  const homeData = homeDataResult.data;
  const dppByMonth = homeData?.dppByMonth ?? [];
  const upcomingAppointments = homeData?.upcomingAppointments ?? [];
  const patients = (patientsResult.data?.patients ??
    homeData?.patients ??
    []) as PatientWithGestationalInfo[];
  const allPatients = allPatientsResult.data?.patients ?? [];

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setShowFilters(false);
      }
    }
    if (showFilters) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showFilters]);

  const handleFilterToggle = useCallback(() => {
    setShowFilters((prev) => !prev);
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: no need to add fetchPatients on deps
  const handleSearchToggle = useCallback(() => {
    setShowSearch((prev) => {
      if (prev) {
        setSearchQuery("");
        fetchPatients({ filter: activeFilter, search: "" });
      } else {
        setTimeout(() => searchInputRef.current?.focus(), 50);
      }
      return !prev;
    });
  }, [activeFilter]);

  const handleFilterChange = (filter: FilterType) => {
    setActiveFilter(filter);
    setShowFilters(false);
    fetchPatients({ filter, search: searchQuery });
  };

  const activeLabel = FILTER_LABELS[activeFilter];

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      fetchPatients({ filter: activeFilter, search: value });
    }, 400);
  };

  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, []);

  const refreshHomeData = useCallback(() => {
    fetchHomeData({});
  }, [fetchHomeData]);

  const refreshAll = useCallback(() => {
    fetchHomeData({});
    fetchPatients({ filter: activeFilter, search: searchQuery });
  }, [fetchHomeData, fetchPatients, activeFilter, searchQuery]);

  if (isLoadingHome && !homeData) {
    return <HomeScreenSkeleton profile={profile} />;
  }

  const hasAnyPatients = (homeData?.patients?.length ?? 0) > 0;

  if (!hasAnyPatients && homeData) {
    return (
      <div className="flex h-full flex-col">
        <Header title={`${getGreeting()}, ${getFirstName(profile.name)}!`} />
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 text-center">
          <Baby className="h-14 w-14 text-muted-foreground/40" />
          <div>
            <p className="font-semibold text-lg">Nenhuma gestante cadastrada</p>
            <p className="mt-1 text-muted-foreground text-sm">
              Adicione sua primeira gestante para começar o acompanhamento.
            </p>
          </div>
          <Button className="gradient-primary mt-2" onClick={() => setShowNewPatient(true)}>
            <UserPlusIcon />
            Adicionar Gestante
          </Button>
        </div>
        <NewPatientModal
          showModal={showNewPatient}
          setShowModal={setShowNewPatient}
          onSuccess={refreshAll}
        />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <Header title={`${getGreeting()}, ${getFirstName(profile.name)}!`} />

      <div className="flex flex-1 flex-col space-y-4 px-4 pt-0 pb-28 sm:pb-4 md:px-6">
        {/* DPP by Month Cards */}
        <div className="-mx-4 no-scrollbar flex gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:overflow-visible sm:px-0">
          {dppByMonth.map((item) => (
            <Card key={`${item.year}-${item.month}`} className="shrink-0">
              <CardContent className="flex items-center justify-between px-4 py-3">
                <div className="space-y-1">
                  <div className="flex min-w-[120px] items-center justify-between gap-3">
                    <p className="font-bold font-poppings text-lg text-muted-foreground">
                      {MONTH_LABELS_FULL[item.month]}
                    </p>
                    {item.percentage !== 0 && (
                      <div
                        className={cn(
                          "flex items-start gap-0.5 rounded-full border px-2 py-0.5 font-medium text-[10px]",
                          item.percentage >= 0
                            ? "border-green-600/20 text-green-600"
                            : "border-destructive/20 text-destructive",
                        )}
                      >
                        {Math.abs(item.percentage)}%
                        {item.percentage >= 0 ? (
                          <TrendingUp className="size-3.5" />
                        ) : (
                          <TrendingDown className="size-3.5" />
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex items-baseline gap-4">
                    <p className="font-bold font-poppins text-xl">{item.count}</p>
                    <span className="text-muted-foreground text-xs">Gestates</span>
                  </div>
                </div>
                {/* <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <span className="font-semibold text-muted-foreground text-sm">
                    {MONTH_LABELS_SHORT[item.month]}
                  </span>
                </div> */}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main Content: Two columns */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
          {/* Left: Patient List */}
          <div className="space-y-4">
            {/* Title + Filters */}
            <div className="flex items-center justify-between">
              <h2 className="font-poppins font-semibold text-xl">Minhas Gestantes</h2>
              <div className="flex items-center gap-2">
                {activeFilter !== "all" && (
                  <Badge variant="secondary" className="gap-1 px-3 py-1.5 text-sm">
                    {activeLabel}
                    <button type="button" onClick={() => handleFilterChange("all")}>
                      <X className="size-3" />
                    </button>
                  </Badge>
                )}

                <Button
                  size="icon"
                  variant={showSearch ? "secondary" : "outline"}
                  onClick={handleSearchToggle}
                >
                  {showSearch ? <X /> : <Search />}
                </Button>
                <div ref={filterRef} className="relative">
                  <Button
                    size="icon"
                    variant={activeFilter !== "all" ? "secondary" : "outline"}
                    onClick={handleFilterToggle}
                  >
                    <ListFilter />
                  </Button>
                  <div
                    className={cn(
                      "absolute top-full right-0 z-10 mt-2 flex flex-col gap-1.5 rounded-xl border bg-background p-2 shadow-md transition-opacity duration-200",
                      showFilters ? "opacity-100" : "pointer-events-none opacity-0",
                    )}
                  >
                    {(Object.keys(FILTER_LABELS) as FilterType[]).map((filter) => (
                      <button
                        key={filter}
                        type="button"
                        onClick={() => handleFilterChange(filter)}
                        className={cn(
                          "flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-muted",
                          activeFilter === filter && "font-medium text-primary",
                        )}
                      >
                        <Check
                          className={cn(
                            "size-4 shrink-0",
                            activeFilter === filter ? "opacity-100" : "opacity-0",
                          )}
                        />
                        {FILTER_LABELS[filter]}
                      </button>
                    ))}
                  </div>
                </div>
                <Button
                  className="gradient-primary hidden gap-2 md:flex"
                  onClick={() => setShowNewPatient(true)}
                >
                  <UserPlusIcon />
                  Nova Gestante
                </Button>
                <Button
                  className="gradient-primary md:hidden"
                  size="icon"
                  onClick={() => setShowNewPatient(true)}
                >
                  <UserPlusIcon />
                </Button>
              </div>
            </div>

            {/* Search */}
            {showSearch && (
              <div className="relative">
                <Search className="-translate-y-1/2 pointer-events-none absolute top-1/2 left-4 h-4 w-4 text-muted-foreground" />
                <Input
                  ref={searchInputRef}
                  placeholder="Buscar por nome"
                  className="h-11 rounded-full bg-white pl-10"
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                />
              </div>
            )}

            {/* Patient List */}
            <Card>
              <CardContent className="p-0">
                {isLoadingPatients ? (
                  <>
                    <PatientCardSkeleton />
                    <PatientCardSkeleton />
                    <PatientCardSkeleton />
                    <PatientCardSkeleton />
                    <PatientCardSkeleton />
                  </>
                ) : patients.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-12 text-center">
                    <Baby className="h-10 w-10 text-muted-foreground/50" />
                    <p className="text-muted-foreground text-sm">Nenhuma gestante encontrada</p>
                  </div>
                ) : (
                  <div className="divider-y-1">
                    {patients.map((patient) => (
                      <Link key={patient.id} href={`/patients/${patient.id}`}>
                        <PatientCard patient={patient} />
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right: Upcoming Appointments */}
          <div className="hidden lg:block">
            <AppointmentTimeline
              appointments={upcomingAppointments}
              onNewAppointment={() => setShowNewAppointment(true)}
            />
          </div>
        </div>

        {/* Mobile: Upcoming Appointments */}
        <div className="lg:hidden">
          <AppointmentTimeline
            appointments={upcomingAppointments}
            onNewAppointment={() => setShowNewAppointment(true)}
          />
        </div>
      </div>

      <NewPatientModal
        showModal={showNewPatient}
        setShowModal={setShowNewPatient}
        onSuccess={refreshAll}
      />
      <NewAppointmentModal
        patients={allPatients}
        showModal={showNewAppointment}
        setShowModal={setShowNewAppointment}
        onSuccess={refreshHomeData}
      />
    </div>
  );
}
