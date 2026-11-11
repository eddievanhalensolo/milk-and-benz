import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { PageHead } from '../App';
import { DEFAULT_BOX3, Vec3, contractCurve3, contractPoint, equilibrium3, grad3, gradientAngle, mrs3, plans3, tatonnement3, u3 } from '../engine/exchange3';
import { useNames } from '../store';
import { Curve, Dot, Label, Plot } from '../ui/plot';
import { LabLink, Lemma, Readouts, Slider, TeX, ViewTitle, f2 } from '../ui/kit';

const B = DEFAULT_BOX3;
const E0: Vec3 = [8, 2, 3];
const INK = 0x1f2226;
const STEEL = 0x5d6d84;
const ACCENT = 0xb8432c;

// goods → three.js axes: milk → x, Benz → y (up), chalk → z
const toV = (v: Vec3) => new THREE.Vector3(v[0], v[1], v[2]);

function textSprite(text: string, color = '#4b5058') {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 64;
  const g = c.getContext('2d')!;
  g.font = 'italic 34px "Source Serif 4", Georgia, serif';
  g.fillStyle = color;
  g.textAlign = 'center';
  g.fillText(text, 128, 44);
  const tex = new THREE.CanvasTexture(c);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
  s.scale.set(2.4, 0.6, 1);
  return s;
}

/** The six faces of the box as clipping planes, so surfaces end exactly at the walls. */
const boxClip = () => [
  new THREE.Plane(new THREE.Vector3(1, 0, 0), 0.001),
  new THREE.Plane(new THREE.Vector3(-1, 0, 0), B.omega[0] + 0.001),
  new THREE.Plane(new THREE.Vector3(0, 1, 0), 0.001),
  new THREE.Plane(new THREE.Vector3(0, -1, 0), B.omega[1] + 0.001),
  new THREE.Plane(new THREE.Vector3(0, 0, 1), 0.001),
  new THREE.Plane(new THREE.Vector3(0, 0, -1), B.omega[2] + 0.001),
];

/** Indifference surface z = g(x, y) on a fine grid; the GPU clips it to the box. */
function surface(g: (x: number, y: number) => number, color: number, opacity: number, n = 90) {
  const pos: number[] = [];
  const idx: number[] = [];
  const cap = 3 * B.omega[2];
  for (let i = 0; i <= n; i++)
    for (let j = 0; j <= n; j++) {
      const x = 1e-3 + ((B.omega[0] - 2e-3) * i) / n;
      const y = 1e-3 + ((B.omega[1] - 2e-3) * j) / n;
      const z = g(x, y);
      pos.push(x, y, isFinite(z) ? Math.max(-cap, Math.min(cap, z)) : cap);
    }
  const at = (i: number, j: number) => i * (n + 1) + j;
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++) idx.push(at(i, j), at(i + 1, j), at(i + 1, j + 1), at(i, j), at(i + 1, j + 1), at(i, j + 1));
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  const mat = new THREE.MeshLambertMaterial({ color, transparent: true, opacity, side: THREE.DoubleSide, depthWrite: false, clippingPlanes: boxClip() });
  return new THREE.Mesh(geo, mat);
}

export default function ThreeGoods() {
  const N = useNames();
  const [eA, setEA] = useState<Vec3>(E0);
  const [xA, setXA] = useState<Vec3>(E0);
  const [p, setP] = useState<Vec3>([1, 1, 1]);
  const [running, setRunning] = useState(false);
  const [sCC, setSCC] = useState(0.5);
  const [show, setShow] = useState({ surfaces: true, plane: true });
  const mount = useRef<HTMLDivElement>(null);
  const world = useRef<{ scene: THREE.Scene; dyn: THREE.Group; renderer: THREE.WebGLRenderer; camera: THREE.PerspectiveCamera; controls: OrbitControls; ball: THREE.Mesh } | null>(null);
  const xRef = useRef(xA);
  xRef.current = xA;

  const cc = useMemo(() => contractCurve3(B), []);
  const eq = useMemo(() => equilibrium3(B, eA), [eA]);
  const xB: Vec3 = [B.omega[0] - xA[0], B.omega[1] - xA[1], B.omega[2] - xA[2]];
  const angle = gradientAngle(B, xA);
  const plans = plans3(B, eA, p);

  // ---------- one-time scene setup ----------
  useEffect(() => {
    const el = mount.current!;
    const w = el.clientWidth;
    const h = 520;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(w, h);
    renderer.localClippingEnabled = true;
    el.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(36, w / h, 0.1, 200);
    camera.position.set(24, 15, 26);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(5, 5, 5);
    controls.enableDamping = true;
    scene.add(new THREE.AmbientLight(0xffffff, 0.9));
    const dl = new THREE.DirectionalLight(0xffffff, 0.6);
    dl.position.set(10, 20, 15);
    scene.add(dl);
    const box = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(...B.omega)),
      new THREE.LineBasicMaterial({ color: 0xa9adb3 }),
    );
    box.position.set(B.omega[0] / 2, B.omega[1] / 2, B.omega[2] / 2);
    scene.add(box);
    // A's axes (ink) and B's axes (steel) from opposite corners
    const axis = (from: Vec3, to: Vec3, color: number) =>
      new THREE.Line(new THREE.BufferGeometry().setFromPoints([toV(from), toV(to)]), new THREE.LineBasicMaterial({ color }));
    scene.add(axis([0, 0, 0], [11.5, 0, 0], INK), axis([0, 0, 0], [0, 11.5, 0], INK), axis([0, 0, 0], [0, 0, 11.5], INK));
    const lab = (t: string, v: Vec3, c?: string) => {
      const s = textSprite(t, c);
      s.position.copy(toV(v));
      scene.add(s);
    };
    lab('milk', [12.6, 0, 0]);
    lab('Benz', [0, 12.2, 0]);
    lab('chalk', [0, 0, 12.6]);
    lab('A', [-0.6, -0.6, -0.6], '#1f2226');
    lab('B', [10.6, 10.6, 10.6], '#5d6d84');
    const curve = new THREE.Line(new THREE.BufferGeometry().setFromPoints(cc.map(toV)), new THREE.LineBasicMaterial({ color: ACCENT, linewidth: 2 }));
    scene.add(curve);
    const dyn = new THREE.Group();
    scene.add(dyn);
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.28, 24, 16), new THREE.MeshLambertMaterial({ color: INK }));
    scene.add(ball);

    // dragging the allocation: move it in the plane facing the camera
    const ray = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    let dragging = false;
    const plane = new THREE.Plane();
    const setNdc = (e: PointerEvent) => {
      const r = renderer.domElement.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    };
    const down = (e: PointerEvent) => {
      setNdc(e);
      ray.setFromCamera(ndc, camera);
      if (ray.intersectObject(ball).length) {
        dragging = true;
        controls.enabled = false;
        plane.setFromNormalAndCoplanarPoint(camera.getWorldDirection(new THREE.Vector3()).negate(), ball.position.clone());
      }
    };
    const move = (e: PointerEvent) => {
      if (!dragging) return;
      setNdc(e);
      ray.setFromCamera(ndc, camera);
      const hit = new THREE.Vector3();
      if (ray.ray.intersectPlane(plane, hit)) {
        const c = (v: number, i: number) => Math.max(0.05, Math.min(B.omega[i] - 0.05, v));
        setXA([c(hit.x, 0), c(hit.y, 1), c(hit.z, 2)]);
      }
    };
    const up = () => {
      dragging = false;
      controls.enabled = true;
    };
    renderer.domElement.addEventListener('pointerdown', down);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);

    let raf = 0;
    const loop = () => {
      controls.update();
      renderer.render(scene, camera);
      raf = requestAnimationFrame(loop);
    };
    loop();
    world.current = { scene, dyn, renderer, camera, controls, ball };
    return () => {
      cancelAnimationFrame(raf);
      renderer.domElement.removeEventListener('pointerdown', down);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      renderer.dispose();
      el.removeChild(renderer.domElement);
    };
  }, [cc]);

  // ---------- dynamic objects ----------
  useEffect(() => {
    const W = world.current;
    if (!W) return;
    W.ball.position.copy(toV(xA));
    W.dyn.children.forEach((o) => {
      const m = o as THREE.Mesh;
      m.geometry?.dispose();
      (m.material as THREE.Material)?.dispose?.();
    });
    W.dyn.clear();
    const uA = u3(B.aA, xA);
    const uB = u3(B.aB, xB);
    if (show.surfaces) {
      W.dyn.add(surface((x, y) => Math.pow(uA / (Math.pow(x, B.aA[0]) * Math.pow(y, B.aA[1])), 1 / B.aA[2]), INK, 0.14));
      W.dyn.add(
        surface((x, y) => B.omega[2] - Math.pow(uB / (Math.pow(B.omega[0] - x, B.aB[0]) * Math.pow(B.omega[1] - y, B.aB[1])), 1 / B.aB[2]), STEEL, 0.2),
      );
    }
    // gradients: A's direction of improvement, and B's (seen from A's origin, it points the other way)
    const gA = toV(grad3(B.aA, xA)).normalize();
    const gB = toV(grad3(B.aB, xB)).normalize().negate();
    W.dyn.add(new THREE.ArrowHelper(gA, toV(xA), 2.6, INK, 0.5, 0.25));
    W.dyn.add(new THREE.ArrowHelper(gB, toV(xA), 2.6, STEEL, 0.5, 0.25));
    // endowment
    const eBall = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 12), new THREE.MeshBasicMaterial({ color: 0x7b8087, wireframe: true }));
    eBall.position.copy(toV(eA));
    W.dyn.add(eBall);
    // equilibrium
    const qBall = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), new THREE.MeshLambertMaterial({ color: ACCENT }));
    qBall.position.copy(toV(eq.xA));
    W.dyn.add(qBall);
    // plans at the current price
    const pa = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 10), new THREE.MeshBasicMaterial({ color: INK }));
    pa.position.copy(toV(plans.dA));
    const pb = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 10), new THREE.MeshBasicMaterial({ color: STEEL }));
    pb.position.copy(toV([B.omega[0] - plans.dB[0], B.omega[1] - plans.dB[1], B.omega[2] - plans.dB[2]]));
    W.dyn.add(pa, pb);
    // price plane through the endowment: p · (x − e) = 0, clipped to the box
    if (show.plane) {
      const n = toV(p).normalize();
      const geo = new THREE.PlaneGeometry(40, 40);
      const mat = new THREE.MeshBasicMaterial({ color: ACCENT, transparent: true, opacity: 0.1, side: THREE.DoubleSide, clippingPlanes: boxClip(), depthWrite: false });
      const pl = new THREE.Mesh(geo, mat);
      pl.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), n);
      pl.position.copy(toV(eA));
      W.dyn.add(pl);
    }
  }, [xA, eA, p, show, eq]);

  // ---------- price adjustment ----------
  useEffect(() => {
    if (!running) return;
    let raf = 0;
    let frames = 0;
    let pp: Vec3 = [...p] as Vec3;
    const tick = () => {
      pp = tatonnement3(B, eA, pp, 0.05);
      frames++;
      setP(pp);
      const err = Math.abs(Math.log(pp[0] / eq.relPrices[0])) + Math.abs(Math.log(pp[2] / eq.relPrices[2]));
      if (err < 2e-3 || frames > 900) {
        setP(eq.relPrices);
        setXA(eq.xA);
        setRunning(false);
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [running]);

  // ---------- society view ----------
  const upf = cc.map((x) => [u3(B.aA, x), u3(B.aB, [B.omega[0] - x[0], B.omega[1] - x[1], B.omega[2] - x[2]])] as [number, number]);
  const uMaxA = u3(B.aA, B.omega) * 1.04;
  const uMaxB = u3(B.aB, B.omega) * 1.04;
  const set = (i: number, v: number) => setXA(xA.map((w, j) => (j === i ? v : w)) as Vec3);
  const goods = [N.x, N.y, 'chalk'];

  return (
    <div>
      <PageHead num="3a" title="More goods: the box in three dimensions" />
      <p className="lede">
        Logicians need chalk. With three goods the box becomes a cube: {N.A} measures from the near corner, {N.B} from the far one. Indifference curves
        become surfaces, the price line becomes a price plane, and tangency becomes “the two gradients are parallel”. The contract curve is still a curve,
        winding through the cube. Drag the black ball; rotate with the mouse elsewhere.
      </p>
      <div className="cols-wide">
        <div className="card">
          <ViewTitle zoom="The market — two people, three goods" name="rotatable" />
          <div ref={mount} style={{ width: '100%', height: 520, cursor: 'grab' }} />
          <div className="small muted">
            Black and steel surfaces: {N.A}’s and {N.B}’s indifference surfaces through the allocation. Arrows: each one’s direction of improvement (B’s seen
            from A’s corner). Red curve: contract curve. Red ball: equilibrium. Small dots: plans at the current prices. Pale plane: the budget plane through
            the endowment (wire ball).
          </div>
        </div>
        <div>
          <div className="card">
            {[0, 1, 2].map((i) => (
              <Slider key={i} label={`${N.A}’s ${goods[i]}`} value={xA[i]} min={0.05} max={B.omega[i] - 0.05} step={0.01} onChange={(v) => set(i, v)} />
            ))}
            <Slider
              label="slide along the contract curve"
              value={sCC}
              min={0.02}
              max={0.98}
              step={0.005}
              onChange={(s) => {
                setSCC(s);
                setXA(contractPoint(B, s));
              }}
              fmt={(s) => `${Math.round(s * 100)}%`}
            />
            <div className="controls">
              <button onClick={() => setXA(eA)}>back to ω</button>
              <button className="primary" onClick={() => { setXA(eA); setP([1, 1, 1]); setRunning(true); }} disabled={running}>
                let prices adjust
              </button>
              <label className="check">
                <input type="checkbox" checked={show.surfaces} onChange={(e) => setShow({ ...show, surfaces: e.target.checked })} />
                surfaces
              </label>
              <label className="check">
                <input type="checkbox" checked={show.plane} onChange={(e) => setShow({ ...show, plane: e.target.checked })} />
                price plane
              </label>
            </div>
            <Slider
              label={`lump-sum chalk to ${N.A}`}
              value={eA[2] - E0[2]}
              min={-E0[2]}
              max={B.omega[2] - E0[2]}
              step={0.1}
              onChange={(v) => {
                const e: Vec3 = [E0[0], E0[1], E0[2] + v];
                setEA(e);
                setXA(e);
              }}
            />
            <Readouts
              rows={[
                ['angle between gradients', `${f2((angle * 180) / Math.PI, 2)}°`],
                [`${N.A}: MRS milk/Benz, chalk/Benz`, `${f2(mrs3(B.aA, xA, 0, 1), 3)}, ${f2(mrs3(B.aA, xA, 2, 1), 3)}`],
                [`${N.B}: MRS milk/Benz, chalk/Benz`, `${f2(mrs3(B.aB, xB, 0, 1), 3)}, ${f2(mrs3(B.aB, xB, 2, 1), 3)}`],
                ['prices (Benz = 1)', `${f2(p[0], 3)}, 1, ${f2(p[2], 3)}`],
                ['excess demand', plans.excess.map((v) => f2(v, 2)).join(', ')],
                ['equilibrium prices', `${f2(eq.relPrices[0], 3)}, 1, ${f2(eq.relPrices[2], 3)}`],
              ]}
            />
          </div>
          <div className="card" style={{ marginTop: 12 }}>
            <ViewTitle zoom="Society" name="the same allocation in utility space" />
            <Plot w={360} h={240} x={[0, uMaxA]} y={[0, uMaxB]} xLabel={`U of ${N.A}`} yLabel={`U of ${N.B}`}>
              <Curve pts={upf} stroke="var(--accent)" width={1.6} />
              <Dot x={u3(B.aA, eA)} y={u3(B.aB, [B.omega[0] - eA[0], B.omega[1] - eA[1], B.omega[2] - eA[2]])} hollow r={3.5} />
              <Dot x={u3(B.aA, xA)} y={u3(B.aB, xB)} r={4.5} />
              <Label x={upf[40][0]} y={upf[40][1]} dx={5} dy={-5} color="var(--accent)" size={12}>
                UPF
              </Label>
            </Plot>
          </div>
        </div>
      </div>
      <Lemma tag="Lemma">
        With n goods, an interior allocation is efficient iff <TeX>{'\\nabla U_A \\parallel \\nabla U_B'}</TeX>, i.e. every pair of goods has{' '}
        <TeX>{'MRS^A_{jk} = MRS^B_{jk}'}</TeX>: n − 1 conditions in n unknowns, leaving one degree of freedom. That is why the efficient set is still a{' '}
        <i>curve</i> however many goods there are: it is the price-plane picture of the second welfare theorem, one competitive equilibrium for each way of
        splitting the economy’s value between the two.
      </Lemma>
      <Lemma tag="Remark" quiet>
        Restricted to Cobb–Douglas preferences here (see DECISIONS.md), so that the contract curve has a closed form. More farmers do not fit in a box at all:
        that is <LabLink to="square">§3b</LabLink>.
      </Lemma>
    </div>
  );
}
