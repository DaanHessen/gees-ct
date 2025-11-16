import type { SupabaseClient } from "@supabase/supabase-js";

export async function ensureIngredientRecord(
  supabase: SupabaseClient,
  name: string,
): Promise<string | null> {
  const cleaned = name.trim();
  if (!cleaned) return null;

  const { data: existing, error } = await supabase
    .from("ingredients")
    .select("id, name")
    .ilike("name", cleaned)
    .maybeSingle();

  if (error && (error as { code?: string }).code !== "PGRST116") {
    throw error;
  }

  if (existing) {
    return existing.id;
  }

  const { data: inserted, error: insertError } = await supabase
    .from("ingredients")
    .insert({ name: cleaned })
    .select()
    .single();

  if (insertError) throw insertError;
  return inserted.id;
}
