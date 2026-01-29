import { createServerSupabaseClient } from "@nascere/supabase"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    return NextResponse.json({ profile: user.user_metadata })

  } catch {
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })

  }
}
