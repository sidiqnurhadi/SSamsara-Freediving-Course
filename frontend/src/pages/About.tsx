import PublicLayout from "@/components/PublicLayout";

const LOCATIONS = [
  { name: "Ssamsara Pool", detail: "25 m indoor pool — STA, DYN and DNF sessions twice weekly." },
  { name: "Pulau Pramuka", detail: "Sheltered 30 m site, our home for beginner and intermediate depth." },
  { name: "Nusa Penida", detail: "Deep blue water for advanced progression and coaching camps." },
];

export default function About() {
  return (
    <PublicLayout>
      <section className="mx-auto max-w-4xl px-5 pt-14 pb-20">
        <p className="text-xs tracking-[0.28em] text-primary uppercase">About the school</p>
        <h1 className="heading mt-3 text-4xl font-semibold sm:text-5xl" data-testid="about-title">
          Depth is patience, not force
        </h1>
        <p className="mt-6 text-muted-foreground">
          Ssamsara Freedive was founded in 2018 by instructors who wanted courses that move
          at the diver's pace. We teach breathing and relaxation before technique, technique before
          depth, and depth only when equalization is reliable.
        </p>
        <p className="mt-4 text-muted-foreground">
          We are affiliated with AIDA International and follow its course standards for Freediver,
          Advanced Freediver and Master Freediver certification. Every in-water session runs with a
          dedicated safety diver, a lanyard on the line and a written emergency action plan.
        </p>

        <h2 className="heading mt-14 text-2xl font-semibold">Our training approach</h2>
        <ul className="mt-5 space-y-3 text-muted-foreground">
          <li>• Small groups — a maximum of four divers per instructor on the line.</li>
          <li>• Dry training between sessions with CO2, O2 and warm-up tables you keep.</li>
          <li>• Structured logbook review: every dive, table and personal best is recorded.</li>
          <li>• No pressure to progress. Depth is added when your body is ready for it.</li>
        </ul>

        <h2 className="heading mt-14 text-2xl font-semibold">Training locations</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          {LOCATIONS.map((location) => (
            <div key={location.name} className="glass rounded-2xl px-5 py-5">
              <h3 className="heading text-base font-semibold">{location.name}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{location.detail}</p>
            </div>
          ))}
        </div>
      </section>
    </PublicLayout>
  );
}
