"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { Plus, Users, UserMinus } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { EmptyState } from "@/components/shared/empty-state"
import { LoadingTable } from "@/components/shared/loading-state"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { supabase } from "@nascere/supabase"
import { useAuth } from "@/hooks/use-auth"

type TeamMember = {
  id: string
  professional_id: string
  professional_type: string
  joined_at: string | null
  professional: { id: string; name: string; email: string } | null
}

type Professional = {
  id: string
  name: string
  email: string
  professional_type: string | null
}

const professionalTypeLabels: Record<string, string> = {
  obstetra: "Obstetra",
  enfermeiro: "Enfermeiro(a)",
  doula: "Doula",
}

export default function PatientTeamPage() {
  const params = useParams()
  const { user } = useAuth()
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [professionals, setProfessionals] = useState<Professional[]>([])
  const [loading, setLoading] = useState(true)
  const [isInviteOpen, setIsInviteOpen] = useState(false)
  const [selectedProfessional, setSelectedProfessional] = useState("")
  const [selectedType, setSelectedType] = useState("")
  const [searchEmail, setSearchEmail] = useState("")
  const [isInviting, setIsInviting] = useState(false)
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false)
  const [isLeaving, setIsLeaving] = useState(false)

  const patientId = params.id as string

  useEffect(() => {
    async function fetchTeam() {
      const { data: team } = await supabase
        .from("team_members")
        .select(`
          *,
          professional:users!team_members_professional_id_fkey(id, name, email)
        `)
        .eq("patient_id", patientId)

      setTeamMembers(team || [])
      setLoading(false)
    }
    fetchTeam()
  }, [patientId])

  async function searchProfessionals() {
    if (!searchEmail || searchEmail.length < 3) return

    let query = supabase
      .from("users")
      .select("id, name, email, professional_type")
      .eq("user_type", "professional")
      .ilike("email", `%${searchEmail}%`)
      .limit(5)

    if (user?.id) {
      query = query.neq("id", user.id)
    }

    const { data } = await query

    setProfessionals(data || [])
  }

  async function handleInvite() {
    if (!selectedProfessional || !selectedType) {
      toast.error("Selecione um profissional e tipo")
      return
    }

    setIsInviting(true)

    try {
      const response = await fetch("/api/team/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patient_id: patientId,
          invited_professional_id: selectedProfessional,
          professional_type: selectedType,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Erro ao enviar convite")
      }

      toast.success("Convite enviado com sucesso!")
      setIsInviteOpen(false)
      setSelectedProfessional("")
      setSelectedType("")
      setSearchEmail("")
      setProfessionals([])
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao enviar convite")
    } finally {
      setIsInviting(false)
    }
  }

  async function handleLeaveTeam() {
    if (!user?.id) return
    setIsLeaving(true)

    try {
      const { error } = await supabase
        .from("team_members")
        .delete()
        .eq("patient_id", patientId)
        .eq("professional_id", user.id)

      if (error) throw error

      toast.success("Você saiu da equipe")
      window.location.href = "/patients"
    } catch (error) {
      toast.error("Erro ao sair da equipe")
      setIsLeaving(false)
      setLeaveDialogOpen(false)
    }
  }

  const usedTypes = teamMembers.map((m) => m.professional_type)
  const availableTypes = ["obstetra", "enfermeiro", "doula"].filter((t) => !usedTypes.includes(t))
  const isUserInTeam = teamMembers.some((m) => m.professional_id === user?.id)

  if (loading) {
    return <LoadingTable />
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Equipe de Cuidado</h2>
          <div className="flex gap-2">
            {isUserInTeam && (
              <Button variant="outline" onClick={() => setLeaveDialogOpen(true)}>
                <UserMinus className="mr-2 h-4 w-4" />
                Sair da Equipe
              </Button>
            )}
            {availableTypes.length > 0 && (
              <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Convidar Profissional
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Convidar Profissional</DialogTitle>
                    <DialogDescription>
                      Busque um profissional pelo email para convidar para a equipe.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Buscar por email</Label>
                      <div className="flex gap-2">
                        <Input
                          placeholder="email@exemplo.com"
                          value={searchEmail}
                          onChange={(e) => setSearchEmail(e.target.value)}
                        />
                        <Button type="button" onClick={searchProfessionals}>
                          Buscar
                        </Button>
                      </div>
                    </div>

                    {professionals.length > 0 && (
                      <div className="space-y-2">
                        <Label>Selecione o profissional</Label>
                        <Select value={selectedProfessional} onValueChange={setSelectedProfessional}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent>
                            {professionals.map((p) => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.name} ({p.email})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label>Tipo de profissional</Label>
                      <Select value={selectedType} onValueChange={setSelectedType}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableTypes.map((type) => (
                            <SelectItem key={type} value={type}>
                              {professionalTypeLabels[type]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsInviteOpen(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={handleInvite} disabled={isInviting || !selectedProfessional || !selectedType}>
                      Enviar Convite
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
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
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {teamMembers.map((member) => (
              <Card key={member.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary">{professionalTypeLabels[member.professional_type]}</Badge>
                    {member.professional_id === user?.id && (
                      <Badge variant="outline">Você</Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 text-primary-700">
                      {member.professional?.name?.charAt(0).toUpperCase() || "?"}
                    </div>
                    <div>
                      <p className="font-medium">{member.professional?.name}</p>
                      <p className="text-sm text-muted-foreground">{member.professional?.email}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={leaveDialogOpen}
        onOpenChange={setLeaveDialogOpen}
        title="Sair da equipe"
        description="Tem certeza que deseja sair da equipe desta paciente? Você perderá acesso aos dados e agendamentos."
        confirmLabel="Sair"
        variant="destructive"
        loading={isLeaving}
        onConfirm={handleLeaveTeam}
      />
    </>
  )
}
