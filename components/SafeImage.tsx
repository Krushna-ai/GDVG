'use client';

import React, { useState } from 'react';
import Image from 'next/image';

interface SafeImageProps {
  src: string | null | undefined;
  alt: string;
  width?: number;
  height?: number;
  fill?: boolean;
  className?: string;
  style?: React.CSSProperties;
  sizes?: string;
  priority?: boolean;
  placeholder?: string;
}

const PLACEHOLDER_IMG = 'https://via.placeholder.com/500x750?text=No+Image';

export default function SafeImage({
  src,
  alt,
  width,
  height,
  fill,
  className,
  style,
  sizes,
  priority,
  placeholder,
}: SafeImageProps) {
  const [imgSrc, setImgSrc] = useState(src || PLACEHOLDER_IMG);

  if (fill) {
    return (
      <Image
        src={imgSrc}
        alt={alt}
        fill
        className={className}
        style={style}
        sizes={sizes}
        priority={priority}
        placeholder={placeholder as any}
        onError={() => setImgSrc(PLACEHOLDER_IMG)}
      />
    );
  }

  return (
    <Image
      src={imgSrc}
      alt={alt}
      width={width || 500}
      height={height || 750}
      className={className}
      style={style}
      sizes={sizes}
      priority={priority}
      placeholder={placeholder as any}
      onError={() => setImgSrc(PLACEHOLDER_IMG)}
    />
  );
}
