// Input: mouse (pointer) and keyboard, kept in one place. The canvas
// reports pointer presses in its own coordinate space; keys are exposed
// as edge-triggered flags the main loop consumes once per frame.
export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.clicks = []; // {x, y} in canvas pixels, consumed by the world
    this.hover = { x: -1, y: -1 };
    this.keys = new Set();
    this.pressed = new Set();

    canvas.addEventListener('pointermove', (e) => {
      const p = this.toCanvas(e);
      this.hover.x = p.x;
      this.hover.y = p.y;
    });
    canvas.addEventListener('pointerdown', (e) => {
      const p = this.toCanvas(e);
      this.clicks.push(p);
      this.hover.x = p.x;
      this.hover.y = p.y;
    });
    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      const k = e.key.toLowerCase();
      this.keys.add(k);
      this.pressed.add(k);
      if (k === ' ' || k.startsWith('arrow')) e.preventDefault();
    });
    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.key.toLowerCase());
    });
    window.addEventListener('blur', () => {
      this.keys.clear();
    });
  }

  toCanvas(e) {
    const r = this.canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) / r.width) * this.canvas.width,
      y: ((e.clientY - r.top) / r.height) * this.canvas.height,
    };
  }

  takeClicks() {
    const out = this.clicks;
    this.clicks = [];
    return out;
  }

  wasPressed(key) {
    return this.pressed.has(key.toLowerCase());
  }

  endFrame() {
    this.pressed.clear();
  }
}
