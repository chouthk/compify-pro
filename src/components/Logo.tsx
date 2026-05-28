import compifyLogo from "@/assets/compify-logo.png";

interface LogoProps {
  size?: "sm" | "md";
}

const Logo = ({ size = "md" }: LogoProps) => {
  const dim = size === "sm" ? "w-7 h-7" : "w-8 h-8";
  return (
    <img
      src={compifyLogo}
      alt="Compify.Pro"
      className={`${dim} rounded-lg`}
    />
  );
};

export default Logo;
