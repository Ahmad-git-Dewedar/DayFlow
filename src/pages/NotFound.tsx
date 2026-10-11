import { ButtonLink } from "../components/Button";
import { Logo } from "../components/Logo";
import { usePageTitle } from "../lib/usePageTitle";
import { useI18n } from "../i18n/context";

export function NotFound() {
  const { m } = useI18n();
  usePageTitle(m.notFound.title);
  return (
    <section className="flex min-h-[60vh] flex-col items-center justify-center gap-5 py-16 text-center">
      <Logo showWordmark={false} size={52} />
      <h1 className="text-2xl font-semibold">{m.notFound.heading}</h1>
      <p className="max-w-md text-ink-soft">{m.notFound.body}</p>
      <ButtonLink to="/">{m.notFound.back}</ButtonLink>
    </section>
  );
}
