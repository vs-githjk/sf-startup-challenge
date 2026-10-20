import { useEffect, useRef } from "react";

// A light wave split into red, green and blue like light through a prism.
// Raw WebGL, no extra dependency. Draws one still frame for reduced motion and pauses off screen.
const VERT = "attribute vec2 a; void main() { gl_Position = vec4(a, 0.0, 1.0); }";
const FRAG = `
precision highp float;
uniform vec2 res;
uniform float t;
void main() {
  vec2 p = (gl_FragCoord.xy * 2.0 - res) / min(res.x, res.y);
  p.y += 0.85;
  float d = length(p) * 0.05;
  float rx = p.x * (1.0 + d), gx = p.x, bx = p.x * (1.0 - d);
  float r = 0.05 / abs(p.y + sin((rx + t) * 1.0) * 0.5);
  float g = 0.05 / abs(p.y + sin((gx + t) * 1.0) * 0.5);
  float b = 0.05 / abs(p.y + sin((bx + t) * 1.0) * 0.5);
  gl_FragColor = vec4(min(vec3(r, g, b), vec3(1.0)), 1.0);
}`;

function shader(gl: WebGLRenderingContext, type: number, src: string) {
  const s = gl.createShader(type);
  if (!s) return null;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.warn("prism shader:", gl.getShaderInfoLog(s)); return null; }
  return s;
}

export default function PrismWave() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const gl = canvas?.getContext("webgl", { antialias: false, alpha: false });
    if (!canvas || !gl) return; // the dark hero still reads fine without it
    const vs = shader(gl, gl.VERTEX_SHADER, VERT), fs = shader(gl, gl.FRAGMENT_SHADER, FRAG);
    const prog = gl.createProgram();
    if (!vs || !fs || !prog) return;
    gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog); gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "a");
    gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const uRes = gl.getUniformLocation(prog, "res"), uT = gl.getUniformLocation(prog, "t");

    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0, visible = true, time = 0, last = performance.now();
    const size = () => {
      const dpr = Math.min(devicePixelRatio || 1, 1.5);
      canvas.width = Math.max(1, Math.round(canvas.clientWidth * dpr));
      canvas.height = Math.max(1, Math.round(canvas.clientHeight * dpr));
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    const draw = () => {
      gl.uniform2f(uRes, canvas.width, canvas.height); gl.uniform1f(uT, time);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };
    const frame = (now: number) => {
      time += Math.min(now - last, 50) * 0.0006; last = now;
      draw();
      if (visible && !document.hidden && !reduced) raf = requestAnimationFrame(frame); // stops when hidden
    };
    const kick = () => { cancelAnimationFrame(raf); last = performance.now(); raf = requestAnimationFrame(frame); };
    size(); time = 1.2; draw();
    if (!reduced) kick();
    const ro = new ResizeObserver(() => { size(); draw(); });
    ro.observe(canvas);
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible && !reduced) kick(); });
    io.observe(canvas);
    const vis = () => { if (!document.hidden && visible && !reduced) kick(); };
    document.addEventListener("visibilitychange", vis);
    return () => {
      cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); document.removeEventListener("visibilitychange", vis);
    };
  }, []);

  return <canvas ref={ref} className="prism-wave" aria-hidden="true" />;
}
