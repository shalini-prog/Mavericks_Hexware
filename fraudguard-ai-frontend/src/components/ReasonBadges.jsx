import {
  Smartphone,
  MapPin,
  Globe2,
  Gauge,
  Zap,
  ShieldX,
  Banknote,
  Store,
  Clock,
  AlertOctagon,
} from "lucide-react";
import { EmptyState } from "./StateBlock";
import "./ReasonBadges.css";

const ICON_MAP = [
  { match: /device/i, icon: Smartphone },
  { match: /location/i, icon: MapPin },
  { match: /international/i, icon: Globe2 },
  { match: /extremely high.*velocity/i, icon: Zap },
  { match: /velocity/i, icon: Gauge },
  { match: /failed attempt/i, icon: ShieldX },
  { match: /amount/i, icon: Banknote },
  { match: /merchant/i, icon: Store },
  { match: /time/i, icon: Clock },
];

function iconFor(reason) {
  const found = ICON_MAP.find((entry) => entry.match.test(reason));
  return found ? found.icon : AlertOctagon;
}

export default function ReasonBadges({ reasons }) {
  if (!reasons || reasons.length === 0) {
    return <EmptyState title="No rule triggers" message="No business rules were triggered for this transaction." />;
  }

  return (
    <div className="reason-grid">
      {reasons.map((reason, i) => {
        const Icon = iconFor(reason);
        return (
          <div className="reason-badge" key={i}>
            <span className="reason-badge-icon">
              <Icon size={15} />
            </span>
            <span>{reason}</span>
          </div>
        );
      })}
    </div>
  );
}
