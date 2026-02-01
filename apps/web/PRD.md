# nascere.vc

## Objetivo
Gerenciar pacientes gestantes por profissionais de saúde (obstetras, enfermeiros, doulas) com controle de consultas, exames, equipes multiprofissionais e monitoramento de sinais vitais.

## Plataforma
PWA (Progressive Web App) - compatível com desktop e mobile via navegador

## Stack Tecnológica

**Frontend:**
- Framework: Next.js 14+ (App Router)
- Linguagem: TypeScript
- Estilização: Tailwind CSS
- Componentes: Shadcn/ui
- Formulários: React Hook Form + Zod
- Gerenciamento de Estado: Context API / Zustand
- Datas: dayjs

**Backend:**
- Framework: Next.js API Routes
- ORM: Prisma
- Database: Supabase (PostgreSQL)
- Autenticação: Supabase Auth (Google, Facebook, Email/Password)
- Storage: Supabase Storage (upload de arquivos)

**Ferramentas:**
- Validação: Zod
- Linting/Formatting: Biome

## Funcionalidades

### 1. Gerenciamento de Pacientes (Gestantes)

**Descrição:** CRUD de gestantes com cadastro direto ou via link compartilhável

**Páginas:**
- `/patients` - Lista de Pacientes
- `/patients/[id]` - Detalhes da Paciente (Perfil)
- `/patients/new` - Formulário de Cadastro de Paciente
- `/register/patient/[token]` - Cadastro por Link (visão da gestante)

**Fluxo:**
1. Profissional acessa lista de pacientes ordenada por data prevista de parto (ascendente)
2. Profissional cria paciente manualmente OU gera link de cadastro
3. Gestante acessa link, preenche formulário e submete
4. Profissional visualiza detalhes completos da paciente no perfil
5. Gestante acessa próprio perfil e visualiza todas suas informações

**Regras de Negócio:**
- Data prevista de parto é obrigatória
- Ordenação padrão: parto mais próximo primeiro
- Link de cadastro expira em 7 dias
- Gestante pode visualizar próprio perfil completo
- Profissional pode editar qualquer informação da paciente
- Campos obrigatórios: nome, data prevista de parto, email/telefone de contato

**API Endpoints:**

```typescript
// GET /api/patients
// Query params: sortBy=dueDate, page=1, limit=20
// Response: { data: Patient[], total: number, page: number }

// POST /api/patients
// Body: CreatePatientDTO
// Response: Patient

// GET /api/patients/[id]
// Response: Patient

// PUT /api/patients/[id]
// Body: UpdatePatientDTO
// Response: Patient

// DELETE /api/patients/[id]
// Response: { success: boolean }

// POST /api/patients/invite-link
// Body: { patientId?: string }
// Response: { token: string, expiresAt: string, url: string }

// POST /api/patients/register-via-link
// Body: { token: string, patientData: CreatePatientDTO }
// Response: Patient
```

**Schemas de Validação:**
```typescript
const CreatePatientSchema = z.object({
  name: z.string().min(3),
  email: z.string().email(),
  phone: z.string().min(10),
  dateOfBirth: z.string().datetime(),
  dueDate: z.string().datetime(),
  address: z.string().optional(),
  observations: z.string().optional(),
});

const UpdatePatientSchema = CreatePatientSchema.partial();
```

**Dados:**
```typescript
interface Patient {
  id: string;
  name: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  dueDate: string;
  gestationalWeek?: number;
  address?: string;
  observations?: string;
  createdAt: string;
  updatedAt: string;
}
```

### 2. Gerenciamento de Consultas/Encontros

**Descrição:** CRUD de consultas e encontros com gestantes

**Páginas:**
- `/patients/[id]/appointments` - Lista de Consultas/Encontros
- `/patients/[id]/appointments/[appointmentId]` - Detalhes da Consulta
- `/patients/[id]/appointments/new` - Formulário de Criação

**Fluxo:**
1. Profissional acessa lista de consultas ordenada por data (ascendente)
2. Profissional cria nova consulta vinculada a uma paciente
3. Profissional visualiza/edita detalhes da consulta
4. Sistema envia notificação de lembrete conforme configuração

**Regras de Negócio:**
- Ordenação padrão: data mais próxima primeiro
- Consulta deve estar vinculada a uma paciente
- Data e hora são obrigatórias
- Status: agendada, realizada, cancelada
- Permitir adicionar observações/anotações da consulta

**API Endpoints:**

```typescript
// POST /api/appointments
// Body: CreateAppointmentDTO
// Response: Appointment

// GET /api/appointments
// Query params: patientId, status, sortBy=date, page=1, limit=20
// Response: { data: Appointment[], total: number, page: number }

// GET /api/appointments/[id]
// Response: Appointment

// PUT /api/appointments/[id]
// Body: UpdateAppointmentDTO
// Response: Appointment

// DELETE /api/appointments/[id]
// Response: { success: boolean }
```

**Schemas de Validação:**
```typescript
const CreateAppointmentSchema = z.object({
  patientId: z.string().uuid(),
  date: z.string().datetime(),
  time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  duration: z.number().min(15).optional(),
  type: z.enum(['consulta', 'encontro']),
  status: z.enum(['agendada', 'realizada', 'cancelada']).default('agendada'),
  location: z.string().optional(),
  notes: z.string().optional(),
});

const UpdateAppointmentSchema = CreateAppointmentSchema.partial().omit({ patientId: true });
```

**Dados:**
```typescript
interface Appointment {
  id: string;
  patientId: string;
  professionalId: string;
  date: string;
  time: string;
  duration?: number;
  type: 'consulta' | 'encontro';
  status: 'agendada' | 'realizada' | 'cancelada';
  location?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}
```

### 3. Gerenciamento de Exames

**Descrição:** CRUD de exames com upload de documentos, suporte a períodos gestacionais e banco de exames pré-definidos

**Páginas:**
- `/patients/[id]/exams` - Lista de Exames
- `/patients/[id]/exams/[examId]` - Detalhes do Exame
- `/patients/[id]/exams/new` - Formulário de Criação

**Fluxo:**
1. Profissional acessa lista de exames da paciente
2. Profissional seleciona exame pré-definido OU cria exame customizado
3. Define período gestacional (ex: 6ª semana) OU data específica
4. Faz upload de solicitação/resultado (imagens/PDFs)
5. Atualiza status do exame (solicitado, realizado, resultado disponível)

**Regras de Negócio:**
- Exame deve estar vinculado a uma paciente
- Período gestacional OU data específica são obrigatórios
- Status: solicitado, agendado, realizado, resultado_disponível
- Permitir múltiplos uploads (solicitação + resultado)
- Tipos de arquivo aceitos: PDF, JPG, PNG (máx 10MB por arquivo)
- Banco de exames pré-definidos com períodos recomendados

**API Endpoints:**

```typescript
// GET /api/exams/predefined
// Response: PredefinedExam[]

// POST /api/exams
// Body: CreateExamDTO
// Response: Exam

// GET /api/exams
// Query params: patientId, status, page=1, limit=20
// Response: { data: Exam[], total: number, page: number }

// GET /api/exams/[id]
// Response: Exam

// PUT /api/exams/[id]
// Body: UpdateExamDTO
// Response: Exam

// DELETE /api/exams/[id]
// Response: { success: boolean }

// POST /api/exams/[id]/documents
// Body: FormData (multipart/form-data)
// Fields: file (File), type ('solicitacao' | 'resultado')
// Response: ExamDocument

// DELETE /api/exams/[examId]/documents/[documentId]
// Response: { success: boolean }

// GET /api/exams/documents/[documentId]
// Response: File stream (download)
```

**Schemas de Validação:**
```typescript
const CreateExamSchema = z.object({
  patientId: z.string().uuid(),
  predefinedExamId: z.string().uuid().optional(),
  customName: z.string().optional(),
  gestationalPeriod: z.string().optional(),
  specificDate: z.string().datetime().optional(),
  status: z.enum(['solicitado', 'agendado', 'realizado', 'resultado_disponível']).default('solicitado'),
  notes: z.string().optional(),
}).refine(
  (data) => data.gestationalPeriod || data.specificDate,
  { message: "Período gestacional ou data específica são obrigatórios" }
).refine(
  (data) => data.predefinedExamId || data.customName,
  { message: "Exame pré-definido ou nome customizado são obrigatórios" }
);

const UpdateExamSchema = CreateExamSchema.partial().omit({ patientId: true });

const UploadDocumentSchema = z.object({
  type: z.enum(['solicitacao', 'resultado']),
});
```

**Dados:**
```typescript
interface PredefinedExam {
  id: string;
  name: string;
  description?: string;
  recommendedPeriod?: string;
}

interface Exam {
  id: string;
  patientId: string;
  predefinedExamId?: string;
  customName?: string;
  gestationalPeriod?: string;
  specificDate?: string;
  status: 'solicitado' | 'agendado' | 'realizado' | 'resultado_disponível';
  documents: ExamDocument[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface ExamDocument {
  id: string;
  examId: string;
  type: 'solicitacao' | 'resultado';
  fileUrl: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  uploadedAt: string;
}
```

### 4. Sistema de Notificações

**Descrição:** Envio de notificações push via Web Push API e emails para lembretes de exames e consultas

**Fluxo:**
1. Sistema calcula horário de envio baseado em configuração
2. Notificação é enviada para profissional e/ou gestante (push + email)
3. Usuário clica na notificação e é direcionado para detalhes

**Regras de Negócio:**
- Lembrete de consulta: 24h antes e 1h antes
- Lembrete de exame: quando período gestacional for atingido ou 3 dias antes da data específica
- Usuário pode desativar notificações nas configurações
- Notificações enviadas via Web Push API + email fallback
- Cron job para processar notificações pendentes

**API Endpoints:**

```typescript
// POST /api/notifications/schedule
// Body: ScheduleNotificationDTO
// Response: ScheduledNotification

// DELETE /api/notifications/[id]
// Response: { success: boolean }

// PUT /api/users/[id]/notification-settings
// Body: UpdateNotificationSettingsDTO
// Response: NotificationSettings

// POST /api/notifications/subscribe
// Body: { subscription: PushSubscription }
// Response: { success: boolean }

// POST /api/notifications/unsubscribe
// Body: { endpoint: string }
// Response: { success: boolean }
```

**Schemas de Validação:**
```typescript
const UpdateNotificationSettingsSchema = z.object({
  appointmentReminders: z.boolean(),
  examReminders: z.boolean(),
  appointmentReminderTiming: z.array(z.number()).default([24, 1]),
  examReminderTiming: z.number().default(3),
  emailNotifications: z.boolean().default(true),
  pushNotifications: z.boolean().default(true),
});
```

**Dados:**
```typescript
interface NotificationSettings {
  userId: string;
  appointmentReminders: boolean;
  examReminders: boolean;
  appointmentReminderTiming: number[];
  examReminderTiming: number;
  emailNotifications: boolean;
  pushNotifications: boolean;
}

interface ScheduledNotification {
  id: string;
  userId: string;
  type: 'appointment' | 'exam';
  referenceId: string;
  scheduledFor: string;
  sent: boolean;
  method: 'push' | 'email' | 'both';
}
```

### 5. Gerenciamento de Equipe

**Descrição:** Formação de equipe multiprofissional (1 obstetra + 1 enfermeiro + 1 doula) com compartilhamento de dados da gestante

**Páginas:**
- `/patients/[id]/team` - Equipe da Paciente
- `/invites` - Lista de Convites Recebidos

**Fluxo:**
1. Profissional acessa perfil da paciente e visualiza equipe atual
2. Profissional envia convite para outro profissional (tipo diferente)
3. Profissional convidado recebe notificação e aceita/recusa
4. Após aceite, profissional tem acesso completo aos dados da paciente

**Regras de Negócio:**
- Equipe limitada a 1 profissional de cada tipo: obstetra, enfermeiro, doula
- Apenas profissionais já na equipe podem convidar outros
- Profissional convidado deve ter cadastro no app
- Convite expira em 7 dias
- Todos da equipe têm acesso completo a: consultas, exames, documentos, serviços
- Profissional pode sair da equipe a qualquer momento

**API Endpoints:**

```typescript
// GET /api/patients/[patientId]/team
// Response: TeamMember[]

// POST /api/patients/[patientId]/team/invite
// Body: InviteTeamMemberDTO
// Response: TeamInvite

// GET /api/team/invites
// Response: TeamInvite[]

// PUT /api/team/invites/[id]/accept
// Response: TeamMember

// PUT /api/team/invites/[id]/reject
// Response: { success: boolean }

// DELETE /api/patients/[patientId]/team/[professionalId]
// Response: { success: boolean }
```

**Schemas de Validação:**
```typescript
const InviteTeamMemberSchema = z.object({
  professionalId: z.string().uuid(),
  professionalType: z.enum(['obstetra', 'enfermeiro', 'doula']),
});
```

**Dados:**
```typescript
interface TeamMember {
  id: string;
  patientId: string;
  professionalId: string;
  professionalType: 'obstetra' | 'enfermeiro' | 'doula';
  professionalName: string;
  professionalEmail: string;
  joinedAt: string;
}

interface TeamInvite {
  id: string;
  patientId: string;
  invitedBy: string;
  invitedProfessionalId: string;
  professionalType: 'obstetra' | 'enfermeiro' | 'doula';
  status: 'pendente' | 'aceito' | 'recusado' | 'expirado';
  expiresAt: string;
  createdAt: string;
}
```

### 6. Serviços de Monitoramento

**Descrição:** Ferramentas para monitoramento de sinais vitais e contrações, compartilhadas com toda equipe

**Páginas:**
- `/patients/[id]/services` - Dashboard de Serviços
- `/patients/[id]/services/contractions` - Temporizador de Contrações
- `/patients/[id]/services/heart-rate` - Registro de Frequência Cardíaca
- `/patients/[id]/services/glucose` - Registro de Glicemia

**Fluxo - Temporizador de Contrações:**
1. Gestante ou profissional inicia temporizador ao começar contração
2. Para temporizador ao fim da contração
3. Sistema registra duração e intervalo entre contrações
4. Exibe histórico e padrões identificados

**Fluxo - Frequência Cardíaca:**
1. Gestante ou profissional registra medição de FC
2. Informa valor e data/hora da medição
3. Sistema armazena e exibe histórico

**Fluxo - Glicemia:**
1. Gestante ou profissional registra medição de glicemia
2. Informa valor, data/hora e período (jejum, pós-prandial)
3. Sistema armazena e exibe histórico

**Regras de Negócio:**
- Todos os dados são visíveis para toda equipe da paciente
- Temporizador: registrar timestamp início, fim e calcular duração
- FC: valores entre 40-200 bpm
- Glicemia: valores entre 20-600 mg/dL
- Permitir adicionar observações em cada registro
- Exibir gráficos de evolução temporal (recharts)

**API Endpoints:**

```typescript
// POST /api/patients/[patientId]/contractions
// Body: CreateContractionDTO
// Response: Contraction

// GET /api/patients/[patientId]/contractions
// Query params: startDate, endDate, page=1, limit=50
// Response: { data: Contraction[], total: number }

// POST /api/patients/[patientId]/heart-rate
// Body: CreateHeartRateDTO
// Response: HeartRate

// GET /api/patients/[patientId]/heart-rate
// Query params: startDate, endDate, page=1, limit=50
// Response: { data: HeartRate[], total: number }

// POST /api/patients/[patientId]/glucose
// Body: CreateGlucoseDTO
// Response: Glucose

// GET /api/patients/[patientId]/glucose
// Query params: startDate, endDate, page=1, limit=50
// Response: { data: Glucose[], total: number }
```

**Schemas de Validação:**
```typescript
const CreateContractionSchema = z.object({
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  notes: z.string().optional(),
}).refine(
  (data) => new Date(data.endTime) > new Date(data.startTime),
  { message: "Fim deve ser posterior ao início" }
);

const CreateHeartRateSchema = z.object({
  value: z.number().min(40).max(200),
  measuredAt: z.string().datetime(),
  notes: z.string().optional(),
});

const CreateGlucoseSchema = z.object({
  value: z.number().min(20).max(600),
  period: z.enum(['jejum', 'pos_prandial', 'outro']),
  measuredAt: z.string().datetime(),
  notes: z.string().optional(),
});
```

**Dados:**
```typescript
interface Contraction {
  id: string;
  patientId: string;
  startTime: string;
  endTime: string;
  duration: number;
  interval?: number;
  notes?: string;
  recordedBy: string;
  createdAt: string;
}

interface HeartRate {
  id: string;
  patientId: string;
  value: number;
  measuredAt: string;
  notes?: string;
  recordedBy: string;
  createdAt: string;
}

interface Glucose {
  id: string;
  patientId: string;
  value: number;
  period: 'jejum' | 'pos_prandial' | 'outro';
  measuredAt: string;
  notes?: string;
  recordedBy: string;
  createdAt: string;
}
```

## Navegação

```
/ (Landing Page - público)

/auth
├── /login
├── /register
└── /forgot-password

/dashboard (Profissional)
├── /patients (Lista de Pacientes)
│   ├── /new (Criar Paciente)
│   └── /[id]
│       ├── /profile (Perfil)
│       ├── /appointments (Consultas)
│       │   ├── /new
│       │   └── /[appointmentId]
│       ├── /exams (Exames)
│       │   ├── /new
│       │   └── /[examId]
│       ├── /team (Equipe)
│       └── /services (Serviços)
│           ├── /contractions
│           ├── /heart-rate
│           └── /glucose
├── /invites (Convites Recebidos)
└── /settings (Configurações)

/patient (Gestante - acesso limitado)
├── /profile (Meu Perfil)
├── /appointments (Minhas Consultas)
├── /exams (Meus Exames)
├── /team (Minha Equipe)
└── /services (Meus Serviços)
    ├── /contractions
    ├── /heart-rate
    └── /glucose

/register/patient/[token] (Cadastro via Link)
```

## Autenticação & Autorização

**Supabase Auth Configuration:**

```typescript
// lib/supabase.ts
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

// Client-side
export const createClient = () => createClientComponentClient()

// Server-side
export const createServerClient = () => createServerComponentClient({ cookies })
```

**Providers Configurados:**
- Google OAuth
- Facebook OAuth
- Email/Password (magic link opcional)

**Fluxo de Autenticação:**
1. Usuário seleciona método (Google/Facebook/Email)
2. Supabase Auth autentica e retorna sessão
3. Session armazenada em cookie (gerenciado pelo Supabase)
4. Middleware verifica sessão em rotas protegidas
5. Refresh token gerenciado automaticamente pelo Supabase

**Tipos de Usuário:**
- `professional`: acesso completo a gestão de pacientes
  - Tipos: `obstetra`, `enfermeiro`, `doula`
- `patient`: acesso limitado ao próprio perfil e dados

**Regras de Autorização:**
- Profissional acessa apenas pacientes vinculadas diretamente ou via equipe
- Gestante acessa apenas próprios dados
- Apenas membros da equipe acessam dados da paciente
- Convites apenas entre profissionais de tipos diferentes

**Row Level Security (RLS) - Supabase:**

```sql
-- Políticas de segurança no Supabase para tabela patients
CREATE POLICY "Profissionais veem apenas suas pacientes"
ON patients FOR SELECT
USING (
  auth.uid() IN (
    SELECT professional_id FROM patient_professionals WHERE patient_id = id
    UNION
    SELECT professional_id FROM team_members 
    WHERE patient_id = patients.id
  )
);

-- Políticas similares para outras tabelas
```

**Middleware de Autorização:**
```typescript
// middleware.ts
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req: request, res })
  
  const {
    data: { session },
  } = await supabase.auth.getSession()
  
  // Verificar autenticação
  if (!session && request.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }
  
  // Verificar tipo de usuário e permissões
  if (session) {
    const { data: user } = await supabase
      .from('users')
      .select('user_type, professional_type')
      .eq('id', session.user.id)
      .single()
    
    // Redirecionar paciente tentando acessar dashboard profissional
    if (user?.user_type === 'patient' && request.nextUrl.pathname.startsWith('/dashboard')) {
      return NextResponse.redirect(new URL('/patient/profile', request.url))
    }
    
    // Redirecionar profissional tentando acessar área de paciente
    if (user?.user_type === 'professional' && request.nextUrl.pathname.startsWith('/patient')) {
      return NextResponse.redirect(new URL('/dashboard/patients', request.url))
    }
  }
  
  return res
}

export const config = {
  matcher: ['/dashboard/:path*', '/patient/:path*'],
}
```

**API Routes com Autenticação:**

```typescript
// app/api/patients/route.ts
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const supabase = createRouteHandlerClient({ cookies })
  
  const {
    data: { session },
  } = await supabase.auth.getSession()
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  // Verificar tipo de usuário
  const { data: user } = await supabase
    .from('users')
    .select('user_type')
    .eq('id', session.user.id)
    .single()
  
  if (user?.user_type !== 'professional') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  
  // Buscar pacientes
  const { data, error } = await supabase
    .from('patients')
    .select('*')
    .order('due_date', { ascending: true })
  
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  
  return NextResponse.json({ data })
}
```

**Dados:**
```typescript
interface User {
  id: string;
  email: string;
  name: string;
  userType: 'professional' | 'patient';
  professionalType?: 'obstetra' | 'enfermeiro' | 'doula';
  avatarUrl?: string;
  phone?: string;
  createdAt: string;
}

interface Session {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  expires_at: number;
  user: {
    id: string;
    email: string;
    user_metadata: {
      name: string;
      avatar_url?: string;
    };
  };
}
```

**Hooks Customizados:**

```typescript
// hooks/useUser.ts
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import type { User } from '@/types'

export function useUser() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  
  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session) {
        const { data } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single()
        
        setUser(data)
      }
      
      setLoading(false)
    }
    
    getUser()
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session) {
          getUser()
        } else {
          setUser(null)
        }
      }
    )
    
    return () => subscription.unsubscribe()
  }, [])
  
  return { user, loading }
}
```

## Dados & Estado

**Prisma Schema (principais entidades):**

```prisma
model User {
  id               String   @id @default(uuid())
  email            String   @unique
  name             String
  password         String?
  userType         UserType
  professionalType ProfessionalType?
  avatarUrl        String?
  phone            String?
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
}

enum UserType {
  PROFESSIONAL
  PATIENT
}

enum ProfessionalType {
  OBSTETRA
  ENFERMEIRO
  DOULA
}

model Patient {
  id              String   @id @default(uuid())
  name            String
  email           String
  phone           String
  dateOfBirth     DateTime
  dueDate         DateTime
  gestationalWeek Int?
  address         String?
  observations    String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

model Appointment {
  id             String            @id @default(uuid())
  patientId      String
  professionalId String
  date           DateTime
  time           String
  duration       Int?
  type           AppointmentType
  status         AppointmentStatus
  location       String?
  notes          String?
  createdAt      DateTime          @default(now())
  updatedAt      DateTime          @updatedAt
}

model Exam {
  id                 String     @id @default(uuid())
  patientId          String
  predefinedExamId   String?
  customName         String?
  gestationalPeriod  String?
  specificDate       DateTime?
  status             ExamStatus
  notes              String?
  createdAt          DateTime   @default(now())
  updatedAt          DateTime   @updatedAt
}

model ExamDocument {
  id         String   @id @default(uuid())
  examId     String
  type       DocumentType
  fileUrl    String
  fileName   String
  fileType   String
  fileSize   Int
  uploadedAt DateTime @default(now())
}

model TeamMember {
  id               String           @id @default(uuid())
  patientId        String
  professionalId   String
  professionalType ProfessionalType
  joinedAt         DateTime         @default(now())
}

model Contraction {
  id         String   @id @default(uuid())
  patientId  String
  startTime  DateTime
  endTime    DateTime
  duration   Int
  interval   Int?
  notes      String?
  recordedBy String
  createdAt  DateTime @default(now())
}

model HeartRate {
  id         String   @id @default(uuid())
  patientId  String
  value      Int
  measuredAt DateTime
  notes      String?
  recordedBy String
  createdAt  DateTime @default(now())
}

model Glucose {
  id         String        @id @default(uuid())
  patientId  String
  value      Int
  period     GlucosePeriod
  measuredAt DateTime
  notes      String?
  recordedBy String
  createdAt  DateTime @default(now())
}
```

**Estado Global:**
- Gerenciamento: Context API ou Zustand
- Cache: React Query / SWR para cache de requisições
- Formulários: React Hook Form com Zod resolver

**PWA Features:**
- Service Worker para cache offline
- Web App Manifest
- Cache de assets estáticos
- Cache de dados via IndexedDB (opcional)

## UI/UX

**Design System (Tailwind + Shadcn):**

**Cores (tailwind.config.ts):**
```typescript
colors: {
  primary: {
    50: '#F5F3FF',
    500: '#6B4CE6',
    600: '#5B3DD1',
    700: '#4C2EBC',
  },
  secondary: {
    50: '#FFF1F5',
    500: '#FF6B9D',
    600: '#FF5289',
  },
}
```

**Tipografia:**
- Fonte: Inter (next/font/google)
- Classes Tailwind:
  - h1: `text-3xl font-bold`
  - h2: `text-2xl font-semibold`
  - h3: `text-xl font-semibold`
  - body: `text-base font-normal`
  - caption: `text-sm font-normal`

**Espaçamentos Tailwind:**
- `space-1` (4px)
- `space-2` (8px)
- `space-3` (12px)
- `space-4` (16px)
- `space-6` (24px)
- `space-8` (32px)
- `space-12` (48px)

**Border Radius:**
- `rounded-lg` (8px) - padrão
- `rounded-2xl` (16px) - cards
- `rounded-3xl` (24px) - modais

**Componentes Shadcn/ui:**
- Button (variants: default, secondary, outline, ghost, destructive)
- Input
- Label
- Form (integrado com React Hook Form)
- Card
- Avatar
- Badge
- Dialog
- Sheet
- Popover
- Select
- Calendar
- Checkbox
- RadioGroup
- Textarea
- Toast
- Table
- Tabs
- Alert
- Progress
- Skeleton

**Componentes Customizados:**
- FileUpload
- ImageViewer
- DateTimePicker
- ContractionTimer
- VitalsChart (recharts)

**Responsividade:**
- Breakpoints Tailwind: sm (640px), md (768px), lg (1024px), xl (1280px)
- Mobile-first approach
- Layout adaptativo: sidebar colapsável em mobile, 2 colunas em desktop
- Uso de `@media` queries quando necessário

## Requisitos Não-Funcionais

**Performance:**
- Lighthouse Score: >90 em todas categorias
- First Contentful Paint: <1.5s
- Time to Interactive: <3s
- Next.js Image Optimization para imagens
- Code splitting automático por rota
- Lazy loading de componentes pesados

**PWA:**
- Instalável em home screen (mobile e desktop)
- Service Worker para cache offline
- Funcionalidades offline:
  - Visualização de dados em cache
  - Indicador de status de conexão
  - Queue de ações para sincronizar quando online
- Web Push Notifications

**Tratamento de Erros:**
- Error Boundaries em componentes críticos
- Mensagens de erro claras e acionáveis
- Toast notifications para feedback de ações
- Logging: Sentry ou similar
- Retry automático para falhas de rede (via React Query)

**Analytics:**
- Ferramenta: Google Analytics 4 ou Posthog
- Eventos a trackear:
  - user_login
  - user_register
  - patient_created
  - patient_invite_sent
  - appointment_created
  - appointment_updated
  - exam_created
  - exam_document_uploaded
  - team_invite_sent
  - team_invite_accepted
  - contraction_recorded
  - heart_rate_recorded
  - glucose_recorded

**Segurança:**
- HTTPS obrigatório
- CORS configurado adequadamente
- Rate limiting (via middleware ou Vercel)
- Validação server-side com Zod em todas rotas API
- Sanitização de inputs
- Headers de segurança (helmet)
- CSP (Content Security Policy)
- Cookie httpOnly, secure, sameSite para sessões
- Upload de arquivos: validação de tipo e tamanho
- SQL injection protegido via Prisma ORM

**SEO:**
- Metadata otimizada por página (next/metadata)
- Sitemap.xml gerado
- robots.txt configurado
- Open Graph tags
- Structured data (JSON-LD) onde aplicável

## Restrições

- Upload máximo por arquivo: 10MB
- Formatos aceitos para documentos: PDF, JPG, PNG
- Link de cadastro de paciente expira em 7 dias
- Link de convite de equipe expira em 7 dias
- Limite de 1 profissional por tipo na equipe
- Navegadores suportados: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- Node.js: 18.x ou superior
- Database: PostgreSQL 14+

## Estrutura de Diretórios

```
/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   ├── register/
│   │   └── forgot-password/
│   ├── (dashboard)/
│   │   ├── patients/
│   │   ├── invites/
│   │   └── settings/
│   ├── (patient)/
│   │   ├── profile/
│   │   ├── appointments/
│   │   └── services/
│   ├── api/
│   │   ├── patients/
│   │   ├── appointments/
│   │   ├── exams/
│   │   ├── team/
│   │   └── notifications/
│   └── register/patient/[token]/
├── components/
│   ├── ui/ (shadcn components)
│   ├── forms/
│   ├── layouts/
│   └── shared/
├── lib/
│   ├── supabase.ts (Supabase clients)
│   ├── validations/ (Zod schemas)
│   └── utils.ts
├── hooks/
│   ├── useUser.ts
│   └── useSupabase.ts
├── types/
├── public/
│   ├── manifest.json
│   └── sw.js
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── middleware.ts
├── next.config.js
└── tailwind.config.ts
```

## Variáveis de Ambiente

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL="https://xxx.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="..."
SUPABASE_SERVICE_ROLE_KEY="..."

# Supabase Auth Providers (configurar no Supabase Dashboard)
# Google OAuth redirect: https://xxx.supabase.co/auth/v1/callback
# Facebook OAuth redirect: https://xxx.supabase.co/auth/v1/callback

# Email (opcional para transacionais)
SMTP_HOST="..."
SMTP_PORT="..."
SMTP_USER="..."
SMTP_PASSWORD="..."

# Push Notifications
VAPID_PUBLIC_KEY="..."
VAPID_PRIVATE_KEY="..."

# Analytics (opcional)
NEXT_PUBLIC_GA_ID="..."
```

## Critérios de Aceite

**Autenticação:**
- [ ] Profissional consegue criar conta via Google, Facebook ou email/senha
- [ ] Login funciona com todos os métodos (Supabase Auth)
- [ ] Sessão persiste após reload
- [ ] Logout limpa sessão corretamente
- [ ] Middleware protege rotas adequadamente
- [ ] RLS (Row Level Security) funciona corretamente no Supabase
- [ ] Hooks customizados (useUser) funcionam

**Gerenciamento de Pacientes:**
- [ ] Profissional consegue criar paciente manualmente
- [ ] Profissional consegue gerar link de cadastro
- [ ] Gestante consegue se cadastrar via link
- [ ] Lista de pacientes ordenada por data prevista de parto
- [ ] Gestante consegue visualizar próprio perfil completo
- [ ] Validação de formulários funciona (React Hook Form + Zod)

**Consultas/Encontros:**
- [ ] Profissional consegue criar, editar e listar consultas
- [ ] Consultas ordenadas por data mais próxima
- [ ] Status pode ser atualizado
- [ ] Formulário valida data e hora corretamente

**Exames:**
- [ ] Profissional consegue criar exame usando pré-definidos ou customizado
- [ ] Exame aceita período gestacional ou data específica
- [ ] Upload de documentos (PDF, JPG, PNG) funciona
- [ ] Múltiplos documentos podem ser anexados
- [ ] Documentos são exibidos e podem ser baixados
- [ ] Validação de tamanho e tipo de arquivo funciona

**Notificações:**
- [ ] Usuário pode se inscrever em notificações push
- [ ] Notificações de lembrete são enviadas nos horários corretos
- [ ] Preferências de notificação podem ser atualizadas
- [ ] Email fallback funciona quando push não disponível

**Equipe:**
- [ ] Profissional consegue convidar outro profissional (tipo diferente)
- [ ] Profissional convidado recebe notificação
- [ ] Após aceite, profissional tem acesso aos dados da paciente
- [ ] Limite de 1 profissional por tipo é respeitado
- [ ] Convite expira em 7 dias
- [ ] Profissional pode sair da equipe

**Serviços:**
- [ ] Temporizador de contrações registra início, fim e duração
- [ ] Intervalo entre contrações é calculado automaticamente
- [ ] Registro de frequência cardíaca funciona
- [ ] Registro de glicemia funciona com períodos
- [ ] Históricos são exibidos corretamente
- [ ] Gráficos de evolução temporal são renderizados
- [ ] Todos membros da equipe visualizam dados de serviços

**PWA:**
- [ ] App é instalável em desktop e mobile
- [ ] Service Worker está registrado
- [ ] Funciona offline (leitura de dados em cache)
- [ ] Indicador de status de conexão funciona
- [ ] Manifest.json está correto

**UI/UX:**
- [ ] Design responsivo em todos breakpoints
- [ ] Componentes Shadcn/ui estilizados corretamente
- [ ] Loading states implementados
- [ ] Error states implementados
- [ ] Empty states implementados
- [ ] Toasts de feedback funcionam
- [ ] Validação inline de formulários

**Performance:**
- [ ] Lighthouse Score >90 em todas categorias
- [ ] Imagens otimizadas com next/image
- [ ] Code splitting funcionando
- [ ] Lazy loading de componentes pesados
- [ ] API routes respondem em <500ms (média)