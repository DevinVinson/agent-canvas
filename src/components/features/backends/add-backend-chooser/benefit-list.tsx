import { Check } from "lucide-react";

export function BenefitList({ items }: { items: string[] }) {
  return (
    <ul className="flex flex-col gap-3 text-sm text-content-2">
      {items.map((item) => (
        <li key={item} className="flex items-start gap-2">
          <Check
            className="mt-0.5 size-4 shrink-0 text-green-400"
            aria-hidden
          />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}
