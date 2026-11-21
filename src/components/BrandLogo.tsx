import { useState } from 'react';
import starCarLogo from '../assets/images/star_car_3d_logo.webp';

export type BrandLogoSize = 'hero' | 'heroCompact' | 'loading' | 'header' | 'modal' | 'about';

interface BrandLogoProps {
  size?: BrandLogoSize;
  glow?: boolean;
  animateIn?: boolean;
  priority?: boolean;
  className?: string;
}

const SIZE_CLASSES: Record<BrandLogoSize, string> = {
  hero: 'w-[180px] sm:w-[235px] md:w-[275px] lg:w-[310px]',
  heroCompact: 'w-[140px] sm:w-[175px]',
  loading: 'w-[250px] sm:w-[340px] md:w-[400px]',
  header: 'w-[104px] sm:w-[132px]',
  modal: 'w-[132px] sm:w-[156px]',
  about: 'w-[176px] sm:w-[220px]',
};

export function BrandLogo({
  size = 'header',
  glow = false,
  animateIn = false,
  priority = false,
  className = '',
}: BrandLogoProps) {
  const [imgError, setImgError] = useState(false);

  if (imgError) {
    return (
      <div
        className={`inline-flex flex-col items-center justify-center select-none ${
          animateIn ? 'sc-logo-fade-in' : ''
        } ${className}`}
      >
        <span className="font-display font-extrabold italic tracking-wider text-white text-xl sm:text-2xl leading-none">
          STAR CAR <span className="text-amber-400">3D</span>
        </span>
      </div>
    );
  }

  return (
    <div
      className={`relative inline-flex items-center justify-center select-none pointer-events-none ${
        SIZE_CLASSES[size]
      } ${animateIn ? 'sc-logo-fade-in' : ''} ${className}`}
    >
      {glow && (
        <div
          aria-hidden="true"
          className="sc-logo-halo absolute -inset-x-5 -inset-y-2 rounded-full pointer-events-none"
        />
      )}
      <img
        src={starCarLogo}
        alt="STAR CAR 3D"
        width={1280}
        height={720}
        decoding="async"
        loading={priority ? 'eager' : undefined}
        referrerPolicy="no-referrer"
        onError={() => setImgError(true)}
        draggable={false}
        className={`relative z-10 w-full h-auto aspect-[16/9] object-contain ${
          glow
            ? 'sc-logo-glow'
            : 'drop-shadow-[0_4px_14px_rgba(2,6,23,0.75)]'
        }`}
      />
    </div>
  );
}
