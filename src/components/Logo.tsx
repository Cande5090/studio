
// import { Shirt } from 'lucide-react'; // Icon removed

export function Logo({ size = "md", className }: { size?: "sm" | "md" | "lg", className?: string }) {
  const sizeClasses = {
    sm: "text-xl",
    md: "text-3xl",
    lg: "text-5xl",
  };
  return (
    <div className={`flex items-center gap-1 ${className}`}> {/* Reduced gap as icon is removed */}
      {/* <Shirt className={`text-primary ${size === "sm" ? "h-6 w-6" : size === "md" ? "h-8 w-8" : "h-10 w-10"}`} Icon removed */}
      <h1 
        className={`font-bold text-foreground tracking-widest ${sizeClasses[size]}`}
        style={{ fontFamily: "'Fashion Wacks', Georgia, serif" }}
      >
        Outfitly
      </h1>
    </div>
  );
}
