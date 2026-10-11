import { useEffect } from "react";
import { useI18n } from "../i18n/context";

export function usePageTitle(title: string) {
  const { m, f } = useI18n();
  useEffect(() => {
    document.title = f(m.meta.pageTitle, { page: title });
  }, [title, m, f]);
}
