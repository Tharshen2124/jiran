export type Status = "open" | "accepted" | "in_progress" | "completed" | "cancelled";

export type Favour = {
  id: string;
  title: string;
  description: string;
  location: string;
  points: number;
  requesterId: string;
  helperId: string | null;
  status: Status;
  createdAt: number;
  updatedAt: number;
};

export type User = { id: string; name: string; jalan: string };

export const USERS: User[] = [
  { id: "u1", name: "Aisyah Rahman", jalan: "Jalan Elmina 3" },
  { id: "u2", name: "Daniel Tan", jalan: "Jalan Elmina 7" },
  { id: "u3", name: "Priya Nair", jalan: "Jalan Elmina 12" },
];

export const STATUS_LABEL: Record<Status, string> = {
  open: "Open",
  accepted: "Accepted",
  in_progress: "In progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

// Where a helper can move a favour from each status.
const NEXT: Partial<Record<Status, Status[]>> = {
  accepted: ["in_progress", "cancelled"],
  in_progress: ["completed", "cancelled"],
};

export const nextStatuses = (s: Status): Status[] => NEXT[s] ?? [];

type Store = { favours: Favour[]; points: Record<string, number> };

export function seed(now = Date.now()): Store {
  const h = 3_600_000;
  const f = (
    id: string,
    title: string,
    description: string,
    location: string,
    points: number,
    requesterId: string,
    ago: number,
    helperId: string | null = null,
    status: Status = "open",
  ): Favour => ({
    id, title, description, location, points, requesterId, helperId, status,
    createdAt: now - ago * h,
    updatedAt: now - ago * h,
  });
  return {
    favours: [
      f("f1", "Pick up groceries from Elmina Lakeside Mall", "A small bag of groceries, list will be shared on accept. Need it before 6pm.", "Jalan Elmina 7", 30, "u2", 1),
      f("f2", "Walk my dog this evening", "Friendly golden retriever, about 30 minutes around the park.", "Jalan Elmina 12", 20, "u3", 2),
      f("f3", "Help carry a sofa upstairs", "Two-seater sofa to the first floor. Should take 15 minutes with two people.", "Jalan Elmina 3", 50, "u1", 3),
      f("f4", "Water plants while I'm away", "Weekend trip, plants on the porch need watering Saturday and Sunday.", "Jalan Elmina 7", 25, "u2", 5),
      f("f5", "Fix a loose cabinet hinge", "Kitchen cabinet door, screwdriver provided.", "Jalan Elmina 12", 35, "u3", 26, "u1", "in_progress"),
      f("f6", "Collect a parcel from the guardhouse", "Parcel under my name at the main guardhouse.", "Jalan Elmina 7", 15, "u2", 48, "u1", "completed"),
      f("f7", "Jump-start my car", "Battery is flat, I have the cables.", "Jalan Elmina 3", 40, "u1", 30, "u3", "accepted"),
    ],
    points: { u1: 15, u2: 0, u3: 0 },
  };
}

// ponytail: in-memory store, lost on server restart and not shared across instances. Swap for a DB when persistence matters.
const g = globalThis as unknown as { __favours?: Store };
const store = () => (g.__favours ??= seed());

export const getUser = (id: string | undefined) => USERS.find((u) => u.id === id) ?? USERS[0];
export const getPoints = (userId: string) => store().points[userId] ?? 0;

export const listOpen = (userId: string) =>
  store().favours
    .filter((f) => f.status === "open" && f.requesterId !== userId)
    .sort((a, b) => b.createdAt - a.createdAt);

export const listHelping = (userId: string) =>
  store().favours.filter((f) => f.helperId === userId).sort((a, b) => b.updatedAt - a.updatedAt);

export const listRequested = (userId: string) =>
  store().favours.filter((f) => f.requesterId === userId).sort((a, b) => b.updatedAt - a.updatedAt);

export function accept(favourId: string, userId: string, s: Store = store()) {
  const f = s.favours.find((x) => x.id === favourId);
  if (!f) throw new Error("Favour not found");
  if (f.requesterId === userId) throw new Error("You can't accept your own favour");
  // Check-and-set runs synchronously, so two concurrent accepts can't both pass.
  // ponytail: with a DB this becomes `UPDATE ... WHERE id = ? AND status = 'open'`.
  if (f.status !== "open") throw new Error("Someone else already accepted this favour");
  f.status = "accepted";
  f.helperId = userId;
  f.updatedAt = Date.now();
  return f;
}

export function setStatus(favourId: string, userId: string, to: Status, s: Store = store()) {
  const f = s.favours.find((x) => x.id === favourId);
  if (!f) throw new Error("Favour not found");
  if (f.helperId !== userId) throw new Error("Only the helper can update this favour");
  if (!nextStatuses(f.status).includes(to)) {
    throw new Error(`Can't move from ${STATUS_LABEL[f.status]} to ${STATUS_LABEL[to] ?? to}`);
  }
  f.status = to;
  f.updatedAt = Date.now();
  if (to === "completed") s.points[userId] = (s.points[userId] ?? 0) + f.points;
  return f;
}
