"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { dayjs } from "@/lib/dayjs"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { LoadingCard } from "@/components/shared/loading-state"
import { updatePatientSchema, type UpdatePatientInput } from "@/lib/validations/patient"
import type { Tables } from "@nascere/supabase/types"

type Patient = Tables<"patients">

export default function PatientProfilePage() {
  const params = useParams()
  const router = useRouter()
  const [patient, setPatient] = useState<Patient | null>(null)
  const [loading, setLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  const patientId = params.id as string

  const form = useForm<UpdatePatientInput>({
    resolver: zodResolver(updatePatientSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      date_of_birth: "",
      due_date: "",
      dum: "",
      address: "",
      observations: "",
    },
  })

  useEffect(() => {
    async function fetchPatient() {
      const response = await fetch(`/api/patients/${patientId}`)
      const data = await response.json()
      if (data.patient) {
        setPatient(data.patient)
        form.reset({
          name: data.patient.name,
          email: data.patient.email,
          phone: data.patient.phone,
          date_of_birth: data.patient.date_of_birth,
          due_date: data.patient.due_date,
          dum: data.patient.dum || "",
          address: data.patient.address || "",
          observations: data.patient.observations || "",
        })
      }
      setLoading(false)
    }
    fetchPatient()
  }, [patientId, form])

  async function onSubmit(data: UpdatePatientInput) {
    setIsSaving(true)

    try {
      const response = await fetch(`/api/patients/${patientId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Erro ao atualizar paciente")
      }

      const updated = await response.json()
      setPatient(updated.patient)
      toast.success("Paciente atualizada com sucesso!")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao atualizar paciente")
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDelete() {
    setIsDeleting(true)

    try {
      const response = await fetch(`/api/patients/${patientId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Erro ao excluir paciente")
      }

      toast.success("Paciente excluída com sucesso!")
      router.push("/dashboard/patients")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao excluir paciente")
      setIsDeleting(false)
      setShowDeleteDialog(false)
    }
  }

  if (loading) {
    return <LoadingCard />
  }

  if (!patient) {
    return null
  }

  return (
    <>
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Informações da Paciente</CardTitle>
            <CardDescription>Atualize os dados da gestante</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome completo</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Telefone</FormLabel>
                        <FormControl>
                          <Input type="tel" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="date_of_birth"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data de nascimento</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="due_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data prevista do parto (DPP)</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} onChange={(e) => {
                            field.onChange(e)
                            const dpp = e.target.value
                            if (dpp) {
                              const dppDate = new Date(`${dpp}T00:00:00`)
                              dppDate.setDate(dppDate.getDate() - 280)
                              form.setValue("dum", dppDate.toISOString().split("T")[0])
                            } else {
                              form.setValue("dum", "")
                            }
                          }} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="dum"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data da última menstruação (DUM)</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} readOnly className="bg-muted" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Endereço</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="observations"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Observações</FormLabel>
                      <FormControl>
                        <Textarea rows={4} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end pt-4">
                  <Button type="submit" disabled={isSaving}>
                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Salvar Alterações
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Informações da Gestação</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Semana gestacional</p>
                <p className="text-2xl font-bold">{patient.gestational_week || "-"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Data prevista do parto</p>
                <p className="font-medium">{dayjs(patient.due_date).format("DD/MM/YYYY")}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Dias restantes</p>
                <p className="font-medium">
                  {Math.max(0, dayjs(patient.due_date).diff(dayjs(), "day"))} dias
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-destructive">
            <CardHeader>
              <CardTitle className="text-destructive">Zona de perigo</CardTitle>
              <CardDescription>Ações irreversíveis</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="destructive"
                className="w-full"
                onClick={() => setShowDeleteDialog(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Excluir Paciente
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Excluir paciente"
        description="Tem certeza que deseja excluir esta paciente? Esta ação não pode ser desfeita e todos os dados relacionados serão perdidos."
        confirmLabel="Excluir"
        variant="destructive"
        loading={isDeleting}
        onConfirm={handleDelete}
      />
    </>
  )
}
