import type { SupabaseClient } from "@supabase/supabase-js";
import { getPoints } from "./favours";

export type Reward = { id: string; title: string; description: string; shop: string; category: string; icon: string; cost: number };

export type Redemption = {
  id: string;
  cost: number;
  code: string;
  created_at: string;
  reward: Pick<Reward, "title" | "shop" | "icon"> | null;
};

export async function listRewards(db: SupabaseClient) {
  const { data, error } = await db.from("rewards").select("id, title, description, shop, category, icon, cost").order("cost");
  if (error) throw error;
  return data as Reward[];
}

export async function listRedemptions(db: SupabaseClient, userId: string) {
  const { data, error } = await db
    .from("redemptions")
    .select("id, cost, code, created_at, reward:rewards(title, shop, icon)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as unknown as Redemption[];
}

// Points earned from completed favours minus points spent. public.redeem checks the same sum before issuing a voucher.
export async function getBalance(db: SupabaseClient, userId: string) {
  const [earned, spent] = await Promise.all([getPoints(db, userId), listRedemptions(db, userId)]);
  return earned - spent.reduce((n, r) => n + r.cost, 0);
}

export async function redeem(db: SupabaseClient, rewardId: string) {
  const { data, error } = await db.rpc("redeem", { reward: rewardId });
  if (error) throw new Error(error.message);
  return (data as { code: string }).code;
}
