// main.js  ── swimmer demo ─────────────────────────────────────────────────
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader    } from 'three/examples/jsm/loaders/GLTFLoader.js';

const scene  = new THREE.Scene();
scene.background = new THREE.Color(0x202533);           // dark water-ish
const camera = new THREE.PerspectiveCamera(60, innerWidth/innerHeight, 0.1, 1000);
camera.position.set( 5, 2, 0 );                         // watch from the side

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enablePan   = false;
controls.enableZoom  = false;
controls.autoRotate  = true;                            // slowly circle the swimmer
controls.autoRotateSpeed = 0.5;

// ─── helpers for time + debug overlay ─────────────────────────────────────
const clock = new THREE.Clock();
let   skeletonHelper;       // so we can see the rig while tuning

// ─── bone references we'll animate every frame ────────────────────────────
let lArm,  rArm,
    lFore, rFore,
    lHand, rHand,
    lUpleg, rUpleg,
    lLeg,   rLeg,
    lFoot,  rFoot,
    lShoulder, rShoulder,
    lHip,     rHip,
    spine, spine1, spine2;
    

// ─── load the model ───────────────────────────────────────────────────────
new GLTFLoader().load('/Masculine_TPose.glb', (gltf) => {
  const model = gltf.scene;
  scene.add(model);

  // 1 / Roll the whole body forward so Z faces "down"
  //model.rotation.z =  Math.PI / 2;      // arms point forward
  model.rotation.x =  Math.PI / 2;      // face down
  model.position.y =  1;                // lift a bit above origin

  // 2 / Grab bones we care about
  model.traverse((o) => {
    if (!o.isSkinnedMesh) return;

    // tiny stick-figure overlay for visual debugging
    skeletonHelper = new THREE.SkeletonHelper(o);
    skeletonHelper.material.depthTest = false;
    skeletonHelper.material.opacity   = 0.4;
    skeletonHelper.material.transparent = true;
    scene.add(skeletonHelper);

    // convenient map for name-lookup
    const bone = {};
    o.skeleton.bones.forEach(b => bone[b.name.toLowerCase()] = b);

    // Arms
    lArm   = bone['leftarm'];
    rArm   = bone['rightarm'];
    lFore  = bone['leftforearm'];
    rFore  = bone['rightforearm'];
    lHand  = bone['lefthand'];
    rHand  = bone['righthand'];
    lShoulder = bone['leftshoulder'];
    rShoulder = bone['rightshoulder'];
    
    // Legs
    lUpleg = bone['leftupleg'];
    rUpleg = bone['rightupleg'];
    lLeg   = bone['leftleg'];
    rLeg   = bone['rightleg'];
    lFoot  = bone['leftfoot'];
    rFoot  = bone['rightfoot'];
    lHip   = bone['lefthip'];
    rHip   = bone['righthip'];
    
    // Spine for body roll
    spine  = bone['spine'];
    spine1 = bone['spine1'];
    spine2 = bone['spine2'];

    // quick sanity check
    console.table(Object.fromEntries(
      ['lArm','rArm','lFore','rFore','lHand','rHand','lUpleg','rUpleg','lLeg','rLeg', 'lFoot','rFoot', 'lShoulder', 'rShoulder', 'lHip', 'rHip', 'spine', 'spine1', 'spine2']
        .map(k => [k, !!eval(k)] )
    ));
  });
});

// ─── animation loop ───────────────────────────────────────────────────────
const SPEED = 1.5;          // global speed multiplier   (≤ 1 = slo-mo)
const LEG_AMPLITUDE  = Math.PI * 0.20;   // hip swing
const KNEE_BEND      = -Math.PI * 0.25;

// Arm animation constants
const ARM_STROKE_SPEED = 1.0;  // arm stroke frequency
const ARM_AMPLITUDE = Math.PI * 0.8;  // how far arms swing
const ELBOW_BEND_MAX = Math.PI * 0.6;  // maximum elbow bend

function animate() {
  requestAnimationFrame(animate);

  const t = clock.getElapsedTime() * SPEED;   // seconds * speed
  const legSwing = Math.sin(t*2) * LEG_AMPLITUDE;  // faster flutter kick

  // Arm stroke timing - arms are opposite to each other
  const leftArmPhase = t * ARM_STROKE_SPEED;
  const rightArmPhase = leftArmPhase + Math.PI;  // 180 degrees out of phase

  // ── ARM ANIMATION - Freestyle Swimming Stroke ──────────────────────────
  if (lArm && rArm && lFore && rFore) {
    // Left arm stroke cycle
    const leftArmCycle = Math.sin(leftArmPhase);
    const leftArmVertical = Math.cos(leftArmPhase);
    
    // Right arm stroke cycle  
    const rightArmCycle = Math.sin(rightArmPhase);
    const rightArmVertical = Math.cos(rightArmPhase);
    
    // For T-pose facing down:
    // - Y rotation moves arms forward/backward (swimming stroke)
    // - Z rotation moves arms up/down (recovery/catch)
    
    // Upper arm rotation (main stroke movement)
    // Y-axis: forward/backward stroke motion
    lArm.rotation.y = leftArmCycle * Math.PI * 0.6;     // forward stroke
    rArm.rotation.y = rightArmCycle * Math.PI * 0.6;   // forward stroke
    
    // Z-axis: up/down motion for recovery and entry
    lArm.rotation.z = leftArmVertical * Math.PI * 0.4;  // up for recovery
    rArm.rotation.z = -rightArmVertical * Math.PI * 0.4; // opposite direction
    
    // Shoulder adjustments
    if (lShoulder && rShoulder) {
      // Shoulders help with the stroke motion
      lShoulder.rotation.y = leftArmCycle * 0.3;
      rShoulder.rotation.y = rightArmCycle * 0.3;
      
      // Slight shoulder lift during recovery
      lShoulder.rotation.z = Math.max(0, leftArmVertical) * 0.2;
      rShoulder.rotation.z = Math.max(0, -rightArmVertical) * 0.2;
    }
    
    // Elbow bend - bend when pulling through water
    const leftElbowBend = Math.max(0, -leftArmCycle) * ELBOW_BEND_MAX;
    const rightElbowBend = Math.max(0, -rightArmCycle) * ELBOW_BEND_MAX;
    
    lFore.rotation.y = leftElbowBend;   // Y-axis bend for T-pose
    rFore.rotation.y = rightElbowBend;
    
    // Hand positioning - point hands down during pull phase
    if (lHand && rHand) {
      lHand.rotation.z = Math.max(0, -leftArmCycle) * Math.PI * 0.2;
      rHand.rotation.z = Math.max(0, -rightArmCycle) * Math.PI * 0.2;
    }
  }

  // ── BODY ROLL - swimmers roll their body side to side ─────────────────
  const bodyRoll = Math.sin(t * ARM_STROKE_SPEED * 0.5) * Math.PI * 0.08;
  if (spine) spine.rotation.y = bodyRoll * 0.3;   // Y-axis for side-to-side roll
  if (spine1) spine1.rotation.y = bodyRoll * 0.5;
  if (spine2) spine2.rotation.y = bodyRoll * 0.7;

  // ── LEG ANIMATION (existing) ───────────────────────────────────────────
  // ── hips (upper legs) flutter kick ─────────────────────────────────────
  if (lUpleg && rUpleg) {
    lUpleg.rotation.x =  legSwing - Math.PI / 10;
    rUpleg.rotation.x = -legSwing - Math.PI / 10;  // opposite phase
  }

  // ── knees bend slightly on the up-stroke ───────────────────────────────
  if (lLeg && rLeg) {
    lLeg.rotation.x =  Math.max(0, -Math.sin(t*2) ) * KNEE_BEND;
    rLeg.rotation.x =  Math.max(0,  Math.sin(t*2) ) * KNEE_BEND;
  }
  
  // ── feet: point forward when legs are up ───────────────────────────────
  if (lFoot && rFoot) {
    lFoot.rotation.x =  Math.max(0, -Math.sin(t*2) ) * +Math.PI / 4;
    rFoot.rotation.x =  Math.max(0,  Math.sin(t*2) ) * +Math.PI / 4;
  }

  controls.update();
  renderer.render(scene, camera);
}
animate();

// ─── keep full-screen ────────────────────────────────────────────────────
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});