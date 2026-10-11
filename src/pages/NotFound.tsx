import { ButtonLink } from "../components/Button";
import { Logo } from "../components/Logo";
import { usePageTitle } from "../lib/usePageTitle";

export function NotFound() {
  usePageTitle("Page not found");
  return (
    <section className="flex min-h-[60vh] flex-col items-center justify-center gap-5 py-16 text-center">
      <Logo showWordmark={false} size={52} />
      <h1 className="text-2xl font-semibold">This page slipped off the schedule</h1>
      <p className="max-w-md text-ink-soft">It doesn't exist or was moved. Let's get you back to your day.</p>
      <ButtonLink to="/">Back to Today</ButtonLink>
    </section>
  );
}
