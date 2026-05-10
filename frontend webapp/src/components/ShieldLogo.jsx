export default function ShieldLogo({ size = 32, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 44"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M20 2L4 8.5V20.5C4 29.8 11.1 38.5 20 41C28.9 38.5 36 29.8 36 20.5V8.5L20 2Z"
        fill="#4e844a"
        opacity="0.15"
      />
      <path
        d="M20 2L4 8.5V20.5C4 29.8 11.1 38.5 20 41C28.9 38.5 36 29.8 36 20.5V8.5L20 2Z"
        stroke="#4e844a"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path
        d="M13 21.5L17.5 26L27 17"
        stroke="#4e844a"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
