import { useId, type CSSProperties } from "react";

/** One wedge per bundle item. A detached wedge represents a claimed portion. */
export function Pizza({
  count = 6,
  taken = 0,
  animate = false,
}: {
  count?: number;
  taken?: number;
  animate?: boolean;
}) {
  const pizzaId = useId();
  const slices = Math.max(2, Math.min(20, count));
  return (
    <svg
      className={`sharing-pizza ${animate ? "pizza-assemble" : ""}`}
      viewBox="0 0 200 200"
      role="img"
      aria-label={`${slices} portions${taken ? `, ${taken} claimed` : " coming together"}`}
    >
      {Array.from({ length: slices }, (_, i) => {
        const start = (i * Math.PI * 2) / slices - Math.PI / 2;
        const end = ((i + 1) * Math.PI * 2) / slices - Math.PI / 2;
        const mid = (start + end) / 2;
        const point = (angle: number, radius: number) =>
          `${100 + Math.cos(angle) * radius} ${100 + Math.sin(angle) * radius}`;
        const claimed = i >= slices - taken;
        return (
          <g
            key={i}
            className={claimed ? "pizza-slice claimed" : "pizza-slice"}
            style={
              {
                "--slice-x": `${Math.cos(mid) * 17}px`,
                "--slice-y": `${Math.sin(mid) * 17}px`,
                animationDelay: `${i * 40}ms`,
              } as CSSProperties
            }
          >
            <path
              d={`M100 100 L${point(start, 70)} A70 70 0 0 1 ${point(end, 70)} Z`}
              fill={claimed ? "#f5bb65" : "#ffda83"}
              stroke="#fffaf2"
              strokeWidth="3"
            />
            <path
              d={`M${point(start, 70)} A70 70 0 0 1 ${point(end, 70)}`}
              fill="none"
              stroke="#cc762b"
              strokeWidth="9"
            />
            <defs>
              <clipPath id={`${pizzaId}-${i}`}>
                <path
                  d={`M100 100 L${point(start + 0.015, 63)} A63 63 0 0 1 ${point(end - 0.015, 63)} Z`}
                />
              </clipPath>
            </defs>
            <g clipPath={`url(#${pizzaId}-${i})`}>
              {Array.from({ length: 12 }, (_, topping) => {
                const angle = (topping * Math.PI * 2) / 12 + 0.12;
                const radius = topping % 2 ? 50 : 35;
                const x = 100 + Math.cos(angle) * radius,
                  y = 100 + Math.sin(angle) * radius;
                return (
                  <g key={topping}>
                    <circle
                      className="pepperoni"
                      cx={x}
                      cy={y}
                      r="7.5"
                      fill="#bb3c20"
                      stroke="#9e301a"
                      strokeWidth="1"
                    />
                    <circle cx={x - 2} cy={y - 2} r="1.3" fill="#e9915d" />
                    <circle cx={x + 2.5} cy={y + 2} r="1" fill="#e9915d" />
                  </g>
                );
              })}
              {Array.from({ length: 7 }, (_, topping) => {
                const angle = (topping * Math.PI * 2) / 7 + 0.35;
                const x = 100 + Math.cos(angle) * 57,
                  y = 100 + Math.sin(angle) * 57;
                return (
                  <ellipse
                    key={topping}
                    cx={x}
                    cy={y}
                    rx="4"
                    ry="2"
                    transform={`rotate(${topping * 47} ${x} ${y})`}
                    fill="#66824d"
                  />
                );
              })}
              <circle cx="101" cy="98" r="5" fill="#fff0b0" />
            </g>
          </g>
        );
      })}
    </svg>
  );
}
