// Particles and floating score text: the juice. Everything here is
// cosmetic — it never changes the score or the world, only how it feels.
export class Particles {
  constructor() {
    this.items = [];
    this.texts = [];
  }

  burst(x, y, color, n, speed, life, size, gravity) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = speed * (0.4 + Math.random() * 0.8);
      this.items.push({
        x,
        y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v - speed * 0.35,
        life: life * (0.6 + Math.random() * 0.7),
        age: 0,
        size: size * (0.6 + Math.random() * 0.8),
        color,
        gravity: gravity ?? 260,
        spin: (Math.random() - 0.5) * 9,
        rot: Math.random() * Math.PI * 2,
      });
    }
  }

  petals(x, y, color) {
    this.burst(x, y, color, 14, 150, 0.9, 7, 190);
    this.burst(x, y, '#fff8e7', 5, 110, 0.7, 4, 120);
  }

  splat(x, y) {
    this.burst(x, y, '#7ac74f', 12, 130, 0.6, 6, 320);
    this.burst(x, y, '#4a7c2f', 6, 90, 0.5, 4, 320);
  }

  splash(x, y) {
    this.burst(x, y, '#4cc9f0', 10, 120, 0.55, 5, 300);
  }

  sparkle(x, y, color) {
    this.burst(x, y, color, 8, 90, 0.8, 4, -40);
  }

  floatText(x, y, text, color, big) {
    this.texts.push({ x, y, text, color, age: 0, life: big ? 1.3 : 0.95, big: !!big });
  }

  update(dt) {
    for (const p of this.items) {
      p.age += dt;
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.spin * dt;
    }
    this.items = this.items.filter((p) => p.age < p.life);
    for (const t of this.texts) {
      t.age += dt;
      t.y -= 46 * dt;
    }
    this.texts = this.texts.filter((t) => t.age < t.life);
  }

  draw(ctx) {
    for (const p of this.items) {
      const k = 1 - p.age / p.life;
      ctx.save();
      ctx.globalAlpha = Math.max(0, k);
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.ellipse(0, 0, p.size, p.size * 0.55, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    for (const t of this.texts) {
      const k = 1 - t.age / t.life;
      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, k * 1.6));
      ctx.font = t.big ? '900 30px Trebuchet MS, sans-serif' : '800 20px Trebuchet MS, sans-serif';
      ctx.textAlign = 'center';
      ctx.lineWidth = 5;
      ctx.strokeStyle = 'rgba(30, 10, 50, 0.85)';
      ctx.strokeText(t.text, t.x, t.y);
      ctx.fillStyle = t.color;
      ctx.fillText(t.text, t.x, t.y);
      ctx.restore();
    }
  }
}
