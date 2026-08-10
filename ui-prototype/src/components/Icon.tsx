type IconProps = {
  name: string;
  className?: string;
  size?: number;
  filled?: boolean;
  label?: string;
};

/** App IconName.MetamaskFoxOutline / MetamaskFoxFilled — used for Rewards tab */
const METAMASK_FOX = {
  outline:
    'm21.9956 8.43993-1.3524 3.61547 1.3568 4.5347-.1069.287-1.6403 4.3851-4.0482-1.0159-3.0589 1.7537h-2.2896l-3.05979-1.7537-4.04735 1.0159-1.74278-4.6597 1.35059-4.967-1.23222-2.88292-.12455-.29051 1.7578-6.46207 6.6902 4.12825h3.1058l6.6902-4.12825zm-7.9295-.49777h-4.1304l-5.06846-3.12829-.95663 3.51535 1.35765 3.17438-1.36295 5.0095.97076 2.5969 3.18788-.7989 3.27265 1.875h1.3285l3.2727-1.875 3.187.7989.9664-2.5845-1.3559-4.5339.1069-.287 1.2534-3.35413-.962-3.5366z',
  filled:
    'M20.6432 12.0554L21.9956 8.43993L20.244 2L13.5538 6.12825H10.448L3.7578 2L2 8.46207L2.12455 8.75258L3.35677 11.6355L2.00618 16.6025L3.74896 21.2622L7.79631 20.2463L10.8561 22H13.1457L16.2046 20.2463L20.2528 21.2622L21.8931 16.8771L22 16.5901L20.6432 12.0554Z',
} as const;

/** From app/component-library/components/Icons/Icon/assets/arrow-left.svg */
const ARROW_LEFT =
  'm15.1123 21.8855-10-10 10-10 1.775 1.775-8.225 8.225 8.225 8.225z';

const SVG_ICONS: Record<string, string> = {
  arrow_left: ARROW_LEFT,
};

function SvgIcon({
  path,
  className,
  size,
  label,
}: {
  path: string;
  className?: string;
  size: number;
  label?: string;
}) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? 'img' : undefined}
      style={{ display: 'block', flexShrink: 0 }}
    >
      <path d={path} fill="currentColor" />
    </svg>
  );
}

export function Icon({
  name,
  className,
  size = 24,
  filled = false,
  label,
}: IconProps) {
  if (name === 'metamask_fox') {
    return (
      <SvgIcon
        path={filled ? METAMASK_FOX.filled : METAMASK_FOX.outline}
        className={className}
        size={size}
        label={label}
      />
    );
  }

  const svgPath = SVG_ICONS[name];
  if (svgPath) {
    return (
      <SvgIcon path={svgPath} className={className} size={size} label={label} />
    );
  }

  return (
    <span
      className={`material-symbols-outlined${className ? ` ${className}` : ''}`}
      style={{
        fontSize: size,
        width: size,
        height: size,
        fontVariationSettings: `'FILL' ${filled ? 1 : 0}, 'wght' 400, 'GRAD' 0, 'opsz' 24`,
      }}
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? 'img' : undefined}
    >
      {name}
    </span>
  );
}
