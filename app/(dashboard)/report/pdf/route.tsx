import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { Document, Font, Page, renderToBuffer, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { NextRequest } from "next/server";
import { monthlyReport, ROUNDS, toMonth, type ReportDay, type ReportRow, type RoundStatus, type RoundTotals } from "@/lib/patrols";
import { getProfile } from "@/utils/supabase/server";

// Brand tokens from app/globals.css, in hex for the PDF.
const INK = "#211815";
const MUTED = "#6b615d";
const LINE = "#e3dcda";
const SHADE = "#f7f3ef";
const BRAND = "#d71920";
const STATUS_COLOR: Record<RoundStatus, string> = { done: "#21763c", partly: "#905d00", missed: "#ac1a1c", now: INK, later: MUTED };

// The brand face. Literal paths so Next.js traces the files into the deployment.
const [medium, semibold, bold] = await Promise.all([
  readFile(join(process.cwd(), "app/fonts/Metropolis-Medium.otf")),
  readFile(join(process.cwd(), "app/fonts/Metropolis-SemiBold.otf")),
  readFile(join(process.cwd(), "app/fonts/Metropolis-Bold.otf")),
]);
const uri = (font: Buffer) => `data:font/otf;base64,${font.toString("base64")}`;
Font.register({
  family: "Metropolis",
  fonts: [
    { src: uri(medium), fontWeight: 500 },
    { src: uri(semibold), fontWeight: 600 },
    { src: uri(bold), fontWeight: 700 },
  ],
});
Font.registerHyphenationCallback((word) => [word]);

const monthName = new Intl.DateTimeFormat("en-MY", { month: "long", year: "numeric", timeZone: "UTC" });
const dayName = new Intl.DateTimeFormat("en-MY", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
const stamp = new Intl.DateTimeFormat("en-MY", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kuala_Lumpur" });
const lastAt = new Intl.DateTimeFormat("en-MY", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kuala_Lumpur" });

const s = StyleSheet.create({
  // react-pdf inherits lineHeight in points, so anything larger than body text sets its own.
  page: { fontFamily: "Metropolis", fontWeight: 500, fontSize: 9, lineHeight: 1.3, color: INK, paddingTop: 36, paddingBottom: 60, paddingHorizontal: 44 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", paddingBottom: 8, marginBottom: 22, borderBottomWidth: 1.5, borderColor: BRAND, fontSize: 8, color: MUTED },
  brand: { fontSize: 11, fontWeight: 700, color: INK },
  title: { fontSize: 24, lineHeight: 1.15, fontWeight: 700, letterSpacing: -0.5 },
  subtitle: { fontSize: 13, lineHeight: 1.3, color: MUTED },
  meta: { flexDirection: "row", marginTop: 16, marginBottom: 4 },
  metaItem: { width: "25%", paddingRight: 10 },
  label: { fontSize: 7, fontWeight: 600, color: MUTED, textTransform: "uppercase", letterSpacing: 0.7, marginBottom: 2 },
  section: { marginTop: 18 },
  h2: { fontSize: 12, lineHeight: 1.3, fontWeight: 700, marginBottom: 6 },
  note: { color: MUTED, marginTop: 6 },
  table: { borderTopWidth: 1, borderColor: INK },
  tr: { flexDirection: "row", borderBottomWidth: 0.5, borderColor: LINE, paddingVertical: 3.5 },
  th: { fontSize: 7, fontWeight: 600, color: MUTED, textTransform: "uppercase", letterSpacing: 0.7 },
  // react-pdf (4.9) drops fixed elements placed with bottom, so the footer is placed from the top of the A4 page (841.89pt).
  footer: { position: "absolute", top: 841.89 - 40, left: 44, right: 44, flexDirection: "row", justifyContent: "space-between", fontSize: 7.5, color: MUTED },
});

// One table cell; widths are percentages of the row. indent sets a left column apart from right-aligned numbers.
function Cell(props: { w: string; right?: boolean; indent?: boolean; strong?: boolean; color?: string; children: React.ReactNode }) {
  const { w, right, indent, strong, color, children } = props;
  const style = { width: w, paddingLeft: indent ? 14 : 4, paddingRight: 4, textAlign: right ? "right" : "left", fontWeight: strong ? 600 : 500, color } as const;
  return <Text style={style}>{children}</Text>;
}

const SUMMARY = ["20%", "20%", "14%", "16%", "14%", "16%"];
function Summary({ totals, fullDays }: { totals: RoundTotals[]; fullDays: number }) {
  const all = totals.reduce((t, r) => ({ done: t.done + r.done, partly: t.partly + r.partly, missed: t.missed + r.missed }));
  const rate = (done: number, of: number) => (of ? `${Math.round((done / of) * 100)}%` : "–");
  const rows: [string, string, RoundTotals, number][] = [
    ...ROUNDS.map(([name, hours], k): [string, string, RoundTotals, number] => [name, hours, totals[k], fullDays]),
    ["All rounds", "", all, fullDays * ROUNDS.length],
  ];
  return (
    <View style={s.table}>
      <View style={s.tr}>
        {["Round", "Window", "Done", "Partly done", "Missed", "Done rate"].map((h, i) => (
          <Cell key={h} w={SUMMARY[i]} right={i > 1}>
            <Text style={s.th}>{h}</Text>
          </Cell>
        ))}
      </View>
      {rows.map(([name, hours, t, of], i) => (
        <View key={name} style={i === ROUNDS.length ? [s.tr, { borderTopWidth: 1, borderColor: INK, borderBottomWidth: 0 }] : s.tr}>
          <Cell w={SUMMARY[0]} strong>{name}</Cell>
          <Cell w={SUMMARY[1]} color={MUTED}>{hours}</Cell>
          <Cell w={SUMMARY[2]} right strong={i === ROUNDS.length}>{t.done}</Cell>
          <Cell w={SUMMARY[3]} right color={t.partly ? STATUS_COLOR.partly : undefined}>{t.partly}</Cell>
          <Cell w={SUMMARY[4]} right strong={!!t.missed} color={t.missed ? STATUS_COLOR.missed : undefined}>{t.missed}</Cell>
          <Cell w={SUMMARY[5]} right strong>{rate(t.done, of)}</Cell>
        </View>
      ))}
    </View>
  );
}

const CHECKPOINTS = ["21%", "10%", "12%", "13%", "12%", "10%", "22%"];
function Checkpoints({ rows, fullDays }: { rows: ReportRow[]; fullDays: number }) {
  return (
    <View style={s.table}>
      <View style={[s.tr, { paddingBottom: 2, borderBottomWidth: 0 }]}>
        <Cell w="33%"> </Cell>
        <Cell w="37%">
          <Text style={s.th}>Rounds missed, of {fullDays} each</Text>
        </Cell>
      </View>
      <View style={s.tr}>
        {["Jalan", "Section", ...ROUNDS.map(([name]) => name), "Passes", "Last patrolled"].map((h, i) => (
          <Cell key={h} w={CHECKPOINTS[i]} right={i > 1 && i < 6} indent={i === 6}>
            <Text style={s.th}>{h}</Text>
          </Cell>
        ))}
      </View>
      {rows.map((r, i) => (
        <View key={r.id} style={i % 2 ? [s.tr, { backgroundColor: SHADE }] : s.tr}>
          <Cell w={CHECKPOINTS[0]} strong>{r.jalan}</Cell>
          <Cell w={CHECKPOINTS[1]}>{r.section}</Cell>
          {r.missed.map((n, k) => (
            <Cell key={k} w={CHECKPOINTS[2 + k]} right strong={!!n} color={n ? STATUS_COLOR.missed : MUTED}>{n}</Cell>
          ))}
          <Cell w={CHECKPOINTS[5]} right>{r.patrols}</Cell>
          <Cell w={CHECKPOINTS[6]} indent color={r.lastAt ? undefined : STATUS_COLOR.missed}>
            {r.lastAt ? lastAt.format(new Date(r.lastAt)) : "Never"}
          </Cell>
        </View>
      ))}
    </View>
  );
}

const ROUND_TEXT: Record<RoundStatus, (passed: number, of: number) => string> = {
  done: () => "Done",
  partly: (p, of) => `Partly done, ${p} of ${of}`,
  missed: () => "Missed",
  now: (p, of) => `Under way, ${p} of ${of}`,
  later: () => "Not yet",
};

const LOG = ["22%", "26%", "26%", "26%"];
function DailyLog({ days, of }: { days: ReportDay[]; of: number }) {
  return (
    <View style={s.table}>
      <View style={s.tr}>
        {["Day", ...ROUNDS.map(([name, hours]) => `${name}, ${hours}`)].map((h, i) => (
          <Cell key={h} w={LOG[i]}>
            <Text style={s.th}>{h}</Text>
          </Cell>
        ))}
      </View>
      {days.map((d, i) => (
        <View key={d.date} style={i % 2 ? [s.tr, { backgroundColor: SHADE }] : s.tr}>
          <Cell w={LOG[0]} strong>{dayName.format(new Date(d.date))}</Cell>
          {d.rounds.map((r, k) => (
            <Cell key={k} w={LOG[1 + k]} strong={r.status === "missed"} color={STATUS_COLOR[r.status]}>
              {ROUND_TEXT[r.status](r.passed, of)}
            </Cell>
          ))}
        </View>
      ))}
    </View>
  );
}

type Props = Awaited<ReturnType<typeof monthlyReport>> & { month: string; generatedBy: string | null };

function Report({ month, rows, days, fullDays, totals, generatedBy }: Props) {
  const title = monthName.format(new Date(`${month}-01T00:00:00Z`));
  const generated = `${stamp.format(new Date())}${generatedBy ? ` by ${generatedBy}` : ""}`;
  const jalans = new Set(rows.map((r) => r.jalan)).size;
  const status =
    fullDays === days.length ? "Complete" : fullDays ? `In progress, ${fullDays} of ${days.length} days done` : "Not started";
  return (
    <Document title={`Patrol report, ${title}`} author="Jiran" subject="Monthly patrol report for the resident administration">
      <Page size="A4" style={s.page}>
        <View style={s.header} fixed>
          <Text>
            <Text style={s.brand}>Jiran</Text>
            {"   "}City of Elmina · Sime Darby Property
          </Text>
          <Text>Monthly patrol report</Text>
        </View>
        <View style={s.footer} fixed>
          <Text>
            Patrol report, {title} · Generated {generated}
          </Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>

        <Text style={s.title}>Patrol report</Text>
        <Text style={s.subtitle}>{title}</Text>
        <View style={s.meta}>
          {[
            ["Period", `1–${days.length} ${title}`],
            ["Status", status],
            ["Checkpoints", `${rows.length} on ${jalans} jalans`],
            ["Generated", generated],
          ].map(([label, value]) => (
            <View key={label} style={s.metaItem}>
              <Text style={s.label}>{label}</Text>
              <Text>{value}</Text>
            </View>
          ))}
        </View>

        <View style={s.section} wrap={false}>
          <Text style={s.h2}>Summary</Text>
          <Summary totals={totals} fullDays={fullDays} />
          <Text style={s.note}>
            Guards patrol every checkpoint three times a day. A round is done when a guard passed every checkpoint during its
            window, partly done when they passed some, and missed when they passed none. Patrol days run from 4 am to 4 am,
            Malaysian time. Counts cover {fullDays === days.length ? "every day of the month" : `the ${fullDays} full days so far`},
            so {fullDays} rounds of each kind.
          </Text>
        </View>

        <View style={s.section} wrap={false}>
          <Text style={s.h2}>Rounds missed by checkpoint</Text>
          <Checkpoints rows={rows} fullDays={fullDays} />
        </View>

        <View style={s.section} break wrap={false}>
          <Text style={s.h2}>Daily log</Text>
          <DailyLog days={days} of={rows.length} />
          <Text style={s.note}>Counts are checkpoints passed during the round, of {rows.length}.</Text>
        </View>

      </Page>
    </Document>
  );
}

export async function GET(request: NextRequest) {
  const { supabase, role, fullName } = await getProfile();
  if (role !== "ra") return new Response("Only the resident administration can export patrol reports.", { status: 403 });
  const month = toMonth(request.nextUrl.searchParams.get("month"));
  const report = await monthlyReport(supabase, month);
  const pdf = await renderToBuffer(<Report month={month} generatedBy={fullName} {...report} />);
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="patrol-report-${month}.pdf"`,
    },
  });
}
