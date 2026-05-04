/**
 * Re-pack display_order values into a clean 1..N sequence.
 *
 * The admin forms let staff type any integer for display_order, which means
 * two rows can collide on the same number. After a save we call this helper
 * to re-sort the table so:
 *   - Positions are contiguous (1, 2, 3, … N) with no gaps or duplicates.
 *   - The just-saved row wins the tie at its requested position. So if you
 *     change row D from 4 to 2, the existing row at 2 shifts to 3, etc.
 *
 * Issues one UPDATE per row that needs to change. Cheap because these
 * tables hold tens of rows at most and admin saves are infrequent.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

interface OrderableRow {
  id: string;
  display_order: number;
  created_at: string;
}

export async function repackDisplayOrder(
  supabase: SupabaseClient,
  table: string,
  savedRowId: string,
): Promise<void> {
  const { data, error } = await supabase
    .from(table)
    .select("id, display_order, created_at");
  if (error || !data) return;

  const rows = (data as OrderableRow[]).slice().sort((a, b) => {
    if (a.display_order !== b.display_order) {
      return a.display_order - b.display_order;
    }
    // Same display_order: the saved row wins, so it lands at its target
    // position and the existing row shifts down.
    if (a.id === savedRowId) return -1;
    if (b.id === savedRowId) return 1;
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const newOrder = i + 1;
    if (row.display_order !== newOrder) {
      await supabase
        .from(table)
        .update({ display_order: newOrder })
        .eq("id", row.id);
    }
  }
}
