"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Plus, Users, Baby, Calendar } from "lucide-react"
import { dayjs } from "@/lib/dayjs"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Header } from "@/components/layouts/header"
import { PageHeader } from "@/components/shared/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { LoadingTable } from "@/components/shared/loading-state"
import type { Tables } from "@nascere/supabase/types"

type Patient = Tables<"patients">

export default function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchPatients() {
      const response = await fetch("/api/patients")
      const data = await response.json()
      setPatients(data.patients || [])
      setLoading(false)
    }
    fetchPatients()
  }, [])

  const getGestationalWeekLabel = (week: number | null) => {
    if (!week) return null
    if (week <= 12) return { label: `${week} semanas`, variant: "secondary" as const }
    if (week <= 27) return { label: `${week} semanas`, variant: "default" as const }
    if (week <= 36) return { label: `${week} semanas`, variant: "outline" as const }
    return { label: `${week} semanas`, variant: "destructive" as const }
  }

  return (
    <div>
      <Header title="Pacientes" />
      <div className="p-4 md:p-6">
        <PageHeader
          title="Pacientes"
          description="Gerencie suas pacientes gestantes"
        >
          <Link href="/dashboard/patients/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Minhas Gestantes
            </Button>
          </Link>
        </PageHeader>

        {loading ? (
          <LoadingTable />
        ) : patients.length === 0 ? (
          <EmptyState
            icon={Baby}
            title="Nenhuma paciente cadastrada"
            description="Comece cadastrando sua primeira paciente para acompanhar a gestação."
          >
            <Link href="/dashboard/patients/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Cadastrar Paciente
              </Button>
            </Link>
          </EmptyState>
        ) : (
          <div className="space-y-3">
            {patients.map((patient) => {
              const weekInfo = getGestationalWeekLabel(patient.gestational_week)
              return (
                <Link key={patient.id} href={`/dashboard/patients/${patient.id}`} className="block">
                  <Card className="transition-colors hover:bg-muted/50">
                    <CardContent className="flex items-center gap-4 p-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-100 text-primary-700">
                        <Baby className="h-6 w-6" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium">{patient.name}</h3>
                        <p className="text-sm text-muted-foreground">{patient.email}</p>
                      </div>
                      <div className="hidden items-center gap-4 text-sm text-muted-foreground md:flex">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span>DPP: {dayjs(patient.due_date).format("DD/MM/YYYY")}</span>
                        </div>
                        {weekInfo && (
                          <Badge variant={weekInfo.variant}>{weekInfo.label}</Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
