import type { ChartData } from '../core/types';
import { comma } from '../core/format';

// 図表の読み取り用のグラフ。本番と同じように、数値はすべてグラフの中に書く(目盛りから読み取らせない)。
// 色は styles.css の .chart で決める(明るい画面・暗い画面の両方に対応)。

const W = 340;
const fmt = (v: number) => (Number.isInteger(v) ? comma(v) : String(v));

function describe(c: ChartData): string {
  return c.series
    .map((s) => `${s.name ? `${s.name}: ` : ''}${c.labels.map((l, i) => `${l} ${fmt(s.values[i])}${c.kind === 'pie' ? '%' : ''}`).join('、')}`)
    .join('。');
}

function Bar({ c }: { c: ChartData }) {
  const v = c.series[0].values;
  const n = v.length;
  const [left, right, top, base] = [10, W - 10, 30, 166];
  const slot = (right - left) / n;
  const bw = Math.min(40, slot * 0.58);
  const max = Math.max(...v, 1);
  return (
    <svg viewBox={`0 0 ${W} 192`} role="img" aria-label={describe(c)}>
      <line className="ch-axis" x1={left} y1={base} x2={right} y2={base} />
      {v.map((x, i) => {
        const cx = left + slot * (i + 0.5);
        const h = (x / max) * (base - top);
        return (
          <g key={i}>
            <rect className="ch-bar" x={cx - bw / 2} y={base - h} width={bw} height={h} rx={2} />
            <text className="ch-v" x={cx} y={base - h - 6} textAnchor="middle">
              {fmt(x)}
            </text>
            <text className="ch-x" x={cx} y={base + 17} textAnchor="middle">
              {c.labels[i]}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function Line({ c }: { c: ChartData }) {
  const n = c.labels.length;
  const [left, right, top, bottom] = [30, W - 30, 50, 150];
  const all = c.series.flatMap((s) => s.values);
  const lo = Math.min(...all);
  const hi = Math.max(...all);
  const span = Math.max(1, hi - lo);
  const X = (i: number) => left + ((right - left) * i) / (n - 1);
  const Y = (x: number) => bottom - ((x - lo) / span) * (bottom - top);
  return (
    <svg viewBox={`0 0 ${W} 204`} role="img" aria-label={describe(c)}>
      {c.series.map((s, k) => (
        <g key={k} transform={`translate(${left + k * 110}, 14)`}>
          <line className={`ch-s${k}`} x1={0} y1={0} x2={26} y2={0} />
          <Marker k={k} x={13} y={0} />
          <text className="ch-x" x={32} y={4}>
            {s.name}
          </text>
        </g>
      ))}
      <line className="ch-axis" x1={left - 14} y1={bottom + 26} x2={right + 14} y2={bottom + 26} />
      {c.series.map((s, k) => (
        <polyline key={k} className={`ch-s${k}`} fill="none" points={s.values.map((x, i) => `${X(i)},${Y(x)}`).join(' ')} />
      ))}
      {c.labels.map((l, i) => (
        <text key={l} className="ch-x" x={X(i)} y={bottom + 43} textAnchor="middle">
          {l}
        </text>
      ))}
      {c.series.map((s, k) =>
        s.values.map((x, i) => {
          // 同じ年の2つの値は、大きいほうを点の上、小さいほうを点の下に書いて重ならないようにする
          const other = c.series[1 - k]?.values[i];
          const above = other === undefined || x > other || (x === other && k === 0);
          return (
            <g key={`${k}-${i}`}>
              <Marker k={k} x={X(i)} y={Y(x)} />
              <text className="ch-v" x={X(i)} y={above ? Y(x) - 9 : Y(x) + 18} textAnchor="middle">
                {fmt(x)}
              </text>
            </g>
          );
        }),
      )}
    </svg>
  );
}

function Marker({ k, x, y }: { k: number; x: number; y: number }) {
  return k === 0 ? <circle className="ch-m0" cx={x} cy={y} r={4} /> : <rect className="ch-m1" x={x - 4} y={y - 4} width={8} height={8} />;
}

function Pie({ c }: { c: ChartData }) {
  const v = c.series[0].values;
  const total = v.reduce((a, b) => a + b, 0);
  const [cx, cy, r] = [W / 2, 104, 60];
  let acc = 0;
  const pt = (frac: number, rad: number) => {
    const a = frac * 2 * Math.PI - Math.PI / 2;
    return [cx + rad * Math.cos(a), cy + rad * Math.sin(a)];
  };
  return (
    <svg viewBox={`0 0 ${W} 208`} role="img" aria-label={describe(c)}>
      {v.map((x, i) => {
        const from = acc / total;
        acc += x;
        const to = acc / total;
        const [x1, y1] = pt(from, r);
        const [x2, y2] = pt(to, r);
        const mid = (from + to) / 2;
        const [lx, ly] = pt(mid, r + 15);
        const cos = Math.cos(mid * 2 * Math.PI - Math.PI / 2);
        const anchor = cos > 0.25 ? 'start' : cos < -0.25 ? 'end' : 'middle';
        // 上下の端にあるラベルは、円に重ならないように少し外へ出す
        const dy = anchor === 'middle' ? (ly < cy ? -12 : 10) : 0;
        return (
          <g key={i}>
            <path className={`ch-p${i % 5}`} d={`M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${to - from > 0.5 ? 1 : 0} 1 ${x2},${y2} Z`} />
            <text className="ch-x" x={lx} y={ly + dy - 2} textAnchor={anchor}>
              {c.labels[i]}
            </text>
            <text className="ch-v" x={lx} y={ly + dy + 11} textAnchor={anchor}>
              {fmt(x)}%
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export function ChartView({ c }: { c: ChartData }) {
  return (
    <figure className="chart">
      <figcaption>{c.caption}</figcaption>
      {c.kind === 'bar' ? <Bar c={c} /> : c.kind === 'line' ? <Line c={c} /> : <Pie c={c} />}
      {c.note && <div className="chart-note">{c.note}</div>}
    </figure>
  );
}
