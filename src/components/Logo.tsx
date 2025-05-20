
import { Shirt } from 'lucide-react'; // Using Shirt as a placeholder icon

export function Logo({ size = "md", className }: { size?: "sm" | "md" | "lg", className?: string }) {
  const sizeClasses = {
    sm: "text-xl",
    md: "text-3xl",
    lg: "text-5xl",
  };
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Shirt className={`text-primary ${size === "sm" ? "h-6 w-6" : size === "md" ? "h-8 w-8" : "h-10 w-10"}`} />
      <h1 className={`font-bold text-foreground ${sizeClasses[size]}`}>
        Outfitly
      </h1>
    </div>
  );
}
