import type { Injector } from "didi";

type ContextPad = {
  registerProvider: (provider: any) => void;
};

type Modeling = {
  setColor?: (elements: any[], colors: { fill?: string | null; stroke?: string | null }) => void;
};

type Overlays = {
  add: (element: any, type: string, cfg: { position: any; html: HTMLElement }) => string;
  remove: (id: string) => void;
};

type EventBus = {
  on: (event: string, cb: (...args: any[]) => void) => void;
};

type Canvas = {
  getContainer: () => HTMLElement;
};

const COLOR_PRESETS = [
  "#ffffff",
  "#f8d7da",
  "#fff3cd",
  "#d1e7dd",
  "#cff4fc",
  "#cfe2ff",
  "#e2d9f3",
  "#f5c2e7",
  "#e9ecef",
  "#fde2e4",
  "#e2f0cb",
  "#d0ebff"
];

function isTask(element: any) {
  const t = element?.type || element?.businessObject?.$type;
  return typeof t === "string" && t.startsWith("bpmn:") && (t === "bpmn:Task" || t.endsWith("Task"));
}

export class ColorContextPadProvider {
  static $inject = ["injector"];

  private readonly contextPad: ContextPad;
  private readonly modeling: Modeling | null;
  private readonly overlays: Overlays | null;
  private readonly eventBus: EventBus;
  private readonly canvas: Canvas | null;

  private overlayId: string | null = null;
  private overlayElementId: string | null = null;

  constructor(injector: Injector) {
    this.contextPad = injector.get("contextPad");
    this.modeling = injector.get("modeling", false);
    this.overlays = injector.get("overlays", false);
    this.eventBus = injector.get("eventBus");
    this.canvas = injector.get("canvas", false);

    this.contextPad.registerProvider(this);

    this.eventBus.on("selection.changed", () => this.close());
    this.eventBus.on("canvas.viewbox.changed", () => this.close());

    const container = this.canvas?.getContainer?.();
    if (container) {
      container.addEventListener("mousedown", () => this.close());
      container.addEventListener("wheel", () => this.close(), { passive: true } as any);
    }
  }

  getContextPadEntries(element: any) {
    if (!this.modeling?.setColor) return {};
    if (!this.overlays) return {};
    if (!isTask(element)) return {};

    return {
      "bwl-color": {
        group: "edit",
        className: "bwl-color-contextpad",
        title: "Color",
        action: {
          click: (_event: any, el: any) => {
            this.toggle(el);
          }
        }
      }
    };
  }

  private toggle(element: any) {
    if (this.overlayId && this.overlayElementId === element?.id) {
      this.close();
      return;
    }
    this.open(element);
  }

  private open(element: any) {
    this.close();
    if (!this.overlays || !this.modeling?.setColor) return;
    if (!element?.id) return;

    const root = document.createElement("div");
    root.className = "bwl-color-overlay";

    const row = document.createElement("div");
    row.className = "bwl-color-row";

    for (const c of COLOR_PRESETS) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "bwl-color-swatch";
      btn.style.background = c;
      btn.title = c;
      btn.addEventListener("click", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        this.modeling?.setColor?.([element], { fill: c });
      });
      row.appendChild(btn);
    }

    const pickers = document.createElement("div");
    pickers.className = "bwl-color-pickers";

    const fillInput = document.createElement("input");
    fillInput.type = "color";
    fillInput.title = "Fill color";
    fillInput.addEventListener("input", (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      this.modeling?.setColor?.([element], { fill: (ev.target as HTMLInputElement).value });
    });

    const strokeInput = document.createElement("input");
    strokeInput.type = "color";
    strokeInput.title = "Border color";
    strokeInput.addEventListener("input", (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      this.modeling?.setColor?.([element], { stroke: (ev.target as HTMLInputElement).value });
    });

    const clear = document.createElement("button");
    clear.type = "button";
    clear.className = "bwl-color-clear";
    clear.textContent = "Clear";
    clear.addEventListener("click", (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      this.modeling?.setColor?.([element], { fill: null, stroke: null });
    });

    pickers.appendChild(fillInput);
    pickers.appendChild(strokeInput);
    pickers.appendChild(clear);

    root.appendChild(row);
    root.appendChild(pickers);

    this.overlayId = this.overlays.add(element, "bwl-color", {
      position: { top: -6, left: 150 },
      html: root
    });
    this.overlayElementId = element.id;
  }

  private close() {
    if (this.overlayId && this.overlays) {
      this.overlays.remove(this.overlayId);
    }
    this.overlayId = null;
    this.overlayElementId = null;
  }
}

