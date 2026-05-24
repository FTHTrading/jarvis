import React from "react";
import type { Tab } from "../../App";

interface Props {
  tabs:      Tab[];
  activeIdx: number;
  onSelect:  (i: number) => void;
  onClose:   (id: string) => void;
}

export default function TabCarousel({ tabs, activeIdx, onSelect, onClose }: Props) {
  return (
    <div className="tab-carousel">
      {tabs.map((tab, i) => {
        const offset  = i - activeIdx;
        const isActive = i === activeIdx;
        return (
          <div
            key={tab.id}
            className={`tab-card ${isActive ? "is-active" : ""}`}
            style={{
              transform: `
                perspective(800px)
                rotateY(${offset * 12}deg)
                translateX(${offset * 180}px)
                translateZ(${Math.abs(offset) * -60}px)
              `,
              opacity:   isActive ? 1 : Math.max(0.3, 1 - Math.abs(offset) * 0.3),
              zIndex:    100 - Math.abs(offset),
            }}
            onClick={() => onSelect(i)}
          >
            <div className="tab-card-inner">
              <span className="tab-title">{tab.title || "New Tab"}</span>
              {tabs.length > 1 && (
                <button
                  className="tab-close"
                  onClick={(e) => { e.stopPropagation(); onClose(tab.id); }}
                >×</button>
              )}
            </div>
            <div className={`tab-state-bar state-${tab.state}`}/>
          </div>
        );
      })}

      <style>{`
        .tab-carousel {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 42px;
          background: #0c0c14;
          border-bottom: 1px solid rgba(124,58,237,.12);
          overflow: hidden;
          position: relative;
        }
        .tab-card {
          position: absolute;
          min-width: 160px; max-width: 220px;
          height: 32px;
          transition: transform .25s cubic-bezier(.4,0,.2,1), opacity .25s;
          cursor: pointer;
        }
        .tab-card-inner {
          display: flex; align-items: center; justify-content: space-between;
          height: 100%; background: #111120;
          border: 1px solid rgba(124,58,237,.15);
          border-radius: 6px;
          padding: 0 10px;
          gap: 6px;
        }
        .tab-card.is-active .tab-card-inner {
          background: #18182a;
          border-color: rgba(124,58,237,.4);
        }
        .tab-title {
          font-size: 11px; color: #9090b8;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
          flex: 1;
        }
        .tab-card.is-active .tab-title { color: #e2e0f0; }
        .tab-close {
          background: none; border: none; color: #5a5a80;
          font-size: 14px; cursor: pointer; line-height: 1; padding: 0 2px;
          transition: color .15s;
        }
        .tab-close:hover { color: #ef4444; }
        .tab-state-bar {
          height: 2px; border-radius: 0 0 4px 4px;
          transition: background .3s;
        }
        .state-bar.state-passive { background: transparent; }
        .state-bar.state-armed   { background: #f59e0b; }
        .state-bar.state-active  { background: #22c55e; }
      `}</style>
    </div>
  );
}
