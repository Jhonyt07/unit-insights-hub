import logo from "@/assets/copagril-logo.png";

interface LogoProps {
  size?: number;
  showText?: boolean;
  className?: string;
}

export const Logo = ({ size = 40, showText = true, className }: LogoProps) => (
  <div className={`flex items-center gap-2 ${className ?? ""}`}>
    <img
      src={logo}
      alt="Copagril"
      width={size}
      height={size}
      className="object-contain"
      style={{ width: size, height: size }}
    />
    {showText && (
      <div className="leading-tight">
        <div className="font-bold text-base text-primary tracking-tight">Copagril</div>
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Plataforma de Projeção
        </div>
      </div>
    )}
  </div>
);