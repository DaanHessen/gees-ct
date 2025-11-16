"use client";

import { useState, type ReactNode } from "react";
import { useAuth } from "@/lib/auth-context";
import { useLanguage } from "@/lib/language-context";
import { useMeasurement } from "@/lib/measurement-context";
import type { Language } from "@/lib/translations";
import { useTeam, type TeamRole } from "@/lib/team-context";
import { describeError } from "@/lib/error-utils";
import { StatusToast, type StatusToastState } from "@/components/StatusToast";
import { Spinner } from "@/components/Spinner";

export default function SettingsPage() {
  const { user } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const { system, setSystem } = useMeasurement();
  const {
    members,
    loading: teamLoading,
    currentRole,
    addMember,
    updateMemberRole,
    removeMember,
  } = useTeam();

  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [measurementSaving, setMeasurementSaving] = useState(false);
  const [measurementMessage, setMeasurementMessage] = useState("");
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [newMemberRole, setNewMemberRole] = useState<TeamRole>("user");
  const [teamBusy, setTeamBusy] = useState(false);
  const [teamToast, setTeamToast] = useState<StatusToastState | null>(null);

  const isAdmin = currentRole === "admin";

  const handleLanguageChange = async (newLanguage: Language) => {
    setIsSaving(true);
    setSaveMessage("");
    await new Promise((resolve) => setTimeout(resolve, 500));
    setLanguage(newLanguage);
    setIsSaving(false);
    setSaveMessage(t("settings.saved"));
    setTimeout(() => setSaveMessage(""), 3000);
  };

  const handleMeasurementChange = async (next: "metric" | "imperial") => {
    setMeasurementSaving(true);
    setMeasurementMessage("");
    await new Promise((resolve) => setTimeout(resolve, 400));
    setSystem(next);
    setMeasurementSaving(false);
    setMeasurementMessage(t("settings.saved"));
    setTimeout(() => setMeasurementMessage(""), 3000);
  };

  const handleInviteMember = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!newMemberEmail.trim()) {
      setTeamToast({ type: "error", message: t("settings.teamEmail") });
      return;
    }

    setTeamBusy(true);
    try {
      await addMember(newMemberEmail, newMemberRole);
      setNewMemberEmail("");
      setTeamToast({ type: "success", message: t("settings.teamAdded") });
    } catch (error) {
      setTeamToast({ type: "error", message: describeError(error) });
    } finally {
      setTeamBusy(false);
    }
  };

  const handleRoleUpdate = async (id: string, role: TeamRole) => {
    setTeamBusy(true);
    try {
      await updateMemberRole(id, role);
      setTeamToast({ type: "success", message: t("settings.teamUpdated") });
    } catch (error) {
      setTeamToast({ type: "error", message: describeError(error) });
    } finally {
      setTeamBusy(false);
    }
  };

  const handleRemoveMember = async (id: string, email: string) => {
    if (email.toLowerCase() === (user?.email ?? "").toLowerCase()) {
      return;
    }
    if (!window.confirm(t("settings.teamRemove"))) return;

    setTeamBusy(true);
    try {
      await removeMember(id);
      setTeamToast({ type: "success", message: t("settings.teamRemoved") });
    } catch (error) {
      setTeamToast({ type: "error", message: describeError(error) });
    } finally {
      setTeamBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#1b1c1f] p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <header className="mb-2 space-y-2">
          <h1 className="text-3xl font-bold text-white">{t("settings.title")}</h1>
          <p className="text-white/60">{t("settings.subtitle")}</p>
        </header>

        <section className="space-y-6 rounded-2xl border border-white/10 bg-[#202226] p-6">
          <div>
            <h2 className="text-xl font-semibold text-white">{t("settings.account")}</h2>
            <p className="text-sm text-white/50">{isAdmin ? t("settings.teamAdminHint") : t("settings.teamViewerHint")}</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-white/50">{t("settings.email")}</p>
              <p className="text-white">{user?.email || "—"}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-white/50">{t("settings.userId")}</p>
              <p className="font-mono text-sm text-white/60 break-all">{user?.id || "—"}</p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-[#202226] p-6">
          <h2 className="text-xl font-semibold text-white">{t("settings.language")}</h2>
          <p className="text-sm text-white/60 mb-4">{t("settings.languageDescription")}</p>
          <div className="space-y-3">
            <LanguageButton
              active={language === "en"}
              disabled={isSaving}
              label={t("settings.english")}
              description={t("settings.englishDescription")}
              flag="🇬🇧"
              onClick={() => handleLanguageChange("en")}
            />
            <LanguageButton
              active={language === "nl"}
              disabled={isSaving}
              label={t("settings.dutch")}
              description={t("settings.dutchDescription")}
              flag="🇳🇱"
              onClick={() => handleLanguageChange("nl")}
            />
          </div>
          {saveMessage ? <InlineSuccess>{saveMessage}</InlineSuccess> : null}
        </section>

        <section className="rounded-2xl border border-white/10 bg-[#202226] p-6">
          <h2 className="text-xl font-semibold text-white">{t("settings.measurement")}</h2>
          <p className="text-sm text-white/60 mb-4">{t("settings.measurementDescription")}</p>
          <div className="space-y-3">
            <LanguageButton
              active={system === "metric"}
              disabled={measurementSaving}
              label={t("settings.metric")}
              description={t("settings.metricDescription")}
              onClick={() => handleMeasurementChange("metric")}
            />
            <LanguageButton
              active={system === "imperial"}
              disabled={measurementSaving}
              label={t("settings.imperial")}
              description={t("settings.imperialDescription")}
              onClick={() => handleMeasurementChange("imperial")}
            />
          </div>
          {measurementMessage ? <InlineSuccess>{measurementMessage}</InlineSuccess> : null}
        </section>

        <section className="space-y-4 rounded-2xl border border-white/10 bg-[#202226] p-6">
          <div>
            <h2 className="text-xl font-semibold text-white">{t("settings.team")}</h2>
            <p className="text-sm text-white/60">{t("settings.teamDescription")}</p>
          </div>

          {isAdmin ? (
            <div className="space-y-4">
              <form onSubmit={handleInviteMember} className="space-y-3">
                <div className="grid gap-3 md:grid-cols-[2fr_1fr]">
                  <label className="text-sm text-white/70">
                    {t("settings.teamEmail")}
                    <input
                      type="email"
                      value={newMemberEmail}
                      onChange={(event) => setNewMemberEmail(event.target.value)}
                      className="mt-2 w-full rounded-lg border border-white/10 bg-[#1b1c1f] px-4 py-2 text-white focus:border-[#c62828]/40 focus:outline-none focus:ring-2 focus:ring-[#c62828]/20"
                      placeholder="team@restaurant.com"
                      required
                    />
                  </label>
                  <label className="text-sm text-white/70">
                    {t("settings.teamRole")}
                    <select
                      value={newMemberRole}
                      onChange={(event) => setNewMemberRole(event.target.value as TeamRole)}
                      className="mt-2 w-full rounded-lg border border-white/10 bg-[#1b1c1f] px-4 py-2 text-white focus:border-[#c62828]/40 focus:outline-none focus:ring-2 focus:ring-[#c62828]/20"
                    >
                      <option value="admin">{t("settings.teamAdmin")}</option>
                      <option value="user">{t("settings.teamUser")}</option>
                    </select>
                  </label>
                </div>
                <button
                  type="submit"
                  disabled={teamBusy}
                  className="rounded-lg border border-[#c62828] bg-[#c62828]/10 px-4 py-2 text-sm font-semibold text-white hover:bg-[#c62828]/20 disabled:opacity-50"
                >
                  {t("settings.teamAdd")}
                </button>
              </form>

              <div className="space-y-3">
                <p className="text-xs uppercase tracking-[0.3em] text-white/40">
                  {members.length} {t("settings.teamMembers")}
                </p>
                {teamLoading ? (
                  <div className="flex items-center gap-2 text-white/60">
                    <Spinner />
                    <span>{t("settings.teamMembers")}</span>
                  </div>
                ) : members.length === 0 ? (
                  <p className="text-sm text-white/50">{t("settings.teamEmpty")}</p>
                ) : (
                  <div className="space-y-3">
                    {members.map((member) => {
                      const isCurrentUser =
                        member.email.toLowerCase() === (user?.email ?? "").toLowerCase();
                      return (
                        <div
                          key={member.id}
                          className="flex flex-col gap-3 rounded-xl border border-white/10 bg-[#1b1c1f] p-4 md:flex-row md:items-center md:justify-between"
                        >
                          <div>
                            <p className="text-sm font-semibold text-white">{member.email}</p>
                            <p className="text-xs text-white/50">
                              {member.role === "admin"
                                ? t("settings.teamAdminHint")
                                : t("settings.teamViewerHint")}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <select
                              value={member.role}
                              disabled={isCurrentUser || teamBusy}
                              onChange={(event) =>
                                handleRoleUpdate(member.id, event.target.value as TeamRole)
                              }
                              className="rounded-lg border border-white/10 bg-[#202226] px-3 py-2 text-sm text-white focus:border-[#c62828]/40 focus:outline-none focus:ring-2 focus:ring-[#c62828]/20"
                            >
                              <option value="admin">{t("settings.teamAdmin")}</option>
                              <option value="user">{t("settings.teamUser")}</option>
                            </select>
                            <button
                              type="button"
                              disabled={isCurrentUser || teamBusy}
                              onClick={() => handleRemoveMember(member.id, member.email)}
                              className="rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-white/60 hover:border-red-500/40 hover:text-red-300 disabled:opacity-40"
                            >
                              {t("settings.teamRemove")}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-white/10 bg-[#1b1c1f] p-4 text-sm text-white/70">
              {t("settings.teamRestricted")}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-red-900/30 bg-[#202226] p-6">
          <h2 className="text-xl font-semibold text-red-400">{t("settings.dangerZone")}</h2>
          <p className="text-sm text-white/60 mb-4">{t("settings.deleteDescription")}</p>
          <button 
            type="button"
            onClick={() => {
              if (window.confirm("Are you sure you want to delete your account? This action cannot be undone.")) {
                alert("Account deletion functionality coming soon");
              }
            }}
            className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-200 hover:bg-red-500/20 cursor-pointer transition-colors"
          >
            {t("settings.deleteButton")}
          </button>
        </section>
      </div>
      {teamToast ? <StatusToast status={teamToast} /> : null}
    </div>
  );
}

function LanguageButton({
  active,
  disabled,
  label,
  description,
  onClick,
  flag,
}: {
  active: boolean;
  disabled: boolean;
  label: string;
  description: string;
  onClick: () => void;
  flag?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition ${
        active
          ? "border-[#c62828] bg-[#c62828]/10 text-white"
          : "border-white/10 bg-[#1b1c1f] text-white/70 hover:border-white/20"
      }`}
    >
      <div className="flex items-center gap-3">
        {flag ? <span className="text-2xl">{flag}</span> : null}
        <div>
          <p className="font-semibold">{label}</p>
          <p className="text-xs text-white/50">{description}</p>
        </div>
      </div>
      {active ? (
        <svg className="h-5 w-5 text-[#c62828]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ) : null}
    </button>
  );
}

function InlineSuccess({ children }: { children: ReactNode }) {
  return (
    <div className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
      <div className="flex items-center gap-2">
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
        <span>{children}</span>
      </div>
    </div>
  );
}
