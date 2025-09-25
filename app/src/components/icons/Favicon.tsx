import * as React from "react";

export const Favicon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    {...props}
    viewBox="0 0 256 256"
    width="100%"
    height="100%"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <circle cx="32" cy="32" r="32" fill="#00BCFF" />
    <circle cx="128" cy="224" r="32" fill="#C27AFF" />
    <rect x="80" width="176" height="64" rx="32" fill="#9AE600" />
    <rect x="96" y="80" width="64" height="96" rx="32" fill="#FDC700" />
  </svg>
);
