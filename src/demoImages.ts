// High-contrast clean illustrative data URIs representing civic issues for instant demo testing
export const DEMO_POTHOLE_IMAGE = 
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400" width="100%" height="100%">
    <defs>
      <linearGradient id="asphalt" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#334155" />
        <stop offset="100%" stop-color="#1e293b" />
      </linearGradient>
      <radialGradient id="hole" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#090d16" />
        <stop offset="60%" stop-color="#0f172a" />
        <stop offset="100%" stop-color="#334155" />
      </radialGradient>
      <linearGradient id="roadmark" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="#fbbf24" stop-opacity="0.9" />
        <stop offset="100%" stop-color="#f59e0b" stop-opacity="0.9" />
      </linearGradient>
    </defs>
    <!-- Road Surface -->
    <rect width="600" height="400" fill="url(#asphalt)" />
    
    <!-- Asphalt Texture Grain -->
    <g opacity="0.15">
      <circle cx="120" cy="80" r="2" fill="#fff" />
      <circle cx="280" cy="120" r="1.5" fill="#fff" />
      <circle cx="450" cy="90" r="2" fill="#fff" />
      <circle cx="180" cy="240" r="1" fill="#fff" />
      <circle cx="510" cy="290" r="2.5" fill="#fff" />
      <circle cx="70" cy="310" r="1.5" fill="#fff" />
    </g>

    <!-- Lane Markings -->
    <rect x="285" y="10" width="30" height="70" fill="url(#roadmark)" rx="4" />
    <rect x="285" y="130" width="30" height="70" fill="url(#roadmark)" rx="4" opacity="0.4" />
    <rect x="285" y="250" width="30" height="70" fill="url(#roadmark)" rx="4" />
    <rect x="285" y="370" width="30" height="30" fill="url(#roadmark)" rx="4" />

    <!-- Cracks radiating from pothole -->
    <path d="M190,170 Q240,195 280,210 T380,215" stroke="#090d16" stroke-width="4" fill="none" opacity="0.8" />
    <path d="M220,260 Q260,235 300,225 T390,270" stroke="#090d16" stroke-width="3" fill="none" opacity="0.7" />
    <path d="M310,160 L320,190" stroke="#090d16" stroke-width="3" fill="none" opacity="0.6" />
    <path d="M340,240 L370,275" stroke="#090d16" stroke-width="2.5" fill="none" opacity="0.7" />

    <!-- Deep Pothole Crater -->
    <ellipse cx="305" cy="215" rx="95" ry="55" fill="url(#hole)" stroke="#475569" stroke-width="3" />
    <ellipse cx="310" cy="220" rx="70" ry="38" fill="#030712" />
    
    <!-- Broken Asphalt Stones/Aggregates inside hole -->
    <polygon points="265,225 275,215 282,228 270,235" fill="#64748b" />
    <polygon points="330,210 345,205 340,220 325,218" fill="#475569" />
    <polygon points="300,235 315,230 318,245 295,242" fill="#64748b" />
    <polygon points="350,230 365,225 362,238 348,240" fill="#334155" />

    <!-- Water accumulation reflection -->
    <ellipse cx="295" cy="222" rx="40" ry="18" fill="#1e293b" opacity="0.85" />
    <path d="M280,218 Q300,215 320,222" stroke="#94a3b8" stroke-width="1.5" fill="none" opacity="0.5" />

    <!-- Civic Tag / Measurement Overlay -->
    <g transform="translate(20, 20)">
      <rect width="180" height="32" rx="6" fill="#0f172a" fill-opacity="0.8" stroke="#334155" stroke-width="1" />
      <circle cx="16" cy="16" r="5" fill="#ef4444" />
      <text x="32" y="21" fill="#f8fafc" font-family="system-ui, sans-serif" font-size="12" font-weight="600">EVIDENCE PHOTO: ROAD</text>
    </g>
  </svg>`);

export const DEMO_WASTE_IMAGE =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400" width="100%" height="100%">
    <defs>
      <linearGradient id="pavement" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#cbd5e1" />
        <stop offset="100%" stop-color="#94a3b8" />
      </linearGradient>
      <linearGradient id="wall" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#64748b" />
        <stop offset="100%" stop-color="#475569" />
      </linearGradient>
    </defs>
    <!-- Background Wall & Sidewalk -->
    <rect width="600" height="220" fill="url(#wall)" />
    <rect y="220" width="600" height="180" fill="url(#pavement)" />
    <line x1="0" y1="220" x2="600" y2="220" stroke="#334155" stroke-width="4" />

    <!-- Dumpster Bin Container -->
    <rect x="70" y="140" width="220" height="140" rx="8" fill="#166534" stroke="#14532d" stroke-width="3" />
    <rect x="60" y="130" width="240" height="16" rx="4" fill="#14532d" />
    <text x="110" y="210" fill="#86efac" font-family="monospace" font-size="14" font-weight="bold">MUNICIPAL REFUSE</text>

    <!-- Piled Garbage Bags spilling onto pavement -->
    <!-- Black bag -->
    <ellipse cx="270" cy="270" rx="55" ry="45" fill="#1e293b" />
    <circle cx="270" cy="235" r="12" fill="#0f172a" />
    <!-- White torn bag -->
    <ellipse cx="350" cy="285" rx="60" ry="50" fill="#e2e8f0" stroke="#94a3b8" stroke-width="2" />
    <!-- Green bag -->
    <ellipse cx="420" cy="300" rx="50" ry="40" fill="#15803d" />
    <!-- Blue recycling bag -->
    <ellipse cx="200" cy="290" rx="48" ry="42" fill="#1d4ed8" />
    <ellipse cx="300" cy="320" rx="55" ry="40" fill="#334155" />

    <!-- Scattered debris & cartons -->
    <rect x="360" y="325" width="45" height="35" rx="3" fill="#b45309" transform="rotate(15 360 325)" />
    <rect x="440" y="270" width="35" height="25" rx="2" fill="#d97706" transform="rotate(-20 440 270)" />
    <ellipse cx="480" cy="335" rx="18" ry="8" fill="#64748b" />
    <ellipse cx="140" cy="310" rx="25" ry="12" fill="#475569" />

    <!-- Civic Tag / Measurement Overlay -->
    <g transform="translate(20, 20)">
      <rect width="185" height="32" rx="6" fill="#0f172a" fill-opacity="0.8" stroke="#334155" stroke-width="1" />
      <circle cx="16" cy="16" r="5" fill="#f59e0b" />
      <text x="32" y="21" fill="#f8fafc" font-family="system-ui, sans-serif" font-size="12" font-weight="600">EVIDENCE: SOLID WASTE</text>
    </g>
  </svg>`);

export const DEMO_WATER_IMAGE =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400" width="100%" height="100%">
    <defs>
      <linearGradient id="wetground" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#334155" />
        <stop offset="100%" stop-color="#1e293b" />
      </linearGradient>
      <radialGradient id="waterglow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.9" />
        <stop offset="50%" stop-color="#0284c7" stop-opacity="0.6" />
        <stop offset="100%" stop-color="#0369a1" stop-opacity="0" />
      </radialGradient>
    </defs>
    <!-- Wet Asphalt Surface -->
    <rect width="600" height="400" fill="url(#wetground)" />

    <!-- Sidewalk curb edge -->
    <rect y="80" width="600" height="40" fill="#64748b" />
    <line x1="0" y1="120" x2="600" y2="120" stroke="#475569" stroke-width="3" />

    <!-- Massive water pooling -->
    <ellipse cx="320" cy="270" rx="220" ry="90" fill="#0369a1" opacity="0.45" />
    <ellipse cx="310" cy="260" rx="160" ry="60" fill="#0284c7" opacity="0.6" />
    <ellipse cx="300" cy="245" rx="90" ry="35" fill="url(#waterglow)" />

    <!-- Fractured Trench & Gushing Jet -->
    <path d="M260,240 L340,245 L320,260 L245,250 Z" fill="#0f172a" stroke="#0284c7" stroke-width="2" />
    
    <!-- Water geyser/fountain spray -->
    <path d="M280,245 C280,180 295,150 300,140 C305,150 320,180 320,245 Z" fill="#bae6fd" opacity="0.85" />
    <path d="M290,245 C285,160 300,120 302,110 C305,120 315,160 310,245 Z" fill="#ffffff" opacity="0.9" />

    <!-- Water Ripples -->
    <ellipse cx="300" cy="245" rx="35" ry="12" fill="none" stroke="#e0f2fe" stroke-width="2" opacity="0.8" />
    <ellipse cx="300" cy="245" rx="65" ry="22" fill="none" stroke="#bae6fd" stroke-width="1.5" opacity="0.6" />
    <ellipse cx="300" cy="245" rx="110" ry="38" fill="none" stroke="#7dd3fc" stroke-width="1.2" opacity="0.4" />
    <ellipse cx="300" cy="245" rx="170" ry="55" fill="none" stroke="#38bdf8" stroke-width="1" opacity="0.3" />

    <!-- Civic Tag / Measurement Overlay -->
    <g transform="translate(20, 20)">
      <rect width="210" height="32" rx="6" fill="#0f172a" fill-opacity="0.8" stroke="#334155" stroke-width="1" />
      <circle cx="16" cy="16" r="5" fill="#38bdf8" />
      <text x="32" y="21" fill="#f8fafc" font-family="system-ui, sans-serif" font-size="12" font-weight="600">EVIDENCE: WATER MAIN LEAK</text>
    </g>
  </svg>`);
