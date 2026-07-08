export default function RobotAvatar({ size = 56 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Head */}
      <rect x="14" y="10" width="36" height="30" rx="12" fill="#1B1B1E" stroke="#E50914" strokeWidth="2.5" />
      {/* Visor */}
      <rect x="20" y="18" width="24" height="12" rx="6" fill="#0B0B0C" />
      {/* Eyes */}
      <circle cx="27" cy="24" r="2.6" fill="#E50914" />
      <circle cx="37" cy="24" r="2.6" fill="#E50914" />
      {/* Antenna */}
      <line x1="32" y1="10" x2="32" y2="4" stroke="#E50914" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="32" cy="3" r="2.5" fill="#E50914" />
      {/* Ears */}
      <rect x="10" y="20" width="4" height="10" rx="2" fill="#E50914" />
      <rect x="50" y="20" width="4" height="10" rx="2" fill="#E50914" />
      {/* Body */}
      <rect x="18" y="42" width="28" height="18" rx="7" fill="#1B1B1E" stroke="#E50914" strokeWidth="2.5" />
      <circle cx="32" cy="51" r="3" fill="#E50914" />
    </svg>
  );
}