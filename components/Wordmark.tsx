import Link from "next/link";

export default function Wordmark({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="inline-flex items-baseline gap-2">
      <span
        aria-hidden
        className="relative top-[-1px] inline-block h-[9px] w-[9px] bg-accent"
      />
      <span className="font-display text-[17px] font-semibold tracking-[-0.01em] text-ink">
        PreOrderKu
      </span>
    </Link>
  );
}
