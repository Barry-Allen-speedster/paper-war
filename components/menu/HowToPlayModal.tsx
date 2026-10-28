"use client";
import { Modal } from "@components/ui/Modal";
import { Button } from "@components/ui/Button";
import { t } from "@lib/i18n";

interface Props {
  open: boolean;
  onClose: () => void;
}

const steps = [
  { titleKey: "howto.step1.title", bodyKey: "howto.step1.body", emoji: "🎖" },
  { titleKey: "howto.step2.title", bodyKey: "howto.step2.body", emoji: "🎯" },
  { titleKey: "howto.step3.title", bodyKey: "howto.step3.body", emoji: "📄" },
  { titleKey: "howto.step4.title", bodyKey: "howto.step4.body", emoji: "👑" },
] as const;

export function HowToPlayModal({ open, onClose }: Props) {
  return (
    <Modal open={open} onClose={onClose} title={t("howto.title")}>
      <ol className="flex flex-col gap-4 mb-6">
        {steps.map((step, i) => (
          <li key={i} className="flex gap-3">
            <span className="text-2xl flex-shrink-0">{step.emoji}</span>
            <div>
              <p className="font-semibold">{t(step.titleKey)}</p>
              <p className="text-sm text-[var(--pw-text-muted)]">{t(step.bodyKey)}</p>
            </div>
          </li>
        ))}
      </ol>
      <Button onClick={onClose} className="w-full">{t("howto.close")}</Button>
    </Modal>
  );
}
