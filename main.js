import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Water } from 'three/addons/objects/Water.js';
import { Sky } from 'three/addons/objects/Sky.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

let container, camera, scene, renderer, controls, water, sun;
const clock = new THREE.Clock();
let skeletonHelper, swimmerModel;



// Bone references
let lArm, rArm, lFore, rFore, lHand, rHand, lUpleg, rUpleg, lLeg, rLeg, lFoot, rFoot, lShoulder, rShoulder, spine, spine1, spine2, head;

// Bobbing constants
const BOBBING_SPEED = 1.1, BOBBING_AMPLITUDE_Y = 0.3, BOBBING_AMPLITUDE_X = 0.2, SWIM_SPEED = 1, SIDE_TO_SIDE_AMPLITUDE = 0.5;

// Initialize scene
init();

function init() {
	container = document.getElementById('container');

	// Renderer setup
	renderer = new THREE.WebGLRenderer({ antialias: true });
	renderer.setPixelRatio(window.devicePixelRatio);
	renderer.setSize(window.innerWidth, window.innerHeight);
	renderer.setAnimationLoop(animate);
	renderer.toneMapping = THREE.ACESFilmicToneMapping;
	renderer.toneMappingExposure = 0.5;
	container.appendChild(renderer.domElement);

	// Scene
	scene = new THREE.Scene();

	// Camera
	camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 1, 20000);
	camera.position.set(15, 10, 25);

	// Sun
	sun = new THREE.Vector3();

	// Water setup
	const waterGeometry = new THREE.PlaneGeometry(10000, 10000);
	water = new Water(waterGeometry, {
		textureWidth: 512,
		textureHeight: 512,
		waterNormals: new THREE.TextureLoader().load('https://threejs.org/examples/textures/waternormals.jpg', function (texture) {
			texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
		}),
		sunDirection: new THREE.Vector3(),
		sunColor: 0xffffff,
		waterColor: 0x001e0f,
		distortionScale: 3.7,
		fog: scene.fog !== undefined
	});
	water.rotation.x = -Math.PI / 2;
	scene.add(water);

	// Skybox setup
	const sky = new Sky();
	sky.scale.setScalar(10000);
	scene.add(sky);

	const skyUniforms = sky.material.uniforms;
	skyUniforms['turbidity'].value = 10;
	skyUniforms['rayleigh'].value = 2;
	skyUniforms['mieCoefficient'].value = 0.005;
	skyUniforms['mieDirectionalG'].value = 0.8;

	const parameters = { elevation: 3, azimuth: 180 };

	const pmremGenerator = new THREE.PMREMGenerator(renderer);
	let renderTarget;

	function updateSun() {
		const phi = THREE.MathUtils.degToRad(90 - parameters.elevation);
		const theta = THREE.MathUtils.degToRad(parameters.azimuth);
		sun.setFromSphericalCoords(1, phi, theta);

		sky.material.uniforms['sunPosition'].value.copy(sun);
		water.material.uniforms['sunDirection'].value.copy(sun).normalize();

		if (renderTarget !== undefined) renderTarget.dispose();
		renderTarget = pmremGenerator.fromScene(sky);
		scene.environment = renderTarget.texture;
	}
	updateSun();

	// Controls setup
	controls = new OrbitControls(camera, renderer.domElement);
	controls.maxPolarAngle = Math.PI * 0.55;
	controls.target.set(0, 5, 0);
	controls.minDistance = 10.0;
	controls.maxDistance = 100.0;
	controls.enablePan = false;
	controls.update();

	// Load swimmer model
	new GLTFLoader().load('Masculine_TPose.glb', (gltf) => {
		swimmerModel = gltf.scene;
		scene.add(swimmerModel);

		swimmerModel.rotation.x = Math.PI / 2;
		swimmerModel.position.y = 0.15;
		swimmerModel.scale.set(3, 3, 3);

		swimmerModel.traverse((o) => {
			if (!o.isSkinnedMesh) return;

			skeletonHelper = new THREE.SkeletonHelper(o);
			skeletonHelper.material.depthTest = false;
			skeletonHelper.visible = false;
			scene.add(skeletonHelper);

			const bone = {};
			o.skeleton.bones.forEach(b => {
				bone[b.name.replace('mixamorig', '').toLowerCase()] = b;
			});

			// Bone assignments
			lArm = bone['leftarm'];
			rArm = bone['rightarm'];
			lFore = bone['leftforearm'];
			rFore = bone['rightforearm'];
			lHand = bone['lefthand'];
			rHand = bone['righthand'];
			lShoulder = bone['leftshoulder'];
			rShoulder = bone['rightshoulder'];

			lUpleg = bone['leftupleg'];
			rUpleg = bone['rightupleg'];
			lLeg = bone['leftleg'];
			rLeg = bone['rightleg'];
			lFoot = bone['leftfoot'];
			rFoot = bone['rightfoot'];

			spine = bone['spine'];
			spine1 = bone['spine1'];
			spine2 = bone['spine2'];

			head = bone['head'];

			console.table(Object.fromEntries(
				['lArm', 'rArm', 'lFore', 'rFore', 'lHand', 'rHand', 'lUpleg', 'rUpleg', 'lLeg', 'rLeg', 'lFoot', 'rFoot', 'lShoulder', 'rShoulder', 'spine', 'spine1', 'spine2', 'head']
					.map(k => [k, !!eval(k)] )
			));
		});
	});

	// Event listener for resizing
	window.addEventListener('resize', onWindowResize);
}

function onWindowResize() {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize(window.innerWidth, window.innerHeight);
}

const SPEED = 2.9;
const LEG_AMPLITUDE = Math.PI * 0.20;
const KNEE_BEND = -Math.PI * 0.25;
const ARM_STROKE_SPEED = 1.0;
const ELBOW_BEND_MAX = Math.PI * 0.2;

function animate() {
	const t = clock.getElapsedTime() * SPEED;

	if (swimmerModel) {
		// Bobbing animations
		const bobbingY = Math.sin(t * BOBBING_SPEED) * BOBBING_AMPLITUDE_Y;
		const bobbingX = Math.sin(t * BOBBING_SPEED * 1) * BOBBING_AMPLITUDE_X;
		swimmerModel.position.x = bobbingX;
		swimmerModel.position.z += SWIM_SPEED * 0.016;
		const sideMotion = Math.sin(t * 0.5) * SIDE_TO_SIDE_AMPLITUDE;
		swimmerModel.position.x += sideMotion * 0.1;
	}

	if (lArm && rArm && lUpleg) {
		const legSwing = Math.sin(t * 2) * LEG_AMPLITUDE;
		const leftArmPhase = t * ARM_STROKE_SPEED;
		const rightArmPhase = leftArmPhase + Math.PI;

		const leftArmCycle = Math.sin(leftArmPhase);
		const leftArmVertical = Math.cos(leftArmPhase);
		const rightArmCycle = Math.sin(rightArmPhase);
		const rightArmVertical = Math.cos(rightArmPhase);
		
		lArm.rotation.x = leftArmCycle * Math.PI * 0.2;
		rArm.rotation.x = rightArmCycle * Math.PI * 0.2;
		lArm.rotation.z = leftArmVertical * Math.PI * 0.2;
		rArm.rotation.z = -rightArmVertical * Math.PI * 0.2;
		
		const leftElbowBend = Math.max(0, -leftArmCycle) * ELBOW_BEND_MAX * 1.8;
		const rightElbowBend = Math.max(0, -rightArmCycle) * ELBOW_BEND_MAX * 1.8;
		lFore.rotation.z = leftElbowBend;
		rFore.rotation.z = -rightElbowBend;

		// Body rotation
		const bodyRoll = -Math.sin(t * ARM_STROKE_SPEED) * Math.PI * 0.08;
		if (spine) spine.rotation.y = bodyRoll * 0.3;
		if (spine1) spine1.rotation.y = bodyRoll * 0.5;
		if (spine2) spine2.rotation.y = bodyRoll * 0.7;

		// Leg animation
		lUpleg.rotation.x = legSwing - Math.PI / 10;
		rUpleg.rotation.x = -legSwing - Math.PI / 10;
		lLeg.rotation.x = Math.max(0, -Math.sin(t * 2)) * KNEE_BEND;
		rLeg.rotation.x = Math.max(0, Math.sin(t * 2)) * KNEE_BEND;
		lFoot.rotation.x = Math.max(0, -Math.sin(t * 2)) * Math.PI / 4;
		rFoot.rotation.x = Math.max(0, Math.sin(t * 2)) * Math.PI / 4;

		// Head rotation
		if (head) {
			head.rotation.x = -Math.PI / 2.7;
			head.rotation.y = -bodyRoll * 5.2;
		}
	}

	// Update water
	water.material.uniforms['time'].value += 1.0 / 60.0;

	// Update controls
	controls.update();

	// Render the scene
	renderer.render(scene, camera);
}
