import React from 'react';
import {
  Briefcase,
  Calculator,
  CheckSquare,
  Code2,
  Compass,
  Database,
  FileText,
  Image,
  Layers,
  Plane,
  Type,
} from 'lucide-react';
import { ToolCategory } from '../../data/toolsCatalog';

export function CategoryIcon({
  category,
  className = 'h-4 w-4',
}: {
  category: ToolCategory;
  className?: string;
}) {
  switch (category) {
    case 'PDF Workspace':
      return <FileText className={className} />;
    case 'Pro Batch Studio':
      return <Layers className={className} />;
    case 'Image Studio':
      return <Image className={className} />;
    case 'Text Studio':
      return <Type className={className} />;
    case 'File & Data':
      return <Database className={className} />;
    case 'Calculators':
      return <Calculator className={className} />;
    case 'Developer Tools':
      return <Code2 className={className} />;
    case 'Productivity':
      return <CheckSquare className={className} />;
    case 'Travel Tools':
      return <Plane className={className} />;
    case 'Everyday Utilities':
      return <Compass className={className} />;
    case 'Business & Print':
      return <Briefcase className={className} />;
  }
}

export function BrandMark({ className = 'h-8 w-8' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <rect width="36" height="36" rx="10" fill="url(#twa_grad)" />
      <path
        d="M11 12.5H25M18 12.5V24.5"
        stroke="#FFFFFF"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M11.5 24.5L14.5 18.5L17.5 24.5M21 24.5L23.5 18.5L26 24.5"
        stroke="#C7D2FE"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <defs>
        <linearGradient id="twa_grad" x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">
          <stop stopColor="#4F46E5" />
          <stop offset="1" stopColor="#2563EB" />
        </linearGradient>
      </defs>
    </svg>
  );
}
