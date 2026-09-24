import clsx from "clsx";
import Image from "next/image";
import { LEGEND_META, type LegendKey } from "@/lib/legendScanner";

// Real photo for every legend now. Buffett/Graham: verified individually via
// Wikimedia Commons before adding — Commons only hosts freely-licensed media
// (unlike English Wikipedia, which also hosts non-free "fair use" files
// under /wikipedia/en/... paths that look similar but are NOT reusable
// off-wiki): Buffett's is a US federal government work (public domain —
// taken at a 2015 SelectUSA Investment Summit by the International Trade
// Administration), Graham's is public domain in the US (published
// 1931-1963, copyright not renewed). Minervini, O'Neil, Lynch, and
// Qullamaggie were all supplied directly by the site owner (2026-09-16) —
// not independently license-verified by Claude the way Buffett/Graham were.
// Files stored locally in public/images/legends/ rather than hotlinked, so
// the page doesn't depend on an external host's uptime.
const PHOTOS: Partial<Record<LegendKey, { src: string; alt: string }>> = {
  CANSLIM: { src: "/images/legends/oneil.jpg", alt: "William O'Neil" },
  LYNCH: { src: "/images/legends/lynch.jpg", alt: "Peter Lynch" },
  BUFFETT: { src: "/images/legends/buffett.jpg", alt: "Warren Buffett" },
  MINERVINI: { src: "/images/legends/minervini.jpg", alt: "Mark Minervini" },
  QULLAMAGGIE: { src: "/images/legends/qullamaggie.jpg", alt: "Qullamaggie" },
  GRAHAM: { src: "/images/legends/graham.jpg", alt: "Benjamin Graham" },
};

const SIZES = {
  sm: "h-6 w-6 text-[10px]",
  md: "h-11 w-11 text-base",
  lg: "h-36 w-36 text-4xl",
} as const;

const SIZE_PX = { sm: 24, md: 44, lg: 144 } as const;

// "onPrimary" is for placing the avatar on top of a solid bg-primary-bright
// surface (e.g. an active tab button) where the default tone would have no
// contrast — swaps to a translucent paper-tinted circle instead. Only
// applies to the initials fallback; a photo doesn't need a tone.
const TONES = {
  default: "bg-primary-bright/12 text-primary-bright",
  onPrimary: "bg-paper/25 text-paper",
} as const;

export function LegendAvatar({
  legend,
  size = "md",
  tone = "default",
}: {
  legend: LegendKey;
  size?: keyof typeof SIZES;
  tone?: keyof typeof TONES;
}) {
  const photo = PHOTOS[legend];

  if (photo) {
    return (
      <div
        className={clsx("flex-none overflow-hidden rounded-full ring-1 ring-line", SIZES[size])}
        title={LEGEND_META[legend].label}
      >
        <Image
          src={photo.src}
          alt={photo.alt}
          width={SIZE_PX[size]}
          height={SIZE_PX[size]}
          className="h-full w-full object-cover"
        />
      </div>
    );
  }

  return (
    <div
      className={clsx(
        "flex flex-none items-center justify-center rounded-full font-[family-name:var(--font-ui)] font-bold",
        SIZES[size],
        TONES[tone]
      )}
      title={LEGEND_META[legend].label}
    >
      {LEGEND_META[legend].initials}
    </div>
  );
}
