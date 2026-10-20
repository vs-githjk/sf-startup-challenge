// Prism wave: a light wave split into red, green and blue. Raw WebGL, no library.
// One still frame for reduced motion; pauses when off screen or the tab is hidden.
(() => {
  const canvas = document.getElementById("prism");
  const gl = canvas && canvas.getContext("webgl", { antialias: false, alpha: false });
  if (!gl) return; // the dark hero still reads fine without it
  const VERT = "attribute vec2 a; void main() { gl_Position = vec4(a, 0.0, 1.0); }";
  const FRAG = `precision highp float; uniform vec2 res; uniform float t;
  void main() {
    vec2 p = (gl_FragCoord.xy * 2.0 - res) / min(res.x, res.y);
    p.y += 0.5;
    float d = length(p) * 0.05;
    float r = 0.05 / abs(p.y + sin((p.x * (1.0 + d) + t)) * 0.5);
    float g = 0.05 / abs(p.y + sin((p.x + t)) * 0.5);
    float b = 0.05 / abs(p.y + sin((p.x * (1.0 - d) + t)) * 0.5);
    gl_FragColor = vec4(min(vec3(r, g, b), vec3(1.0)), 1.0);
  }`;
  const make = (type, src) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, src); gl.compileShader(s);
    return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
  };
  const vs = make(gl.VERTEX_SHADER, VERT), fs = make(gl.FRAGMENT_SHADER, FRAG), prog = gl.createProgram();
  if (!vs || !fs) return;
  gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog); gl.useProgram(prog);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, "a");
  gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const uRes = gl.getUniformLocation(prog, "res"), uT = gl.getUniformLocation(prog, "t");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let raf = 0, visible = true, time = 1.2, last = performance.now();

  function size() {
    const dpr = Math.min(devicePixelRatio || 1, 1.5);
    canvas.width = Math.max(1, Math.round(canvas.clientWidth * dpr));
    canvas.height = Math.max(1, Math.round(canvas.clientHeight * dpr));
    gl.viewport(0, 0, canvas.width, canvas.height);
  }
  function draw() { gl.uniform2f(uRes, canvas.width, canvas.height); gl.uniform1f(uT, time); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); }
  function frame(now) {
    time += Math.min(now - last, 50) * 0.0006; last = now; draw();
    if (visible && !document.hidden && !reduced) raf = requestAnimationFrame(frame); // stops when hidden
  }
  function kick() { cancelAnimationFrame(raf); last = performance.now(); raf = requestAnimationFrame(frame); }

  size(); draw();
  if (!reduced) kick();
  new ResizeObserver(() => { size(); draw(); }).observe(canvas);
  new IntersectionObserver((e) => { visible = e[0].isIntersecting; if (visible && !reduced) kick(); }).observe(canvas);
  document.addEventListener("visibilitychange", () => { if (!document.hidden && visible && !reduced) kick(); });
})();
