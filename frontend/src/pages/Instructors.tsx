import PublicLayout from "@/components/PublicLayout";

const INSTRUCTORS = [
  {
    name: "John Doe",
    role: "Head Instructor · AIDA Instructor Trainer",
    since: "Freediving since 2011",
    bio: "Personal best 82 m CWT. Specialises in mouthfill equalization and calm, unhurried depth progression.",
    photo:
      "https://images.unsplash.com/photo-1628630500614-1c8924c99c3e?crop=entropy&cs=srgb&fm=jpg&q=85&w=800",
  },
  {
    name: "Nadia Reef",
    role: "Instructor · Pool & Dynamic Coach",
    since: "Freediving since 2015",
    bio: "National DYNB record holder. Builds efficient stroke mechanics and CO2 tolerance in the pool.",
    photo:
      "https://images.unsplash.com/photo-1627540458907-47a427507e20?crop=entropy&cs=srgb&fm=jpg&q=85&w=800",
  },
  {
    name: "Bayu Arus",
    role: "Instructor · Safety & Rescue",
    since: "Freediving since 2013",
    bio: "Runs our safety curriculum and every open-water rescue scenario. Former ocean lifeguard.",
    photo:
      "https://images.pexels.com/photos/32949983/pexels-photo-32949983.jpeg?auto=compress&cs=tinysrgb&w=800",
  },
];

export default function Instructors() {
  return (
    <PublicLayout>
      <section className="mx-auto max-w-6xl px-5 pt-14 pb-20">
        <p className="text-xs tracking-[0.28em] text-primary uppercase">Instructors</p>
        <h1
          className="heading mt-3 text-4xl font-semibold sm:text-5xl"
          data-testid="instructors-title"
        >
          The people on your line
        </h1>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {INSTRUCTORS.map((person) => (
            <article
              key={person.name}
              className="overflow-hidden rounded-2xl border border-white/8 bg-card"
              data-testid={`instructor-card-${person.name.split(" ")[0].toLowerCase()}`}
            >
              <div
                className="h-56 bg-cover bg-center"
                style={{ backgroundImage: `url(${person.photo})` }}
              />
              <div className="p-5">
                <h2 className="heading text-lg font-semibold">{person.name}</h2>
                <p className="mt-1 text-xs tracking-wide text-primary uppercase">{person.role}</p>
                <p className="mt-3 text-sm text-muted-foreground">{person.bio}</p>
                <p className="mt-3 text-xs text-muted-foreground">{person.since}</p>
              </div>
            </article>
          ))}
        </div>
      </section>
    </PublicLayout>
  );
}
