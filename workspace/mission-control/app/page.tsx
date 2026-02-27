import { getMissionControlTelemetry } from "@/lib/mission-control-data";

const statusBadge: Record<string, string> = {
  scoping: "bg-slate-800 text-slate-200",
  building: "bg-amber-500/20 text-amber-300",
  shipping: "bg-emerald-500/20 text-emerald-200",
  blocked: "bg-rose-500/20 text-rose-200"
};

const integrationStyles: Record<string, string> = {
  ok: "text-emerald-300",
  warn: "text-amber-300",
  error: "text-rose-300"
};

const ideaBadge: Record<string, string> = {
  moonshot: "bg-purple-500/20 text-purple-200",
  "quick win": "bg-emerald-500/15 text-emerald-200",
  experiment: "bg-sky-500/15 text-sky-200"
};

export default async function Home() {
  const { initiatives, automationQueue, integrations, signals, ideas } =
    await getMissionControlTelemetry();

  const stats = {
    activeBuilds: initiatives.filter((i) => i.status !== "shipping").length,
    automations: automationQueue.length,
    signals: signals.length,
    blockers: initiatives.filter((i) => i.status === "blocked").length
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-10 lg:px-10">
        <header className="rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900/70 to-slate-950 p-8 shadow-xl shadow-black/40">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-slate-400">
                Mission Control
              </p>
              <h1 className="mt-2 text-4xl font-semibold text-white">
                Internal Tool Forge
              </h1>
              <p className="mt-3 text-base text-slate-300">
                Central deck for anything we need to build, monitor, or
                automate. If it makes us faster, it lives here.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-800 px-4 py-3 text-sm text-slate-300">
              {new Date().toLocaleString("en-US", {
                weekday: "long",
                hour: "2-digit",
                minute: "2-digit",
                timeZoneName: "short"
              })}
            </div>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Active builds" value={stats.activeBuilds} footnote="Scoping or in-flight" />
            <Stat label="Automations" value={stats.automations} footnote="Cron + agents" />
            <Stat label="Signals watched" value={stats.signals} footnote="Markets + context" />
            <Stat label="Blockers" value={stats.blockers} footnote="Needs attention" highlight={stats.blockers > 0} />
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <SectionHeader title="Active initiatives" subtitle="What we are building right now" />
            <div className="space-y-4">
              {initiatives.map((initiative) => (
                <article key={initiative.id} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-400">
                        Owner · {initiative.owner}
                      </p>
                      <h3 className="text-xl font-semibold text-white">
                        {initiative.title}
                      </h3>
                    </div>
                    <span
                      className={`rounded-full px-4 py-1 text-xs font-semibold ${statusBadge[initiative.status]}`}
                    >
                      {initiative.status}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-400">ETA {initiative.eta}</p>
                  <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-200">
                    {initiative.highlights.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </div>
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
              <SectionHeader
                title="Automation queue"
                subtitle="What the agents will run"
                compact
              />
              <div className="mt-4 space-y-4">
                {automationQueue.map((job) => (
                  <div
                    key={job.id}
                    className="rounded-xl border border-slate-800 bg-slate-900/80 p-3 text-sm"
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-white">{job.title}</p>
                      <span
                        className={`text-xs ${
                          job.status === "healthy"
                            ? "text-emerald-300"
                            : job.status === "error"
                              ? "text-rose-300"
                              : "text-amber-300"
                        }`}
                      >
                        {job.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">
                      {job.cadence} • Next: {job.nextRun}
                    </p>
                    {job.notes && <p className="mt-1 text-slate-300">{job.notes}</p>}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
              <SectionHeader
                title="Integrations"
                subtitle="Pipes and credentials"
                compact
              />
              <div className="mt-4 space-y-3">
                {integrations.map((integration) => (
                  <div
                    key={integration.id}
                    className="flex flex-col rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm"
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-white">{integration.name}</p>
                      <span
                        className={`${integrationStyles[integration.status]} text-xs uppercase tracking-wide`}
                      >
                        {integration.status}
                      </span>
                    </div>
                    <p className="text-slate-400">{integration.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-3xl border border-slate-800 bg-gradient-to-b from-slate-900/70 to-slate-950 p-6 lg:col-span-2">
            <SectionHeader
              title="Signal board"
              subtitle="Feeds we watch before we move"
            />
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {signals.map((signal) => (
                <div
                  key={signal.id}
                  className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4"
                >
                  <p className="text-xs uppercase tracking-wide text-slate-400">
                    {signal.label}
                  </p>
                  <div className="mt-2 flex items-baseline gap-2">
                    <p className="text-3xl font-semibold text-white">{signal.value}</p>
                    <span
                      className={`text-sm ${
                        signal.trend === "up"
                          ? "text-emerald-300"
                          : signal.trend === "down"
                            ? "text-rose-300"
                            : "text-slate-400"
                      }`}
                    >
                      {signal.trend}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-300">{signal.detail}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-3xl border border-slate-800 bg-gradient-to-b from-emerald-900/30 to-slate-950 p-6">
            <SectionHeader title="Idea backlog" subtitle="Next experiments to greenlight" />
            <div className="mt-4 space-y-4">
              {ideas.map((idea) => (
                <div
                  key={idea.id}
                  className="rounded-2xl border border-emerald-500/30 bg-slate-900/70 p-4"
                >
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-white">{idea.title}</p>
                    <span className={`rounded-full px-3 py-1 text-xs ${ideaBadge[idea.impact]}`}>
                      {idea.impact}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-200">{idea.pitch}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

const Stat = ({
  label,
  value,
  footnote,
  highlight
}: {
  label: string;
  value: number;
  footnote?: string;
  highlight?: boolean;
}) => (
  <div
    className={`rounded-2xl border px-4 py-5 ${
      highlight
        ? "border-rose-500/40 bg-gradient-to-b from-rose-900/30 to-slate-950"
        : "border-slate-800 bg-gradient-to-b from-slate-900/40 to-slate-950"
    }`}
  >
    <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{label}</p>
    <p className="mt-2 text-4xl font-semibold text-white">{value}</p>
    {footnote && <p className="mt-1 text-xs text-slate-400">{footnote}</p>}
  </div>
);

const SectionHeader = ({
  title,
  subtitle,
  compact
}: {
  title: string;
  subtitle: string;
  compact?: boolean;
}) => (
  <div className={compact ? "space-y-1" : "mb-2 space-y-1"}>
    <h2 className="text-2xl font-semibold text-white">{title}</h2>
    <p className="text-sm text-slate-400">{subtitle}</p>
  </div>
);
