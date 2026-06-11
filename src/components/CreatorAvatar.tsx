import { User } from "lucide-react";

type Props = {
  src?: string | null;
  name?: string;
  className?: string;
  rounded?: "full" | "xl" | "2xl" | "lg";
};

const roundClass = {
  full: "rounded-full",
  xl: "rounded-xl",
  "2xl": "rounded-2xl",
  lg: "rounded-lg",
};

export function CreatorAvatar({ src, name, className = "size-10", rounded = "xl" }: Props) {
  const r = roundClass[rounded];
  if (src?.startsWith("http") || src?.startsWith("/api/") || src?.startsWith("data:")) {
    return (
      <img
        src={src}
        alt={name ?? ""}
        className={`${className} ${r} object-cover bg-secondary shrink-0`}
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = "none";
        }}
      />
    );
  }
  const initial = (name ?? "?").charAt(0).toUpperCase();
  return (
    <div className={`${className} ${r} bg-gradient-brand text-white grid place-items-center font-bold shrink-0`}>
      {src ? <img src={src} alt="" className={`${className} ${r} object-cover`} /> : initial.length === 1 ? initial : <User className="size-1/2" />}
    </div>
  );
}