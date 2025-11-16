"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { useAuth } from "@/lib/auth-context";
import { getSupabaseBrowserClient } from "@/lib/supabase-client";
import { describeError } from "@/lib/error-utils";

export type TeamRole = "admin" | "user";

export type TeamMember = {
  id: string;
  email: string;
  role: TeamRole;
  created_at: string;
};

type TeamContextType = {
  members: TeamMember[];
  loading: boolean;
  error: string | null;
  currentRole: TeamRole;
  addMember: (email: string, role: TeamRole) => Promise<void>;
  updateMemberRole: (id: string, role: TeamRole) => Promise<void>;
  removeMember: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
};

const TeamContext = createContext<TeamContextType | undefined>(undefined);

export function TeamProvider({ children }: { children: ReactNode }) {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const { user } = useAuth();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadMembers = useCallback(async () => {
    if (!user?.email) {
      setMembers([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error: queryError } = await supabase
        .from("team_members")
        .select("id,email,role,created_at")
        .order("created_at", { ascending: true });

      if (queryError) throw queryError;

      let nextMembers = data ?? [];

      // Ensure the currently authenticated user always exists as an admin
      const normalizedEmail = user.email.toLowerCase();
      const existing = nextMembers.find(
        (entry) => entry.email.toLowerCase() === normalizedEmail,
      );

      if (!existing) {
        const { data: inserted, error: insertError } = await supabase
          .from("team_members")
          .insert({
            email: user.email,
            role: "admin",
          })
          .select()
          .single();

        if (insertError) throw insertError;
        nextMembers = [...nextMembers, inserted];
      }

      setMembers(
        nextMembers.sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
        ),
      );
      setError(null);
    } catch (err) {
      setError(describeError(err));
    } finally {
      setLoading(false);
    }
  }, [supabase, user]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  const addMember = useCallback(
    async (email: string, role: TeamRole) => {
      const cleaned = email.trim().toLowerCase();
      if (!cleaned) {
        throw new Error("Email is verplicht.");
      }

      const { error: upsertError } = await supabase
        .from("team_members")
        .upsert(
          {
            email: cleaned,
            role,
          },
          { onConflict: "email" },
        );

      if (upsertError) throw upsertError;
      await loadMembers();
    },
    [supabase, loadMembers],
  );

  const updateMemberRole = useCallback(
    async (id: string, role: TeamRole) => {
      const { error: updateError } = await supabase
        .from("team_members")
        .update({ role })
        .eq("id", id);

      if (updateError) throw updateError;
      await loadMembers();
    },
    [supabase, loadMembers],
  );

  const removeMember = useCallback(
    async (id: string) => {
      const { error: deleteError } = await supabase.from("team_members").delete().eq("id", id);
      if (deleteError) throw deleteError;
      await loadMembers();
    },
    [supabase, loadMembers],
  );

  const value = useMemo<TeamContextType>(() => {
    const normalizedEmail = user?.email?.toLowerCase();
    const currentMember =
      members.find((member) => member.email.toLowerCase() === normalizedEmail) ?? null;
    return {
      members,
      loading,
      error,
      currentRole: currentMember?.role ?? "user",
      addMember,
      updateMemberRole,
      removeMember,
      refresh: loadMembers,
    };
  }, [members, loading, error, addMember, updateMemberRole, removeMember, loadMembers, user]);

  return <TeamContext.Provider value={value}>{children}</TeamContext.Provider>;
}

export function useTeam() {
  const context = useContext(TeamContext);
  if (!context) {
    throw new Error("useTeam must be used within a TeamProvider");
  }
  return context;
}
