"use client";

import {
  disconnectGoogleCalendarAction,
  getGoogleCalendarStatusAction,
} from "@/actions/disconnect-google-calendar-action";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@ventre/supabase";
import { Badge } from "@ventre/ui/badge";
import { Button } from "@ventre/ui/button";
import { CheckCircle2, Calendar, Mail } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { useEffect, useState } from "react";
import { toast } from "sonner";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

type AuthItemProps = {
  icon: React.ReactNode;
  label: string;
  isEnabled: boolean;
  onEnable?: () => void;
  isLoading?: boolean;
};

function AuthItem({ icon, label, isEnabled, onEnable, isLoading }: AuthItemProps) {
  return (
    <div className="flex items-center justify-between py-4">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg border bg-background">
          {icon}
        </div>
        <span className="font-medium">{label}</span>
      </div>
      {isEnabled ? (
        <Badge
          variant="outline"
          className="gap-1.5 border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-400"
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
          Ativo
        </Badge>
      ) : (
        <Button
          size="sm"
          variant="outline"
          onClick={onEnable}
          disabled={isLoading}
          className="text-xs"
        >
          {isLoading ? "Conectando..." : "Conectar"}
        </Button>
      )}
    </div>
  );
}

type IntegrationItemProps = {
  icon: React.ReactNode;
  label: string;
  description: string;
  isConnected: boolean;
  isLoading?: boolean;
  onConnect?: () => void;
  onDisconnect?: () => void;
};

function IntegrationItem({
  icon,
  label,
  description,
  isConnected,
  isLoading,
  onConnect,
  onDisconnect,
}: IntegrationItemProps) {
  return (
    <div className="flex items-center justify-between py-4">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg border bg-background">
          {icon}
        </div>
        <div>
          <p className="font-medium text-sm">{label}</p>
          <p className="text-muted-foreground text-xs">{description}</p>
        </div>
      </div>
      {isConnected ? (
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="gap-1.5 border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-400"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            Ativo
          </Badge>
          <Button
            size="sm"
            variant="ghost"
            onClick={onDisconnect}
            disabled={isLoading}
            className="text-muted-foreground text-xs"
          >
            {isLoading ? "Desconectando..." : "Desconectar"}
          </Button>
        </div>
      ) : (
        <Button
          size="sm"
          variant="outline"
          onClick={onConnect}
          disabled={isLoading}
          className="text-xs"
        >
          {isLoading ? "Conectando..." : "Conectar"}
        </Button>
      )}
    </div>
  );
}

export default function SettingsScreen() {
  const { user, connectGoogleCalendar } = useAuth();
  const [isLinkingGoogle, setIsLinkingGoogle] = useState(false);
  const [isGoogleCalendarConnected, setIsGoogleCalendarConnected] = useState(false);

  const { execute: checkCalendarStatus } = useAction(getGoogleCalendarStatusAction, {
    onSuccess: ({ data }) => {
      if (data) setIsGoogleCalendarConnected(data.connected);
    },
  });

  const { execute: disconnectCalendar, isExecuting: isDisconnecting } = useAction(
    disconnectGoogleCalendarAction,
    {
      onSuccess: () => {
        setIsGoogleCalendarConnected(false);
        toast.success("Google Agenda desconectado");
      },
      onError: () => {
        toast.error("Erro ao desconectar Google Agenda");
      },
    },
  );

  useEffect(() => {
    checkCalendarStatus();
  }, [checkCalendarStatus]);

  const hasGoogleIdentity = user?.identities?.some((i) => i.provider === "google") ?? false;
  const hasEmailIdentity = user?.identities?.some((i) => i.provider === "email") ?? !!user?.email;

  const handleLinkGoogle = async () => {
    setIsLinkingGoogle(true);
    try {
      const { error } = await supabase.auth.linkIdentity({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=/profile/settings`,
        },
      });
      if (error) {
        toast.error("Erro ao conectar com o Google");
      }
    } catch {
      toast.error("Erro ao conectar com o Google");
      setIsLinkingGoogle(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 px-4 py-6">
      <div className="rounded-xl border bg-card p-4">
        <h2 className="mb-1 font-semibold text-base">Autenticação</h2>
        <p className="mb-4 text-muted-foreground text-sm">
          Métodos de acesso vinculados à sua conta
        </p>
        <div className="divide-y">
          <AuthItem
            icon={<Mail className="h-4 w-4 text-muted-foreground" />}
            label="Email"
            isEnabled={hasEmailIdentity}
          />
          <AuthItem
            icon={<GoogleIcon />}
            label="Google"
            isEnabled={hasGoogleIdentity}
            onEnable={handleLinkGoogle}
            isLoading={isLinkingGoogle}
          />
        </div>
      </div>

      <div className="rounded-xl border bg-card p-4">
        <h2 className="mb-1 font-semibold text-base">Integrações</h2>
        <p className="mb-4 text-muted-foreground text-sm">
          Conecte serviços externos para sincronizar seus dados
        </p>
        <div className="divide-y">
          <IntegrationItem
            icon={<Calendar className="h-4 w-4 text-muted-foreground" />}
            label="Google Agenda"
            description={
              isGoogleCalendarConnected
                ? "Agendamentos sincronizados automaticamente"
                : "Sincronize seus agendamentos com o Google Agenda"
            }
            isConnected={isGoogleCalendarConnected}
            isLoading={isDisconnecting}
            onConnect={connectGoogleCalendar}
            onDisconnect={() => disconnectCalendar()}
          />
        </div>
      </div>
    </div>
  );
}
